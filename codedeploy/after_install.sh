#!/bin/bash
set -eux

DEPLOY_DIR="/opt/apps/backend/releases/{{deployment_id}}"
cd "$DEPLOY_DIR"

# Instalar dependências (sem dev)
su - appuser -c "cd $DEPLOY_DIR && source ~/.nvm/nvm.sh && npm ci --omit=dev"

# (Opcional) Migrations
# su - appuser -c "cd $DEPLOY_DIR && source ~/.nvm/nvm.sh && npm run prisma:migrate || true"
