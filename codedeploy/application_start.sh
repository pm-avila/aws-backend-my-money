#!/bin/bash
set -eux

APP_DIR="/opt/apps/backend/releases/{{deployment_id}}"
CURRENT_LINK="/opt/apps/backend/current"

ln -sfn "$APP_DIR" "$CURRENT_LINK"

# Iniciar/reiniciar com PM2
su - appuser -c "source ~/.nvm/nvm.sh && pm2 start $CURRENT_LINK/src/index.js --name meu-backend --update-env --time || pm2 restart meu-backend"
su - appuser -c "pm2 save"
