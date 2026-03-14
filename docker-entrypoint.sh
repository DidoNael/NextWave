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
npx prisma db push --accept-data-loss || ./node_modules/.bin/prisma db push --accept-data-loss || echo "⚠️ Aviso: Falha ao sincronizar DB, tentando iniciar assim mesmo..."
exec node server.js
