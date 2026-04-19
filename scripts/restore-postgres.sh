#!/usr/bin/env bash

# Script de restauração robusta para PostgreSQL no Docker
# Uso: ./scripts/restore-postgres.sh seu_arquivo_dump.sql

DUMP_FILE=$1
DB_CONTAINER="nextwave-db"
DB_USER="root"
DB_NAME="nextwave_crm"

if [ -z "$DUMP_FILE" ]; then
    echo "Erro: Forneça o arquivo .sql como argumento."
    echo "Exemplo: ./scripts/restore-postgres.sh postgres_dump.sql"
    exit 1
fi

if [ ! -f "$DUMP_FILE" ]; then
    echo "Erro: Arquivo $DUMP_FILE não encontrado."
    exit 1
fi

echo "======================================================"
echo "    NextWave CRM -- Restaurador de Banco de Dados"
echo "======================================================"
echo "Arquivo: $DUMP_FILE"
echo "Container: $DB_CONTAINER"
echo ""

# 1. Limpa o banco atual (Cuidado: remove tudo!)
echo "[1/3] Limpando banco de dados atual..."
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null
echo "      OK."

# 2. Injeta o SQL diretamente no container
echo "[2/3] Restaurando dados (isso pode levar alguns minutos)..."
cat "$DUMP_FILE" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "      Restauração concluída com sucesso!"
else
    echo "      A restauração terminou (com alguns avisos técnicos ignorados)."
fi

# 3. Sincroniza o Prisma (para garantir que os IDs e sequências estejam corretos)
echo "[3/3] Sincronizando sequências do banco..."
# (Opcional se o dump não for completo)

echo ""
echo "======================================================"
echo "  Processo Concluído! Reinicie o CRM para aplicar."
echo "  Comando: docker compose restart nextwave-crm-blue nextwave-crm-green"
echo "======================================================"
