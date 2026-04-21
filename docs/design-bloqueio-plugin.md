# Design: Cadeia de Bloqueio Automático — Netstream Topology

**Data:** 2026-04-20  
**Status:** Aprovado — aguardando implementação

---

## Contexto

O NextWave CRM é o centro de controle de serviços de consultoria de redes da Netstream. O plugin **Netstream Topology** é vendido separadamente da consultoria e instalado no Grafana do cliente para gerenciamento e monitoramento da rede. Quando um cliente fica inadimplente, o acesso ao plugin deve ser suspenso/bloqueado automaticamente para criar pressão real de pagamento.

---

## Resumo da Solução

Sistema híbrido de bloqueio: o CRM altera o status da licença proativamente (via cron diário + ação manual), e o plugin revalida periodicamente (a cada 15 min) para refletir o novo estado.

---

## Fluxo da Cadeia

```
Cron diário detecta fatura pendente vencida
  │
  ├─ D + (graceDays - 2) → Envia WhatsApp de aviso ao cliente
  ├─ D + graceDays       → PluginLicense.status = "suspended"
  │                         Plugin exibe tela de bloqueio em até 15 min
  └─ D + graceDays + 5   → PluginLicense.status = "blocked"
                            Bloqueio permanente (requer ação manual para reativar)

Pagamento via gateway
  └─ Webhook detecta transaction.status = "pago"
       → status = "active", overdueDetectedAt = null, lastWarningAt = null

Pagamento manual (depósito/dinheiro)
  └─ Admin clica "Reativar" no CRM
       → status = "active", overdueDetectedAt = null, lastWarningAt = null

Admin pode a qualquer momento:
  → "Suspender" → status = "suspended"
  → "Bloquear"  → status = "blocked"
  → "Reativar"  → status = "active"
```

---

## Modelo de Dados

### Alterações em `PluginLicense`

```prisma
model PluginLicense {
  // ... campos existentes sem alteração ...

  graceDays         Int       @default(10)  // carência configurável por licença
  overdueDetectedAt DateTime?              // âncora para cálculo dos estágios
  lastWarningAt     DateTime?              // controle de reenvio do aviso WhatsApp
}
```

### Alteração em `Service`

Nenhuma migration necessária — usar o campo `category` já existente com o valor padronizado `"plugin-grafana"`.

---

## Componentes a Implementar

### 1. API: `/api/cron/license-check` (POST)

Protegida por secret header (`x-cron-secret`).

**Algoritmo:**
```typescript
// Para cada PluginLicense com status "active" ou "suspended"
// vinculada a um Service com category "plugin-grafana":

const overdueTransaction = await prisma.transaction.findFirst({
  where: {
    OR: [{ clientId: license.clientId }, { serviceId: license.serviceId }],
    type: "receita",
    status: "pendente",
    dueDate: { lt: new Date() }
  },
  orderBy: { dueDate: "asc" }
});

if (!overdueTransaction) {
  // Cliente em dia → limpa estado
  await prisma.pluginLicense.update({
    where: { id: license.id },
    data: { overdueDetectedAt: null, lastWarningAt: null, status: "active" }
  });
  continue;
}

// Registra o início do atraso se ainda não foi registrado
if (!license.overdueDetectedAt) {
  await prisma.pluginLicense.update({
    where: { id: license.id },
    data: { overdueDetectedAt: new Date() }
  });
  continue; // processa no próximo ciclo
}

const dias = Math.floor((Date.now() - license.overdueDetectedAt.getTime()) / 86400000);
const grace = license.graceDays;

if (dias >= grace + 5) {
  // Bloqueio definitivo
  await prisma.pluginLicense.update({
    where: { id: license.id },
    data: { status: "blocked" }
  });
} else if (dias >= grace) {
  // Suspensão
  await prisma.pluginLicense.update({
    where: { id: license.id },
    data: { status: "suspended" }
  });
} else if (dias >= grace - 2) {
  // Aviso WhatsApp (uma vez por período)
  const jaAvisou = license.lastWarningAt &&
    (Date.now() - license.lastWarningAt.getTime()) < 86400000 * (grace - 2);
  
  if (!jaAvisou) {
    await sendWhatsAppWarning(license); // usa WhatsApp já integrado no CRM
    await prisma.pluginLicense.update({
      where: { id: license.id },
      data: { lastWarningAt: new Date() }
    });
  }
}
```

