# NextWave CRM

Sistema de CRM profissional desenvolvido com Next.js 14, Prisma e TypeScript.

## Requisitos

- Node.js 18+ (https://nodejs.org/en/download)
- npm (incluído com Node.js)

## Instalacao Rapida

```bash
# 1. Instalar dependencias
npm install

# 2. Gerar cliente do Prisma
npm run db:generate

# 3. Criar o banco de dados
npm run db:push

# 4. Popular com dados de exemplo
npm run db:seed

# 5. Iniciar o servidor
npm run dev
```

Acesse: http://localhost:3000

**Login de acesso:**
- Email: admin@nextwave.com
- Senha: admin123

## Tecnologias

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Estilizacao:** Tailwind CSS
- **UI Components:** Radix UI + CVA (similar ao shadcn/ui)
- **Banco de Dados:** SQLite (via Prisma ORM)
- **Autenticacao:** NextAuth v5
- **Graficos:** Recharts
- **Formularios:** React Hook Form + Zod
- **Tema:** next-themes (claro/escuro)
- **Notificacoes:** Sonner

## Modulos - Camada 1

| Modulo | Status | Funcionalidades |
|--------|--------|----------------|
| Dashboard | Completo | KPIs, graficos, top clientes, ultimas transacoes |
| Clientes | Completo | CRUD completo, busca, filtros por status |
| Financeiro | Completo | Receitas/despesas, filtros, resumo financeiro |
| Servicos | Completo | Orcamentos com status visual em cards |
| Relatorios | Completo | Graficos de barra, pizza, linha, exportacao |
| Agenda | Completo | Calendario interativo, CRUD de eventos |
| Configuracoes | Completo | Tema claro/escuro, perfil, notificacoes |

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/login/       # Pagina de login
│   ├── (dashboard)/        # Layout e paginas autenticadas
│   │   ├── page.tsx        # Dashboard principal
│   │   ├── clientes/
│   │   ├── financeiro/
│   │   ├── servicos/
│   │   ├── relatorios/
│   │   ├── agenda/
│   │   └── configuracoes/
│   └── api/                # API Routes
├── components/
│   ├── ui/                 # Componentes base
│   ├── layout/             # Sidebar, Header
│   ├── dashboard/          # KPICard, GrowthChart
│   └── providers/          # Theme, Session
├── lib/
│   ├── db.ts               # Prisma client
│   ├── utils.ts            # Utilitarios
│   └── auth.ts             # NextAuth config
└── types/                  # TypeScript types
```

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

## 🏗️ Arquitetura e Portabilidade (ARM64)

Este projeto foi projetado para ser adaptável a múltiplas arquiteturas, incluindo **x86_64** e **ARM64** (Apple Silicon, Raspberry Pi, AWS Graviton).

### Considerações de Deploy:
- **Docker Multi-Arch**: O `Dockerfile` utiliza `node:alpine` para manter a leveza e compatibilidade. Para gerar imagens multi-arquitetura, utilize o Docker Buildx:
  ```bash
  docker buildx build --platform linux/amd64,linux/arm64 -t nextwave-crm:latest --push .
  ```
- **Prisma Client**: O `schema.prisma` já inclui `binaryTargets` para `linux-musl` e `linux-musl-arm64`, garantindo que o motor de consulta funcione corretamente dentro de containers Alpine em qualquer arquitetura.
- **Dependências Nativas**: Priorizamos versões em JavaScript puro (como `bcryptjs`) para evitar problemas de compilação cruzada durante a instalação automática de dependências.

## Proximas Funcionalidades (Camada 2 e 3)

- Gerador de NFe
- Kanban de projetos
- Integracao com Pix
- Cobranca recorrente
- Integracao WhatsApp Business
- Exportacao PDF/Excel
- Controle multiusuario
