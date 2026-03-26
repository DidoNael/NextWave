#!/bin/sh
set -e

DB_FILE="/app/data/prod.db"

echo ""
echo "================================================"
echo "   NextWave CRM - Iniciando..."
echo "================================================"

# Sincronizar schema (garante que as tabelas existam)
echo ""
echo "[1/2] Sincronizando schema do banco de dados..."
DATABASE_URL="file:/app/data/prod.db" npx prisma db push --accept-data-loss --skip-generate

# Carregar configurações de runtime salvas pelo setup wizard
if [ -f /app/data/runtime.env ]; then
  echo "[*] Carregando runtime.env..."
  export $(grep -v '^#' /app/data/runtime.env | xargs)
fi

exec npm run start
