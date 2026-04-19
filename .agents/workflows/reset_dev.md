---
description: Limpeza e reinício do ambiente de desenvolvimento
---
Este fluxo de trabalho automatiza a limpeza do cache e o reinício do seu servidor Next.js sem precisar de confirmações manuais, graças à flag `// turbo-all`.

// turbo-all

1. **Liberar a porta 3000** (evita o problema do servidor iniciar na porta 3001)
`Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue`

2. **Limpar o cache do Next.js** (previne erros de tela branca e falhas de compilação antigas)
`Remove-Item -Path .next, .next_docker -Recurse -Force -ErrorAction SilentlyContinue`

3. **Atualizar o esquema do Prisma** (garante que o banco de dados está sincronizado)
`npx prisma db push`

4. **Instalar dependências faltantes** (apenas para garantir)
`npm install`

5. **Iniciar o servidor de desenvolvimento**
`npm run dev`
