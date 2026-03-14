# Guia de Instalação em ARM64 (Linux/Docker/Apple Silicon)

Este guia detalha os passos necessários para instalar e rodar o **NextWave CRM** em arquiteturas ARM64, com foco na configuração correta do Prisma.

## 1. Requisitos de Sistema
- **Node.js**: v18.x ou v20.x (Recomendado)
- **Git**: Para clonar o projeto
- **SQLite**: (Embutido no projeto)

## 2. Preparação do Prisma para ARM64
O Prisma utiliza motores nativos (Query Engines). Para garantir que ele funcione em ARM64, o arquivo `prisma/schema.prisma` deve estar configurado assim:

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x", "linux-arm64-openssl-3.0.x"]
}
```

## 3. Passo a Passo de Instalação

### Passo 1: Clonar o Repositório
```bash
git clone https://github.com/DidoNael/NextWave.git
cd NextWave
```

### Passo 2: Instalar Dependências
No ARM64, o npm irá baixar os binários corretos automaticamente se o `schema.prisma` estiver configurado como no Passo 2.
```bash
npm install
```

### Passo 3: Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="gerar-uma-chave-aleatoria-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

### Passo 4: Sincronizar Banco de Dados (Prisma)
Este é o passo crítico onde o Prisma gera o cliente específico para sua arquitetura:
```bash
# Sincroniza o esquema com o arquivo SQLite
npx prisma db push

# Gera o Prisma Client para ARM64
npx prisma generate
```

### Passo 5: Iniciar o Sistema
```bash
# Para desenvolvimento
npm run dev

# Para produção
npm run build
npm start
```

## 4. Solução de Problemas (ARM64)

- **Erro de motor do Prisma (Engine not found)**: Se você encontrar erros dizendo que o binário do Prisma não foi encontrado, execute `npx prisma generate` novamente. Isso forçará o download do motor correto para o seu hardware.
- **Docker**: Se for criar uma imagem Docker, use `node:20-alpine` ou `node:20-slim`, que possuem excelente suporte para ARM64.

### Passo Alternativo: Deploy em Um Clique
Para facilitar ainda mais, use o script de automação:
```bash
chmod +x deploy.sh
./deploy.sh
```

> [!IMPORTANT]
> **Acesso Remoto**: Se você estiver acessando o sistema por um IP externo (não localhost), você **precisa** editar seu arquivo `.env` e alterar a variável `NEXTAUTH_URL` para o IP do seu servidor (ex: `NEXTAUTH_URL=http://192.168.1.50:3000`). Se não fizer isso, o sistema redirecionará para `localhost` após o login.

---
## 5. Instalação via Docker (Recomendado para Produção)

O Docker é a forma mais segura e estável de rodar o NextWave em servidores ARM64, pois ele isola todas as dependências do sistema operacional.

### Passo 1: Construir a Imagem
```bash
docker compose build
```

### Passo 2: Iniciar o Container
```bash
docker compose up -d
```

O sistema estará disponível em `http://localhost:3000`. O banco de dados SQLite será persistido no volume `crm-data`.

### Como Zerar o Banco de Dados (Docker)
Para limpar todos os dados do CRM e manter apenas o usuário administrador:

```bash
chmod +x reset-db.sh
./reset-db.sh
```

---
## Host vs Docker: Qual usar?

| Característica | Rodar no Host (npm run dev) | Rodar no Docker (Compose) |
| :--- | :--- | :--- |
| **Uso Ideal** | Desenvolvimento e testes rápidos | Produção e Servidores (24/7) |
| **Performance** | Nativa (mais rápida para código) | Pequeno overhead de rede/disco |
| **Isolação** | Nenhuma (usa o Node do seu PC) | Total (não polui seu sistema) |
| **Atualização** | `git pull` + `npm install` | `docker compose pull/build` |

**Recomendação**: Mantenha as duas formas. Use o **Host** para fazer alterações e testar rápido, e o **Docker** para colocar o sistema "no ar" de forma profissional.

---
*Documentação atualizada em 14/03/2026*
