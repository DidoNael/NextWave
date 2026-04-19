# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/mcp-server

# Copia dependências — inclui devDependencies para ter o TypeScript
COPY package.json package-lock.json* ./
RUN npm ci

# Copia o schema Prisma do projeto pai
COPY ../prisma/schema.prisma /app/prisma/schema.prisma

# Gera Prisma Client
RUN npx prisma generate --schema=/app/prisma/schema.prisma

# Copia e compila o código
COPY tsconfig.json ./
COPY src/ ./src/
RUN ./node_modules/.bin/tsc && ls -la dist/

# ── Production stage ──
FROM node:20-alpine AS production

WORKDIR /app/mcp-server

# Reinstala somente dependências de produção
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copia build compilado
COPY --from=builder /app/mcp-server/dist ./dist

# Copia Prisma Client gerado
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/mcp-server/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/mcp-server/node_modules/@prisma ./node_modules/@prisma

# Segurança: Roda como usuário não-root
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S -u 1001 -G mcpuser mcpuser && \
    chown -R mcpuser:mcpuser /app

USER mcpuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
