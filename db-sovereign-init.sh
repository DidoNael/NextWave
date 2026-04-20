#!/bin/bash
# NextWave CRM v3.0.2 - Gatilho de Inicialização Tardia
# Este script impede que o PostgreSQL ligue até que o Wizard envie a senha.

INIT_FILE="/var/shared/db_init_password.txt"

echo "===================================================="
echo "   NextWave CRM - Monitor de Inicialização Soberana  "
echo "===================================================="

if [ ! -f "$INIT_FILE" ]; then
    echo "[WAIT] Aguardando definição de senha via Wizard (Web)..."
    while [ ! -f "$INIT_FILE" ]; do
        sleep 2
    done
fi

# Ler a senha do arquivo gerado pelo Wizard
DB_PASSWORD=$(cat "$INIT_FILE")
export POSTGRES_PASSWORD="$DB_PASSWORD"

echo "[READY] Senha recebida via Wizard! Inicializando PostgreSQL..."

# Chamar o entrypoint original do Postgres com a SENHA SOBERANA
exec docker-entrypoint.sh postgres
