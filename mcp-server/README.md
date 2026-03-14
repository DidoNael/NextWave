# NextWave CRM — MCP Server

Servidor MCP (Model Context Protocol) standalone para o NextWave CRM.  
Permite que clientes MCP (Cursor, Claude Desktop, VS Code, etc.) interajam com os dados do CRM de forma segura e controlada.

---

## 📋 Índice

- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Instalação e Uso](#instalação-e-uso)
  - [Local (Desenvolvimento)](#local-desenvolvimento)
  - [Docker (Produção)](#docker-produção)
- [Configuração](#configuração)
- [Conectando um Cliente MCP](#conectando-um-cliente-mcp)
- [Tools Disponíveis](#tools-disponíveis)
- [Resources Disponíveis](#resources-disponíveis)
- [Troubleshooting](#troubleshooting)

---

## Arquitetura

O MCP Server é um **processo standalone** separado do Next.js, rodando em sua própria porta (padrão: `3001`).

```
┌───────────────────────────────────────────────────────────┐
│                         Docker Host                       │
│                                                           │
│   ┌──────────────────┐       ┌──────────────────┐         │
│   │  nextwave-crm    │       │  mcp-server      │         │
│   │  (Next.js :3000) │       │  (Express :3001)  │         │
│   └───────┬──────────┘       └───────┬──────────┘         │
│           │                          │                    │
│           └──────────┬───────────────┘                    │
│                      ▼                                    │
│              ┌──────────────┐                             │
│              │  crm-data    │                             │
│              │  (SQLite DB) │                             │
│              └──────────────┘                             │
└───────────────────────────────────────────────────────────┘
                       ▲
                       │ POST /mcp (Bearer token)
                       │
              ┌────────┴────────┐
              │  Cliente MCP    │
              │  (Cursor, etc)  │
              └─────────────────┘
```

- **Não interfere** no app principal — escala independentemente
- **Compartilha o banco SQLite** via volume Docker `crm-data`
- **Mudanças via MCP refletem diretamente no CRM** (e vice-versa)

---

## Segurança

O servidor implementa **5 camadas de segurança** em sequência. Cada request passa por todas as camadas antes de chegar ao MCP:

| Ordem | Camada | Descrição |
|-------|--------|-----------|
| 1 | **Request Logger** | Loga toda request com IP, path, status, duração (JSON estruturado) |
| 2 | **IP Whitelist** | Bloqueia IPs não autorizados (suporta CIDR, ex: `192.168.1.0/24`) |
| 3 | **Origin Validator** | Proteção contra DNS rebinding (valida header `Origin`) |
| 4 | **Rate Limiter** | Sliding window por IP (padrão: 100 req/60s) com headers `X-RateLimit-*` |
| 5 | **API Key** | `Authorization: Bearer <key>` obrigatório, comparação timing-safe |

Além disso:
- **Helmet**: headers HTTP de segurança (HSTS, X-Frame-Options, etc.)
- **Bind seguro**: `127.0.0.1` por padrão (apenas localhost aceita conexões)
- **Docker**: roda como usuário não-root (`mcpuser`)

---

## Instalação e Uso

### Local (Desenvolvimento)

```bash
# 1. Instalar dependências
cd mcp-server
npm install

# 2. Gerar Prisma Client
npm run db:generate

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com sua API key e IPs

# 4. Iniciar em modo dev (hot-reload)
npm run dev
```

O servidor inicia em `http://127.0.0.1:3001/mcp`.

### Docker (Produção)

O MCP Server está integrado ao `docker-compose.yml` do projeto. Para subir:

```bash
# 1. Configure as variáveis no .env da raiz do projeto:
#    MCP_API_KEY=sua-chave-forte-de-32-chars
#    MCP_ALLOWED_IPS=seu-ip-aqui
#    MCP_PORT=3001

# 2. Subir apenas o MCP Server
docker compose up -d mcp-server

# 3. Ou subir todos os serviços
docker compose up -d
```

**Diferenças Docker vs Local:**

| | Local (`npm run dev`) | Docker |
|---|---|---|
| Bind | `127.0.0.1` (só local) | `0.0.0.0` (rede, protegido por IP whitelist) |
| Banco | `file:../data/prod.db` | `file:/app/data/prod.db` (volume compartilhado) |
| Porta | 3001 no host direto | 3001 mapeada do container |
| Processo | Seu usuário do sistema | `mcpuser` (não-root) |
| Dependência | Manual | Aguarda CRM estar healthy |

---

## Configuração

Todas as opções são via variáveis de ambiente (arquivo `.env`):

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `MCP_PORT` | `3001` | Porta do servidor |
| `MCP_BIND_ADDRESS` | `127.0.0.1` | Interface de rede (`127.0.0.1` = local, `0.0.0.0` = todas) |
| `MCP_API_KEY` | *(obrigatório)* | Chave de autenticação para o header Bearer |
| `MCP_ALLOWED_IPS` | `127.0.0.1` | IPs autorizados, separados por vírgula |
| `MCP_ALLOWED_ORIGINS` | `*` | Origens permitidas (header Origin) |
| `MCP_RATE_LIMIT` | `100` | Máximo de requests por janela |
| `MCP_RATE_WINDOW` | `60` | Janela de rate limit em segundos |
| `MCP_LOG_LEVEL` | `info` | Nível de log: `debug`, `info`, `warn`, `error` |
| `DATABASE_URL` | `file:../data/prod.db` | Caminho do banco SQLite |

### Gerando uma API Key segura

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Exemplos de `MCP_ALLOWED_IPS`

```env
# Apenas localhost
MCP_ALLOWED_IPS=127.0.0.1

# Localhost + um IP específico
MCP_ALLOWED_IPS=127.0.0.1,203.0.113.50

# Localhost + toda a rede local
MCP_ALLOWED_IPS=127.0.0.1,192.168.1.0/24

# Múltiplas redes
MCP_ALLOWED_IPS=127.0.0.1,10.0.0.0/8,192.168.0.0/16

# Todos (⚠️ NÃO RECOMENDADO em produção)
MCP_ALLOWED_IPS=*
```

---

## Conectando um Cliente MCP

### Cursor / Claude Desktop

Adicione ao arquivo de configuração MCP do seu cliente (geralmente `mcp.json` ou nas configurações do editor):

```json
{
  "mcpServers": {
    "nextwave-crm": {
      "url": "http://SEU-IP:3001/mcp",
      "headers": {
        "Authorization": "Bearer SUA-API-KEY-AQUI"
      }
    }
  }
}
```

### Testando com curl

```bash
# Health check (sem auth)
curl http://127.0.0.1:3001/health

# Inicializar sessão MCP
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Authorization: Bearer SUA-API-KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "id": 1,
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0" }
    }
  }'
```

---

## Tools Disponíveis

### Clientes

| Tool | Descrição | Parâmetros principais |
|------|-----------|----------------------|
| `list_clients` | Lista com busca e paginação | `search`, `status`, `page`, `pageSize` |
| `get_client` | Detalhes + transações + serviços | `clientId` |
| `create_client` | Criar novo cliente | `name`, `email`, `phone`, `userId`, ... |
| `update_client` | Atualizar dados | `clientId`, campos a atualizar |

### Transações Financeiras

| Tool | Descrição | Parâmetros principais |
|------|-----------|----------------------|
| `list_transactions` | Lista com filtros | `type`, `status`, `startDate`, `endDate` |
| `create_transaction` | Criar receita/despesa | `description`, `amount`, `type`, `userId` |
| `update_transaction_status` | Alterar status | `transactionId`, `status` |

### Projetos e Tarefas (Kanban)

| Tool | Descrição | Parâmetros principais |
|------|-----------|----------------------|
| `list_projects` | Projetos com contagem de tarefas | `userId` |
| `get_project_board` | Quadro Kanban completo | `projectId` |
| `create_task` | Criar tarefa (auto-ordenação) | `columnId`, `title`, `priority` |
| `move_task` | Mover tarefa entre colunas | `taskId`, `targetColumnId` |

### Agenda

| Tool | Descrição | Parâmetros principais |
|------|-----------|----------------------|
| `list_events` | Eventos com filtros | `startDate`, `endDate`, `type`, `userId` |
| `create_event` | Criar evento | `title`, `startDate`, `type`, `userId` |

---

## Resources Disponíveis

| URI | Descrição |
|-----|-----------|
| `crm://dashboard/stats` | Total clientes, receita, despesa, lucro líquido, pendentes |
| `crm://dashboard/recent-activity` | Últimos 5 clientes, transações e eventos criados |
| `crm://system/config` | Branding, status da licença, módulos ativos |

---

## Troubleshooting

### "Variável de ambiente obrigatória não definida: MCP_API_KEY"
Configure `MCP_API_KEY` no arquivo `.env`. Veja [Gerando uma API Key](#gerando-uma-api-key-segura).

### "Acesso negado: seu IP não está autorizado" (403)
Seu IP não está em `MCP_ALLOWED_IPS`. Adicione-o ao `.env` e reinicie o servidor.

### "Rate limit excedido" (429)
Aguarde a janela de tempo expirar (padrão: 60s), ou aumente `MCP_RATE_LIMIT` no `.env`.

### "API Key inválida" (401)
Verifique se o header `Authorization: Bearer <key>` está correto e se a key no `.env` coincide.

### Docker: MCP Server não inicia
Verifique se o CRM está healthy primeiro — o MCP depende dele:
```bash
docker compose ps
docker compose logs mcp-server
```

### Sessão não encontrada (404)
A sessão expirou ou o servidor foi reiniciado. O cliente MCP deve iniciar uma nova sessão automaticamente.
