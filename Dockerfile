FROM node:20-alpine

# Instalar dependências de sistema necessárias para build e runtime
RUN apk add --no-cache libc6-compat openssl git openssh

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar TODAS as dependências (incluindo devDependencies para permitir 'next build' runtime)
RUN npm ci --no-audit && npm cache clean --force

# Copiar restante do código
COPY . .

# Gerar Prisma e fazer build inicial para popular os volumes anônimos depois
RUN npm run db:generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Garantir permissão de execução
RUN chmod +x docker-entrypoint.sh
RUN chmod +x -R ./node_modules/.bin || true

# Permitir ao git operar no bind mount sem conflito de permissões de dono (Evita erro: not a git repository)
RUN git config --global --add safe.directory '*'

# Criar pasta pro SQLite
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
