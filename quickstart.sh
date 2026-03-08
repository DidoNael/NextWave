#!/bin/bash
set -e

echo ""
echo "================================================"
echo "   NextWave CRM - Quickstart"
echo "================================================"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
  echo "ERRO: Docker nao encontrado. Instale em https://docs.docker.com/get-docker/"
  exit 1
fi

# Gerar .env se nao existir
if [ ! -f ".env" ]; then
  echo "[1/3] Configurando variáveis de ambiente..."

  # Gerar chave secreta aleatória
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

  # Perguntar a URL
  echo ""
  read -p "      Qual a URL de acesso? (Ex: http://192.168.1.100:3000) [padrão: http://localhost:3000]: " URL
  URL=${URL:-http://localhost:3000}

  # Criar .env
  cat > .env << EOF
NEXTAUTH_URL=$URL
NEXTAUTH_SECRET=$SECRET
AUTH_SECRET=$SECRET
AUTH_TRUST_HOST=true
DATABASE_URL=file:/app/data/prod.db
EOF

  echo "      Arquivo .env criado!"
else
  echo "[1/3] Arquivo .env já existe, usando configurações existentes."
fi

echo ""
echo "[2/3] Construindo imagem Docker (pode demorar alguns minutos na primeira vez)..."
docker compose build

echo ""
echo "[3/3] Iniciando container..."
docker compose up -d

echo ""
echo "================================================"
echo "   Aguardando a aplicação ficar pronta..."
echo "================================================"

# Aguardar healthcheck
for i in $(seq 1 30); do
  if docker compose exec -T nextwave-crm wget -qO- http://localhost:3000/api/auth/session &>/dev/null 2>&1; then
    break
  fi
  printf "."
  sleep 3
done

echo ""
echo ""
echo "================================================"
echo "   NextWave CRM esta no ar!"
echo ""
URL=$(grep NEXTAUTH_URL .env | cut -d= -f2)
echo "   Acesse: $URL"
echo ""
echo "   Para ver logs:  docker compose logs -f"
echo "   Para parar:     docker compose down"
echo "================================================"
echo ""
