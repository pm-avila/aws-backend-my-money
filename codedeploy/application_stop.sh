#!/bin/bash
set -eux

echo "=== ApplicationStop: Parando aplicação ==="

# Verificar se PM2 está disponível
if ! command -v pm2 >/dev/null 2>&1; then
  echo "⚠️  PM2 não encontrado, nada para parar"
  exit 0
fi

# Parar a aplicação se estiver rodando
if pm2 describe meu-backend >/dev/null 2>&1; then
  echo "Parando aplicação meu-backend..."
  pm2 stop meu-backend
  pm2 delete meu-backend
  echo "✓ Aplicação parada e removida"
else
  echo "⚠️  Aplicação meu-backend não está rodando"
fi

# Limpar processos órfãos (se houver)
pm2 kill 2>/dev/null || true

echo "=== ApplicationStop: Concluído ==="
