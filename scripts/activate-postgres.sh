#!/bin/bash
# ==============================================================================
# NextWave CRM - Script de Ativação PostgreSQL (Produção)
# Rode este script no host real (docerkweb) para estabilizar o sistema.
# ==============================================================================

echo "🚀 Iniciando ativação definitiva do PostgreSQL..."

# 1. Limpeza Crítica de Containers Legados
echo "[1/4] Removendo containers antigos e em conflito..."
docker stop $(docker ps -aq --filter name=nextwave) 2>/dev/null
docker rm -f $(docker ps -aq --filter name=nextwave) 2>/dev/null

# 2. Saneamento do .env de Produção
echo "[2/4] Configurando DATABASE_URL para PostgreSQL..."
# Remove espaços, aspas e garante o protocolo postgresql
sed -i 's/DATABASE_URL= /DATABASE_URL=/g' .env
sed -i 's/"//g' .env
# Apontamos para o container nextwave-db que já está rodando
sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://root:SUA_SENHA_AQUI@nextwave-db:5432/nextwave_crm?schema=public|g' .env

# 3. Atualizar Código (Purga do SQLite)
echo "[3/4] Atualizando código e removendo lógicas obsoletas..."
git pull origin main

# 4. Redeploy Profissional
echo "[4/4] Iniciando deploy em PostgreSQL..."
./deploy-bluegreen.sh

echo ""
echo "✅ Padronização Concluída!"
echo "Aguarde 10 segundos e verifique o status com: docker ps"
echo "O CRM deve estar Up (healthy) na porta 3010."
echo "=============================================================================="
