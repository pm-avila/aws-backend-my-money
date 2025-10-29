#!/bin/bash
set -eux

# Criar usuário appuser se não existir
if ! id -u appuser >/dev/null 2>&1; then
  useradd -m -s /bin/bash appuser
  echo "Usuário appuser criado com sucesso"
fi

# Node via nvm se não existir
if ! command -v node >/dev/null 2>&1; then
  su - appuser -c "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  su - appuser -c "source ~/.nvm/nvm.sh && nvm install --lts && nvm alias default 'lts/*'"
fi

# Instalar PM2 globalmente para appuser (se ainda não estiver instalado)
su - appuser -c "source ~/.nvm/nvm.sh && npm list -g pm2 || npm install -g pm2"

# Diretórios padrão
mkdir -p /opt/apps/backend/{releases,shared,logs}
chown -R appuser:appuser /opt/apps/backend
