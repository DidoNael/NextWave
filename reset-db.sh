#!/bin/bash

# Script para Zerar o Banco de Dados do NextWave CRM
# Versão 1.0.0

echo "⚠️  AVISO: Isso apagará TODOS os dados do CRM (exceto o usuário admin)."
read -p "Você tem certeza que deseja continuar? (s/N): " confirm

if [[ $confirm == [sS] || $confirm == [yY] ]]; then
    echo "🧹 Limpando banco de dados..."
    docker exec nextwave-crm npx prisma db push --force-reset
    
    echo "🌱 Populando com dados iniciais (apenas admin)..."
    docker exec nextwave-crm npx tsx prisma/seed.ts
    
    echo "✅ Banco de dados resetado com sucesso!"
else
    echo "❌ Operação cancelada."
fi
