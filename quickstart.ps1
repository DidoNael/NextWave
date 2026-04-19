# NextWave CRM - Quickstart para Windows
# Execute: .\quickstart.ps1

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   NextWave CRM - Quickstart" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Docker nao encontrado. Instale em https://docs.docker.com/get-docker/" -ForegroundColor Red
    exit 1
}

# Gerar .env se nao existir
if (-not (Test-Path ".env")) {
    Write-Host "[1/3] Configurando variaveis de ambiente..." -ForegroundColor Yellow

    # Gerar chave secreta
    $SECRET = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })

    # Perguntar a URL
    Write-Host ""
    $URL = Read-Host "      Qual a URL de acesso? (Ex: http://192.168.1.100:3000) [ENTER para localhost:3000]"
    if ([string]::IsNullOrWhiteSpace($URL)) { $URL = "http://localhost:3000" }

    # Criar .env
    @"
NEXTAUTH_URL=$URL
NEXTAUTH_SECRET=$SECRET
AUTH_SECRET=$SECRET
DATABASE_URL=file:/app/data/prod.db
"@ | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

    Write-Host "      Arquivo .env criado!" -ForegroundColor Green
} else {
    Write-Host "[1/3] Arquivo .env ja existe, usando configuracoes existentes." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Construindo imagem Docker (pode demorar alguns minutos na primeira vez)..." -ForegroundColor Yellow
docker compose build

Write-Host ""
Write-Host "[3/3] Iniciando container..." -ForegroundColor Yellow
docker compose up -d

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Aguardando a aplicacao ficar pronta..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 10

# Tentar ler URL do .env
$envContent = Get-Content ".env" | Where-Object { $_ -match "^NEXTAUTH_URL=" }
$URL = ($envContent -split "=", 2)[1]

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   NextWave CRM esta no ar!" -ForegroundColor Green
Write-Host ""
Write-Host "   Acesse: $URL" -ForegroundColor White
Write-Host ""
Write-Host "   Login: admin@nextwave.com" -ForegroundColor White
Write-Host "   Senha: admin123" -ForegroundColor White
Write-Host ""
Write-Host "   Para ver logs:  docker compose logs -f" -ForegroundColor Gray
Write-Host "   Para parar:     docker compose down" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
