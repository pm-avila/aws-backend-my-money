#!/bin/bash
set -eux

echo "=== ApplicationStart: Iniciando aplicação ==="

APP_DIR="/opt/apps/backend/releases/{{deployment_id}}"
CURRENT_LINK="/opt/apps/backend/current"
SECRET_NAME="${SECRET_NAME:-money2-backend-dev-secret-rds}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Criar symlink para o release atual
ln -sfn "$APP_DIR" "$CURRENT_LINK"
echo "✓ Symlink criado: $CURRENT_LINK -> $APP_DIR"

# Verificar PM2 disponível (script roda como appuser)
pm2 --version || { echo "✗ PM2 não encontrado"; exit 1; }
echo "✓ PM2 disponível"

# Verificar se ecosystem.config.js existe
if [ ! -f "$CURRENT_LINK/ecosystem.config.js" ]; then
  echo "✗ Arquivo ecosystem.config.js não encontrado"
  exit 1
fi
echo "✓ Arquivo ecosystem.config.js encontrado"

# Criar diretório de logs se não existir
mkdir -p "$CURRENT_LINK/logs"
echo "✓ Diretório de logs criado"

# Buscar JWT_SECRET do AWS Secrets Manager
echo "Buscando JWT_SECRET do Secrets Manager..."
if command -v aws >/dev/null 2>&1; then
  JWT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query 'SecretString' \
    --output text 2>/dev/null | jq -r '.jwt_secret // .JWT_SECRET // empty')

  if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  JWT_SECRET não encontrado no secret $SECRET_NAME"
    echo "⚠️  Tentando usar variável de ambiente JWT_SECRET se existir"
    if [ -z "$JWT_SECRET" ]; then
      echo "✗ JWT_SECRET não disponível. Configure no Secrets Manager ou como variável de ambiente"
      exit 1
    fi
  else
    export JWT_SECRET
    echo "✓ JWT_SECRET carregado do Secrets Manager"
  fi
else
  echo "⚠️  AWS CLI não disponível, usando JWT_SECRET de variável de ambiente"
  if [ -z "$JWT_SECRET" ]; then
    echo "✗ JWT_SECRET não disponível como variável de ambiente"
    exit 1
  fi
fi

# Deletar processos PM2 antigos para garantir aplicação das novas configurações
pm2 delete meu-backend 2>/dev/null || true
echo "✓ Processos PM2 antigos removidos"

# Iniciar aplicação com PM2 usando ecosystem.config.js
echo "Iniciando aplicação com ecosystem.config.js..."
cd "$CURRENT_LINK"
pm2 start ecosystem.config.js --update-env

# Salvar configuração do PM2
pm2 save
echo "✓ Aplicação iniciada e configuração salva"

# Mostrar status
pm2 list
pm2 logs meu-backend --lines 20 --nostream

echo "=== ApplicationStart: Concluído ==="
