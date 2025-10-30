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

# Verificar dependências instaladas no User Data
node --version || { echo "✗ Node.js não encontrado"; exit 1; }
pm2 --version || { echo "✗ PM2 não encontrado"; exit 1; }
echo "✓ Node.js e PM2 disponíveis"

# Verificar AWS CLI e jq (necessários para buscar secrets)
aws --version || { echo "✗ AWS CLI não encontrado"; exit 1; }
jq --version || { echo "✗ jq não encontrado (instalar: yum install -y jq)"; exit 1; }
echo "✓ AWS CLI e jq disponíveis"

# Verificar IAM role (credenciais AWS disponíveis)
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "⚠️  AVISO: IAM role não configurada ou sem permissões"
  echo "⚠️  Aplicação pode falhar ao buscar secrets do Secrets Manager"
else
  echo "✓ IAM role configurada e funcional"
fi

# Criar estrutura de diretórios
mkdir -p /opt/apps/backend/{current,shared,logs}

# Ajustar permissões ANTES do CodeDeploy copiar arquivos
chown -R appuser:appuser /opt/apps/backend
chmod -R 755 /opt/apps/backend
echo "✓ Diretórios criados e permissões ajustadas"

# Se o diretório current já existe, limpar conteúdo antigo (exceto logs)
if [ -d "/opt/apps/backend/current" ]; then
  echo "Limpando diretório current (mantendo logs)..."
  cd /opt/apps/backend/current
  find . -mindepth 1 -maxdepth 1 ! -name 'logs' -exec rm -rf {} + 2>/dev/null || true
  echo "✓ Diretório limpo"
fi

echo "=== BeforeInstall: Concluído ==="
