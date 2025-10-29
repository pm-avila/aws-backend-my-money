#!/bin/bash
set -eux

echo "=== ApplicationStart: Iniciando aplicação ==="

APP_DIR="/opt/apps/backend/releases/{{deployment_id}}"
CURRENT_LINK="/opt/apps/backend/current"

# Criar symlink para o release atual
ln -sfn "$APP_DIR" "$CURRENT_LINK"
echo "✓ Symlink criado: $CURRENT_LINK -> $APP_DIR"

# Verificar PM2 disponível (script roda como appuser)
pm2 --version || { echo "✗ PM2 não encontrado"; exit 1; }
echo "✓ PM2 disponível"

# Iniciar ou reiniciar aplicação com PM2
echo "Iniciando/reiniciando aplicação..."
pm2 start "$CURRENT_LINK/src/index.js" \
  --name meu-backend \
  --update-env \
  --time \
  || pm2 restart meu-backend

# Salvar configuração do PM2
pm2 save
echo "✓ Aplicação iniciada e configuração salva"

echo "=== ApplicationStart: Concluído ==="
