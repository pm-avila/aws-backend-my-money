#!/bin/bash
set -e

# Configurações
APP_PORT=${PORT:-3001}
MAX_RETRIES=30
RETRY_DELAY=2

echo "Iniciando validação do serviço na porta $APP_PORT..."

# Função para verificar se o serviço está respondendo
check_health() {
  curl -f -s -o /dev/null http://localhost:$APP_PORT/ || return 1
  return 0
}

# Tentar conectar ao serviço com retry
for i in $(seq 1 $MAX_RETRIES); do
  echo "Tentativa $i de $MAX_RETRIES..."

  if check_health; then
    echo "✓ Serviço está respondendo corretamente na porta $APP_PORT"
    exit 0
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo "Aguardando ${RETRY_DELAY}s antes da próxima tentativa..."
    sleep $RETRY_DELAY
  fi
done

echo "✗ Falha: Serviço não respondeu após $MAX_RETRIES tentativas"
exit 1
