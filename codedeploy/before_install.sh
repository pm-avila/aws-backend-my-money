#!/bin/bash
set -eux

# Node via nvm se não existir
if ! command -v node >/dev/null 2>&1; then
  su - appuser -c "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  su - appuser -c "source ~/.nvm/nvm.sh && nvm install --lts && nvm alias default 'lts/*'"
fi

# Diretórios padrão
mkdir -p /opt/apps/backend/{releases,shared,logs}
chown -R appuser:appuser /opt/apps/backend
