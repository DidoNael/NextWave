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
npx prisma db push --accept-data-loss --skip-generate

# Carregar configurações de runtime salvas pelo setup wizard
if [ -f /app/data/runtime.env ]; then
  echo "[*] Carregando runtime.env..."
  export $(grep -v '^#' /app/data/runtime.env | xargs)
  # Versões antigas gravavam NEXTAUTH_URL/NEXT_PUBLIC_APP_URL no runtime.env,
  # causando redirect para o IP interno mesmo ao acessar pelo IP público.
  # AUTH_TRUST_HOST=true detecta o host correto pela request — sem hardcode de URL.
  unset NEXTAUTH_URL
  unset NEXT_PUBLIC_APP_URL
fi

exec npm run start
