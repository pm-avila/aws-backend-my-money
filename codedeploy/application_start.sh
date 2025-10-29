#!/bin/bash
set -eux

APP_DIR="/opt/apps/backend/releases/{{deployment_id}}"
CURRENT_LINK="/opt/apps/backend/current"

ln -sfn "$APP_DIR" "$CURRENT_LINK"

# Carregar NVM (este script já roda como appuser conforme appspec.yml)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Iniciar/reiniciar com PM2
pm2 start $CURRENT_LINK/src/index.js --name meu-backend --update-env --time || pm2 restart meu-backend
pm2 save
