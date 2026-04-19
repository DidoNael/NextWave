# Script para exportar o Banco de Dados PostgreSQL do Docker local
# Uso: .\scripts\export-db.ps1

Write-Host "Iniciando exportacao do banco de dados NextWave CRM..." -ForegroundColor Cyan

# Nome do container e usuario
$CONTAINER_NAME = "nextwave-db"
$DB_USER = "root"
$OUTPUT_FILE = "backups/postgres_dump.sql"

# Garantir que a pasta de backup existe
if (!(Test-Path -Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

# Executar o pg_dump via Docker
# O parametro -c limpa as tabelas antes de recriar
docker exec -t $CONTAINER_NAME pg_dumpall -c -U $DB_USER > $OUTPUT_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "Sucesso: Exportacao concluida!" -ForegroundColor Green
    Write-Host "Arquivo gerado: $OUTPUT_FILE" -ForegroundColor Yellow
} else {
    Write-Host "Erro: Falha ao exportar o banco de dados." -ForegroundColor Red
}
