#!/bin/bash

# Script de Deploy Automatizado do NextWave CRM para ARM64
# Versão 1.2.0

echo "🚀 Iniciando Deploy do NextWave CRM..."

# Tentar detectar o IP local do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

# 1. Verificar se o Docker está instalado
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Erro: Docker não está instalado. Por favor, instale o Docker primeiro."
  exit 1
fi

# 2. Detectar Docker Compose (v2 plugin ou v1 standalone)
COMPOSE=""
if docker compose version &>/dev/null; then
    COMPOSE="docker compose"
    echo "✅ Docker Compose V2 detectado"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
    echo "✅ Docker Compose V1 detectado"
else
    echo "❌ Docker Compose não está instalado."
    echo "📦 Instalando Docker Compose V2 plugin..."
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin 2>/dev/null
    if docker compose version &>/dev/null; then
        COMPOSE="docker compose"
        echo "✅ Docker Compose V2 instalado com sucesso!"
    else
        echo "⚠️ Instalação automática falhou. Tentando instalar standalone..."
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        if [ -z "$COMPOSE_VERSION" ]; then
            COMPOSE_VERSION="v2.27.0"
        fi
        ARCH=$(uname -m)
        curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        if command -v docker-compose &>/dev/null; then
            COMPOSE="docker-compose"
            echo "✅ Docker Compose standalone instalado com sucesso!"
        else
            echo "❌ Não foi possível instalar o Docker Compose. Instale manualmente."
            exit 1
        fi
    fi
fi

# 3. Verificar se o arquivo .env existe, se não, criar do .env.example
if [ ! -f .env ]; then
    echo "📄 Arquivo .env não encontrado. Criando um padrão..."
    if [ -f .env.example ]; then
        cp .env.example .env
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$SERVER_IP:3000|g" .env
        echo "✅ .env criado. ATENÇÃO: Verifique o campo NEXTAUTH_URL no arquivo .env."
    else
        echo "DATABASE_URL=\"file:/app/data/prod.db\"" > .env
        echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
        echo "NEXTAUTH_URL=\"http://$SERVER_IP:3000\"" >> .env
        echo "✅ .env gerado automaticamente com IP detectado: $SERVER_IP"
    fi
fi

# 4. Construir e subir os containers
echo "🏗️ Construindo containers (isso pode levar alguns minutos em ARM64)..."
$COMPOSE build --pull

echo "⬆️ Subindo o sistema..."
$COMPOSE up -d

echo "📊 Verificando status..."
$COMPOSE ps

echo ""
echo "===================================================="
echo "✨ NextWave CRM está subindo!"
echo "📍 Acesse em: http://${SERVER_IP}:3000"
echo "📂 Banco de dados persistido no volume: crm-data"
echo "🧹 Para zerar o banco de dados, use: ./reset-db.sh"
echo "===================================================="
