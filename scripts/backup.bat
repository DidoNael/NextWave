@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: NextWave CRM SASS - Automated Backup Script
:: ============================================================================

:: Configurações
set "BACKUP_DIR=backups"
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"
set "BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.zip"

echo [*] Iniciando backup do NextWave CRM SASS...
echo [*] Timestamp: %TIMESTAMP%

:: Criar diretório de backup se não existir
if not exist "%BACKUP_DIR%" (
    echo [+] Criando diretorio %BACKUP_DIR%...
    mkdir "%BACKUP_DIR%"
)

:: Arquivos a serem incluídos
set "FILES_TO_BACKUP=prisma\dev.db .env .env.local"

:: Verificar se os arquivos existem antes de compactar
for %%f in (%FILES_TO_BACKUP%) do (
    if not exist "%%f" (
        echo [!] AVISO: Arquivo %%f nao encontrado, sera ignorado.
    )
)

echo [*] Compactando arquivos em %BACKUP_FILE%...

:: Usar PowerShell para criar o ZIP (nativo no Windows 10+)
:: Corrigido: Passando os caminhos como uma string separada por vírgulas para o PowerShell interpretar como array
powershell -Command "$files = '%FILES_TO_BACKUP%'.Split(' '); Compress-Archive -Path $files -DestinationPath '%BACKUP_FILE%' -Force"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Backup concluido com sucesso: %BACKUP_FILE%
) else (
    echo [ERRO] Falha ao criar o arquivo de backup.
    exit /b %ERRORLEVEL%
)

echo.
echo DICA: Guarde este arquivo em um local seguro (ex: Pendrive ou Nuvem fora deste drive).
pause
