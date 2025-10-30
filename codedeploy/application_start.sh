#!/bin/bash
set -eux

echo "=== ApplicationStart: Iniciando aplicação ==="

# Diretório da aplicação (definido pelo appspec.yml)
APP_DIR="/opt/apps/backend/current"
SECRET_NAME="${SECRET_NAME:-money2-backend-dev-secret-rds}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "✓ Usando diretório: $APP_DIR"

# Verificar PM2 disponível (script roda como appuser)
pm2 --version || { echo "✗ PM2 não encontrado"; exit 1; }
echo "✓ PM2 disponível"

# Verificar se ecosystem.config.js existe
if [ ! -f "$APP_DIR/ecosystem.config.js" ]; then
  echo "✗ Arquivo ecosystem.config.js não encontrado"
  exit 1
fi
echo "✓ Arquivo ecosystem.config.js encontrado"

# Criar diretório de logs se não existir
mkdir -p "$APP_DIR/logs"
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
cd "$APP_DIR"

# Verificar se JWT_SECRET foi carregado
if [ -z "$JWT_SECRET" ]; then
  echo "⚠️  AVISO: JWT_SECRET não foi carregado!"
fi

# PM2 herdará as variáveis de ambiente do shell (incluindo JWT_SECRET)
pm2 start ecosystem.config.js --update-env

# Salvar configuração do PM2
pm2 save
echo "✓ Aplicação iniciada e configuração salva"

# Mostrar status
pm2 list
pm2 logs meu-backend --lines 20 --nostream

echo "=== ApplicationStart: Concluído ==="
