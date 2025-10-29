#!/bin/bash
set -eux

DEPLOY_DIR="/opt/apps/backend/releases/{{deployment_id}}"
cd "$DEPLOY_DIR"

# Carregar NVM (este script já roda como appuser conforme appspec.yml)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalar dependências (sem dev)
npm ci --omit=dev

# (Opcional) Migrations
# npm run prisma:migrate || true
