#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.traefik.yml"
ACTIVE_COLOR_FILE=".active-color"
DYNAMIC_FILE="traefik-dynamic.yml"
HEALTH_TIMEOUT=180

# ── Garante que a infra base (DB), Traefik e redes existam ──────────────────
docker compose up -d postgres evolution-api
docker compose -f "$COMPOSE_FILE" up -d traefik
docker volume create crm-data 2>/dev/null || true

# ── Lê o slot ativo atual ─────────────────────────────────────────────────────
if [[ ! -f "$ACTIVE_COLOR_FILE" ]]; then
  echo "blue" > "$ACTIVE_COLOR_FILE"
fi

CURRENT=$(cat "$ACTIVE_COLOR_FILE" | tr -d '[:space:]')
if [[ "$CURRENT" != "blue" && "$CURRENT" != "green" ]]; then
  CURRENT="blue"
  echo "blue" > "$ACTIVE_COLOR_FILE"
fi

[[ "$CURRENT" == "blue" ]] && NEXT="green" || NEXT="blue"

echo ""
echo "======================================================="
echo "       NextWave CRM -- Blue-Green Deploy"
echo "======================================================="
echo "  Slot ATIVO   : $CURRENT"
echo "  Slot DESTINO : $NEXT"
echo ""

# ── 1. Build ──────────────────────────────────────────────────────────────────
echo "[1/5] Construindo imagem nextwave-crm:$NEXT ..."
docker compose -f "$COMPOSE_FILE" build "nextwave-crm-$NEXT"
echo "      OK"
echo ""

# ── 2. Sobe novo slot ─────────────────────────────────────────────────────────
echo "[2/5] Iniciando container nextwave-crm-$NEXT ..."
docker compose -f "$COMPOSE_FILE" up -d "nextwave-crm-$NEXT"
echo "      Container iniciado."
echo ""

# ── 3. Aguarda healthcheck ────────────────────────────────────────────────────
echo "[3/5] Aguardando healthcheck do slot $NEXT (timeout: ${HEALTH_TIMEOUT}s) ..."
ELAPSED=0
STEP=5

while true; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "nextwave-crm-$NEXT" 2>/dev/null || echo "missing")

  if [[ "$STATUS" == "healthy" ]]; then
    echo "      Slot $NEXT HEALTHY!"
    break
  fi

  if [[ $ELAPSED -ge $HEALTH_TIMEOUT ]]; then
    echo ""
    echo "[FALHA] Slot $NEXT nao ficou healthy em ${HEALTH_TIMEOUT}s."
    echo "        Abortando -- slot $CURRENT continua ativo."
    docker compose -f "$COMPOSE_FILE" stop "nextwave-crm-$NEXT"
    exit 1
  fi

  echo "      Status: $STATUS -- aguardando... (${ELAPSED}s/${HEALTH_TIMEOUT}s)"
  sleep $STEP
  ELAPSED=$((ELAPSED + STEP))
done
echo ""

# ── 4. Atualiza roteamento Traefik ────────────────────────────────────────────
echo "[4/5] Chaveando Traefik para slot $NEXT ..."
cat > "$DYNAMIC_FILE" <<EOF
http:
  routers:
    nextwave:
      rule: "PathPrefix(\`/\`)"
      entryPoints:
        - web
      service: nextwave-$NEXT

  services:
    nextwave-blue:
      loadBalancer:
        servers:
          - url: "http://nextwave-crm-blue:3000"
        healthCheck:
          path: /api/auth/session
          interval: 10s
          timeout: 5s

    nextwave-green:
      loadBalancer:
        servers:
          - url: "http://nextwave-crm-green:3000"
        healthCheck:
          path: /api/auth/session
          interval: 10s
          timeout: 5s
EOF

echo "      Aguardando Traefik recarregar (5s) ..."
sleep 5
echo "      Traefik apontando para slot $NEXT."
echo ""

# ── 5. Para slot antigo ───────────────────────────────────────────────────────
echo "[5/5] Parando slot antigo ($CURRENT) ..."
docker compose -f "$COMPOSE_FILE" stop "nextwave-crm-$CURRENT"
echo "      Slot $CURRENT parado."
echo ""

echo "$NEXT" > "$ACTIVE_COLOR_FILE"

echo "======================================================="
echo "  Deploy concluido! Slot ativo agora: $NEXT"
echo "======================================================="
echo ""
