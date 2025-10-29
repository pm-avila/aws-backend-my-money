#!/bin/bash
set -eux

echo "=== BeforeInstall: Preparando ambiente ==="

# Criar usuário appuser se não existir
if ! id -u appuser >/dev/null 2>&1; then
  useradd -m -s /bin/bash appuser
  echo "✓ Usuário appuser criado"
else
  echo "✓ Usuário appuser já existe"
fi

# Verificar se Node.js e PM2 estão disponíveis (instalados no User Data)
node --version || { echo "✗ Node.js não encontrado"; exit 1; }
pm2 --version || { echo "✗ PM2 não encontrado"; exit 1; }
echo "✓ Node.js e PM2 disponíveis"

# Criar estrutura de diretórios
mkdir -p /opt/apps/backend/{releases,shared,logs}
chown -R appuser:appuser /opt/apps/backend
echo "✓ Diretórios criados e permissões ajustadas"

echo "=== BeforeInstall: Concluído ==="
