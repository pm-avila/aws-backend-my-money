#!/bin/bash
set -eux

echo "=== AfterInstall: Instalando dependências ==="

DEPLOY_DIR="/opt/apps/backend/releases/{{deployment_id}}"
cd "$DEPLOY_DIR"

# Verificar Node.js disponível (script roda como appuser)
node --version || { echo "✗ Node.js não encontrado"; exit 1; }
echo "✓ Node.js disponível"

# Instalar dependências (sem dev)
echo "Instalando dependências de produção..."
npm ci --omit=dev
echo "✓ Dependências instaladas"

# (Opcional) Migrations
# echo "Executando migrations..."
# npm run prisma:migrate || true

echo "=== AfterInstall: Concluído ==="
