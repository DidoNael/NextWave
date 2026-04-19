#!/bin/bash
set -e

echo "======================================================="
echo "   NextWave CRM - Script de Recuperação Total"
echo "======================================================="

# 1. Limpeza de conflitos antiga
echo "[1/4] Limpando infraestrutura antiga..."
docker compose -f docker-compose.yml -f docker-compose.traefik.yml down --remove-orphans || true
docker network rm nextwave_network 2>/dev/null || true
docker volume create crm-data 2>/dev/null || true

# 2. Inicia Infra Base
echo "[2/4] Iniciando Banco de Dados e API..."
docker compose up -d postgres evolution-api
echo "Aguardando banco ficar pronto..."
sleep 5

# 3. Executa o Deploy Blue-Green
echo "[3/4] Iniciando Deploy Blue-Green..."
chmod +x deploy-bluegreen.sh
./deploy-bluegreen.sh

# 4. Restauração e Força Setup (Opcional se necessário)
echo "[4/4] Verificando estado do banco..."
# Se o banco estiver vazio, podemos rodar a restauração aqui futuramente.
# Por enquanto vamos apenas garantir que o CRM reconheça o banco.
docker exec -i nextwave-crm-blue npx prisma db push || docker exec -i nextwave-crm-green npx prisma db push

echo "======================================================="
echo "   SUCESSO! Tente acessar seu CRM na porta 3010."
echo "======================================================="
