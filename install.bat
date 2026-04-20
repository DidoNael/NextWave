@echo off
:: NextWave CRM v3.0.2 - Script Master de Instalação Soberana (Windows)
:: Este script permite definir as credenciais ANTES de subir o Docker.

echo ====================================================
echo       NextWave CRM - Instalação Soberana v3.0.2     
echo ====================================================

:: 1. Perguntar a senha desejada
set /p DB_PASSWORD="Digite a senha desejada para o Banco de Dados: "
if "%DB_PASSWORD%"=="" (
    echo Erro: A senha não pode ser vazia.
    pause
    exit /b 1
)

:: 2. Perguntar a URL do sistema
set /p SITE_URL="Digite a URL do sistema (ex: http://seu-ip:3010): "
if "%SITE_URL%"=="" (
    set SITE_URL=http://localhost:3010
)

:: 3. Gerar o arquivo .env
echo Gerando arquivo .env...
(
echo # --- NextWave CRM Sovereign Config ---
echo POSTGRES_USER=root
echo POSTGRES_PASSWORD=%DB_PASSWORD%
echo POSTGRES_DB=nextwave_crm
echo DATABASE_URL=postgresql://root:%DB_PASSWORD%@nextwave-db:5432/nextwave_crm?schema=public
echo.
echo NEXTAUTH_URL=%SITE_URL%
echo NEXTAUTH_SECRET=nextwave_secret_%RANDOM%%RANDOM%
echo AUTH_SECRET=auth_secret_%RANDOM%%RANDOM%
echo.
echo EVOLUTION_API_KEY=evo_key_%RANDOM%%RANDOM%
) > .env

echo Arquivo .env gerado com sucesso!

:: 4. Subir o Docker
echo Subindo containers NextWave v3.0.2...
docker-compose down -v --remove-orphans
docker-compose up -d --build

echo ====================================================
echo INSTALAÇÃO INICIADA!
echo Aguarde 30 segundos e acesse: %SITE_URL%/setup
echo Sua senha já foi aplicada e o banco está seguro.
echo ====================================================
pause