### 2. ScheduledTask

```json
{
  "name": "License Check Diário",
  "type": "license-check",
  "cron": "0 8 * * *",
  "status": "active"
}
```

Roda todo dia às 08:00.

### 3. Plugin: Revalidação Periódica

Adicionar ao `LicenseGate.tsx`:

```typescript
// Revalidação completa a cada 15 minutos (além do ping de 5 min)
useEffect(() => {
  if (screen !== 'ok') return;
  const config = loadConfig();
  if (!config) return;

  const interval = setInterval(() => {
    validate(config);
  }, 15 * 60 * 1000);

  return () => clearInterval(interval);
}, [screen]);
```

### 4. UI no CRM

#### Modal do Serviço — Formulário

- Campo `category` com opção `"plugin-grafana"` (label: "Plugin Grafana")
- Quando selecionado, exibe seção de licença com campo `graceDays` e checkbox "Gerar licença ao ativar"

#### Modal do Serviço — Aba Licença

- Status badge (`success` / `warning` / `destructive`)
- Campos exibidos: `overdueDetectedAt`, `lastWarningAt`, `graceDays`
- Botões contextuais:
  - status `active` → `[Suspender]` `[Bloquear]`
  - status `suspended` ou `blocked` → `[Reativar]`

#### Listagem de Serviços do Cliente

- Badge `🔌 Plugin Grafana` em serviços com `category = "plugin-grafana"`
- Coluna extra: status da licença + dias inadimplente

#### Listagem `/plugin-licenses`

- Coluna "Inadimplente há X dias" calculada a partir de `overdueDetectedAt`
- Filtro por status: `todos / ativo / suspenso / bloqueado`

#### Dashboard (KPI)

- Card com contagem de licenças suspensas e bloqueadas
- Clique navega para `/plugin-licenses?filter=suspenso`

---

## Decision Log

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| 1 | `graceDays` por licença | Global único, tabela separada | Flexibilidade por cliente sem complexidade extra |
| 2 | Cron diário + override manual | Só manual, event-driven | Event-driven exige fila; cron cobre o ciclo de cobrança |
| 3 | Revalidação plugin fixo 15 min | Configurável via painel Grafana | YAGNI — intervalo fixo evita erro de configuração |
| 4 | WhatsApp em D+carência-2 | Sem aviso, e-mail | WhatsApp já integrado; reduz churn por esquecimento |
| 5 | Reativação mista (gateway + manual) | Só manual, só automática | Cobre os dois cenários reais de pagamento |
| 6 | 3 campos no `PluginLicense` | Tabela `PluginLicenseEvent` | Mínimo necessário; auditoria pode ser adicionada depois |
| 7 | `category = "plugin-grafana"` no `Service` | Nova entidade `PluginService` | Reutiliza modelo existente, sem migration pesada |

---

## Suposições Documentadas

- Gateway de pagamento já integrado (ou será integrado) para reativação automática
- WhatsApp já configurado no CRM com instância ativa
- O `ScheduledTask` existente tem um executor que chama a API route via HTTP
- Escopo atual: somente Netstream Topology — outros plugins (Onion, Zdude) podem ser incorporados depois seguindo o mesmo padrão

---

## Não-Goals (desta fase)

- Bloquear outros sistemas (PnetLab, oxidized, Telegram Bot)
- Auditoria detalhada de eventos de licença
- Intervalo de revalidação configurável por cliente no Grafana
