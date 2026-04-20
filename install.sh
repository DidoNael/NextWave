#!/bin/bash
# NextWave CRM v3.0.2 - Script Master de Instalação Soberana
# Este script permite definir as credenciais ANTES de subir o Docker.

echo "===================================================="
echo "      NextWave CRM - Instalação Soberana v3.0.2     "
echo "===================================================="

# 1. Perguntar a senha desejada
read -p "Digite a senha desejada para o Banco de Dados: " DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    echo "Erro: A senha não pode ser vazia."
    exit 1
fi

# 2. Perguntar a URL do sistema
read -p "Digite a URL do sistema (ex: http://seu-ip:3010): " SITE_URL
if [ -z "$SITE_URL" ]; then
    SITE_URL="http://localhost:3010"
fi

# 3. Gerar o arquivo .env
echo "Gerando arquivo .env..."
cat <<EOF > .env
# --- NextWave CRM Sovereign Config ---
POSTGRES_USER=root
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=nextwave_crm
DATABASE_URL=postgresql://root:$DB_PASSWORD@nextwave-db:5432/nextwave_crm?schema=public

NEXTAUTH_URL=$SITE_URL
NEXTAUTH_SECRET=$(openssl rand -base64 32)
AUTH_SECRET=$(openssl rand -base64 32)

EVOLUTION_API_KEY=$(openssl rand -hex 16)
EOF

echo "Arquivo .env gerado com sucesso!"

# 4. Subir o Docker
echo "Subindo containers NextWave v3.0.2..."
docker-compose down -v --remove-orphans
docker-compose up -d --build

echo "===================================================="
echo "INSTALAÇÃO INICIADA!"
echo "Aguarde 30 segundos e acesse: $SITE_URL/setup"
echo "Sua senha já foi aplicada e o banco está seguro."
echo "===================================================="
