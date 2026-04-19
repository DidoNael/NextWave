# NextWave CRM — Correções e Melhorias aplicadas sobre v2.0.6

> Fork: https://github.com/juniorcmattos/NextWave-2-0
> Base: [DidoNael/NextWave @ v2.0.6](https://github.com/DidoNael/NextWave/releases/tag/v2.0.6) (commit `da8de23`)
> Stack: Next.js 14.2.15 · React 18 · TypeScript strict · NextAuth v5 beta · Prisma 5 · PostgreSQL

---

## Sumário

1. [Bugs críticos corrigidos](#-bugs-críticos-corrigidos)
2. [Melhorias de segurança e performance](#-melhorias-de-segurança-e-performance)
3. [Novo layout UI/UX](#-novo-layout-uiux)
4. [Páginas criadas](#-páginas-criadas)
5. [Redesign do login](#-redesign-do-login)

---

## 🔴 Bugs críticos corrigidos

### 1. Build completamente quebrado — ThemeProvider

**Arquivo:** `src/components/providers/ThemeProvider.tsx`

**Erro:** O import apontava para um caminho interno que não existe na versão instalada do pacote `next-themes` v0.3.x:
```ts
import { type ThemeProviderProps } from "next-themes/dist/types"; // ❌
```

**Impacto:** `npm run build` falhava com erro de módulo. Como o ThemeProvider está no root layout, **nenhuma página do sistema conseguia renderizar**.

**Correção:**
```diff
- import { type ThemeProviderProps } from "next-themes/dist/types";
+ import { type ThemeProviderProps } from "next-themes";
```

---

### 2. Crash SSR em todas as páginas autenticadas — JsSIP

**Arquivos:** `src/lib/sip-client.ts` + `src/app/layout.tsx`

**Erro:** JsSIP é uma biblioteca browser-only (usa `window`, `RTCPeerConnection`, `WebSocket`). O `sip-client.ts` instanciava a classe no nível do módulo e o `Softphone` era importado estaticamente no layout autenticado:
```ts
import JsSIP from "jssip";
const sipClient = new SipClient(); // ❌ executa no servidor durante SSR
```

**Impacto:** `ReferenceError: window is not defined` → crash em toda rota autenticada.

**Correção em `sip-client.ts`** — guard de ambiente:
```ts
export const sipClient =
  typeof window !== "undefined"
    ? new SipClient()
    : (null as unknown as SipClient);
```

**Correção em `layout.tsx`** — import dinâmico com SSR desabilitado:
```tsx
import nextDynamic from "next/dynamic";
const Softphone = nextDynamic(
  () => import("@/components/pbx/softphone").then((m) => ({ default: m.Softphone })),
  { ssr: false }
);
```

---

### 3. Vulnerabilidade crítica — Injeção de comando shell (RCE)

**Arquivo:** `src/app/api/sistema/atualizar/route.ts`

**Erro:** O parâmetro `version` vindo do body era interpolado diretamente em comando shell via `exec()`:
```ts
exec(`git checkout v${version}`, { cwd: "/app" }) // ❌ shell injection
```

**Impacto:** Admin podia enviar `version: "main; rm -rf /app"` e executar **comandos arbitrários no servidor** (Remote Code Execution).

**Correção:**
```ts
// Validação rígida antes de uso
const versionRegex = /^\d+\.\d+\.\d+$/;
const cleanVersion = (version ?? "").replace(/^v/, "");
if (!versionRegex.test(cleanVersion)) {
  return NextResponse.json({ error: "Versão inválida." }, { status: 400 });
}
// execFile não invoca shell — argumentos vão direto ao processo
await execFilePromise("git", ["checkout", `v${cleanVersion}`], {
  cwd: process.cwd() // funciona fora do Docker
});
```

---

### 4. Bundling incorreto do Prisma — next.config.js

**Arquivo:** `next.config.js`

**Erro:** `serverComponentsExternalPackages` foi removida do bloco `experimental` no Next.js 14.1+:
```js
experimental: {
  serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"], // ❌ ignorada
}
```

**Impacto:** Prisma era bundlado pelo webpack → falha ao resolver binário nativo `.node` em produção.

**Correção:**
```diff
- experimental: { serverComponentsExternalPackages: [...] }
+ serverExternalPackages: ["@prisma/client", "bcryptjs"]
```

---

### 5. Redirect loop pós-login — page.tsx

**Arquivo:** `src/app/page.tsx`

**Erro:** Após login, o root page redirecionava para `/${orgSlug}` (ex.: `/default`) mas **nenhuma rota sob `[orgSlug]` existia** no v2.0.6 — resultava em 404 infinito.

**Correção:** Redirect direto para `/dashboard`:
```diff
- const orgSlug = (session.user as any).orgSlug || "default";
- redirect(`/${orgSlug}`);
+ redirect(`/dashboard`);
```

---

## 🟡 Melhorias de segurança e performance

### 6. SessionSecurityProvider não montado + polling excessivo

**Arquivos:** `src/app/layout.tsx` + `src/components/auth/SessionSecurityProvider.tsx`

**Problema A:** O provider de segurança (logout automático, detecção de IP) **nunca foi montado** no layout — toda segurança de sessão estava inativa.

**Problema B:** Intervalo de verificação de 3 segundos → ~20 queries DB/min por usuário. Com 50 usuários = 1.000 queries/min só para validar sessão.

**Correção — montar em `layout.tsx`:**
```tsx
<SessionProvider>
  <SessionSecurityProvider>  {/* ← adicionado */}
    <ThemeProvider>{children}</ThemeProvider>
  </SessionSecurityProvider>
</SessionProvider>
```

**Correção — intervalo razoável:**
```diff
- const CHECK_INTERVAL = 3 * 1000;
+ const CHECK_INTERVAL = 60 * 1000; // 1 query/min por usuário
```

---

### 7. Conflito de nome — `dynamic`

**Arquivo:** `src/app/layout.tsx`

**Erro:** `import dynamic from "next/dynamic"` colidia com `export const dynamic = "force-dynamic"` do segment config.

**Correção:**
```diff
- import dynamic from "next/dynamic";
+ import nextDynamic from "next/dynamic";
```

---

### 8. Imports não usados — Softphone

**Arquivo:** `src/components/pbx/softphone.tsx`

Removidos `ChevronUp` e `Globe` do lucide-react (não utilizados).

---

## 🎨 Novo layout UI/UX

Aplicado o sistema de design do Myco CRM adaptado para as cores existentes do NextWave (via CSS variables do shadcn/ui). **Nenhum dado pessoal, token, chave ou credencial foi exposto** — apenas padrões estruturais de UX.

### Sidebar reescrita
- Logo NextWave CRM Pro no topo
- Navegação principal com indicador ativo animado
- Sub-itens expansíveis (Dashboard: Financeiro, Clientes, WhatsApp)
- Seção "Configurações" separada
- **Card do usuário no rodapé** com avatar, nome, e-mail e DropdownMenu (perfil + sair)
- Totalmente responsiva (drawer em mobile)

### Header reescrito
- Search input arredondado `bg-muted/50`
- Sino de notificações com badge contador, popover listando:
  - Contas a vencer (financeiro)
  - Eventos próximos (agenda)
  - Botão de limpar lidas
- Toggle de tema claro/escuro
- Avatar do usuário com dropdown
- Time relativo em notificações (há 5min, há 2h, ontem)

---

## 📄 Páginas criadas

Todas as páginas usam exclusivamente CSS variables (`bg-background`, `text-foreground`, `text-primary`, `bg-muted`, `border-border`, etc.) — **zero cores hardcoded** — garantindo compatibilidade com tema claro/escuro e a paleta existente do Dido.

| Rota | Descrição |
|---|---|
| `/dashboard` | Dashboard principal com KPIs, últimas transações e próximos eventos |
| `/dashboard/clientes` | CRUD completo de clientes com avatar, contato, empresa, city/state, status |
| `/dashboard/usuarios` | Gestão de usuários com role (master/admin/user), horário de trabalho, IPs permitidos |
| `/dashboard/financeiro` | Transações com 4 KPIs (receitas/despesas/a receber/saldo), navegador mensal, filtros |
| `/dashboard/agenda` | Calendário mensal com eventos coloridos por tipo, painel "Próximos Eventos" |
| `/dashboard/projetos/kanban` | Kanban drag-less com colunas, tarefas, movimentação via dropdown |
| `/dashboard/relatorios` | 4 KPIs + tabs com recharts (Receita Mensal, Por Categoria, Fluxo) |

### Rota catch-all

`/dashboard/[...slug]/page.tsx` captura todas as rotas ainda não implementadas (Aparência, MCP Server, NFS-e, etc.) e exibe um placeholder elegante com nome e descrição da seção em desenvolvimento — **nenhum link da sidebar quebra mais com 404**.

---

## 🔐 Redesign do login

Novo layout split-screen com:
- **Painel esquerdo (lg+):** `bg-background` escuro, glow animado `bg-primary/5 blur-3xl`, logo com ícone em SVG preenchendo `text-primary`, título "NextWave CRM", subtítulo "Gestão inteligente para o seu negócio", e 3 bullets com checkmarks (Segurança enterprise · Automação WhatsApp · Relatórios em tempo real)
- **Painel direito:** card centralizado (max-w-[420px]) com logo compacto, título step-aware ("Bem-vindo de volta" ou "Verificação 2FA"), inputs `bg-muted border-border rounded-xl`, botão primário `bg-primary text-primary-foreground`

**Lógica de autenticação preservada byte-a-byte** — mesma implementação de pre-login, 2FA TOTP, trusted device, e `signIn("credentials")`. Apenas mudanças visuais.

---

## Verificação

1. `npm run build` — compila sem erros
2. `npm run dev` — todas as páginas autenticadas carregam sem crash SSR
3. `/api/sistema/atualizar` com versão inválida → retorna HTTP 400
4. DevTools → Network → `/api/auth/session` chamado apenas 1×/minuto (antes: 20×/min)
5. Qualquer link da sidebar carrega sem 404

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/providers/ThemeProvider.tsx` | Fix import next-themes |
| `src/lib/sip-client.ts` | Guard `typeof window` |
| `src/components/pbx/softphone.tsx` | Remove imports não usados |
| `src/app/api/sistema/atualizar/route.ts` | Regex validation + execFile + process.cwd() |
| `next.config.js` | serverExternalPackages fora de experimental |
| `src/app/layout.tsx` | Monta SessionSecurityProvider + rename dynamic→nextDynamic |
| `src/components/auth/SessionSecurityProvider.tsx` | CHECK_INTERVAL: 3s → 60s |
| `src/app/page.tsx` | Redirect direto para /dashboard |
| `src/components/layout/Sidebar.tsx` | Reescrita com UX Myco (CSS variables) |
| `src/components/layout/Header.tsx` | Reescrita com notificações polidas |
| `src/components/auth/login-form.tsx` | Redesign split-screen |
| `src/app/(dashboard)/layout.tsx` | Shell Sidebar + Header |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard principal |
| `src/app/(dashboard)/dashboard/clientes/page.tsx` | CRUD de clientes |
| `src/app/(dashboard)/dashboard/usuarios/page.tsx` | Gestão de usuários |
| `src/app/(dashboard)/dashboard/financeiro/page.tsx` | Transações financeiras |
| `src/app/(dashboard)/dashboard/agenda/page.tsx` | Calendário de eventos |
| `src/app/(dashboard)/dashboard/projetos/kanban/page.tsx` | Kanban board |
| `src/app/(dashboard)/dashboard/relatorios/page.tsx` | Relatórios com recharts |
| `src/app/(dashboard)/dashboard/[...slug]/page.tsx` | Catch-all placeholder |

---

_Documentação gerada em 2026-04-19._
