FROM atendai/evolution-api:latest

WORKDIR /evolution

# Atualiza o Baileys a partir do fork oficial da EvolutionAPI (CJS, com fixes de protocolo WhatsApp)
RUN apk add --no-cache git && \
    npm install github:EvolutionAPI/Baileys --legacy-peer-deps --no-audit --no-fund && \
    apk del git
