#!/bin/bash
set -e

# Configurações
APP_PORT=${PORT:-3001}
APP_NAME="meu-backend"
MAX_RETRIES=30
RETRY_DELAY=2

echo "===== Iniciando validação completa dos serviços ====="

# Função para verificar se o serviço HTTP está respondendo
check_http_health() {
  curl -f -s -o /dev/null http://localhost:$APP_PORT/ || return 1
  return 0
}

### Função para verificar se PM2 está rodando o processo
check_pm2_health() {
  # Verificar se PM2 está instalado
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "✗ PM2 não encontrado"
    return 1
  fi

  # Verificar se o processo está online
  if ! pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo "✗ Processo $APP_NAME não encontrado no PM2"
    return 1
  fi

  # Verificar status online
  if ! pm2 describe "$APP_NAME" | grep -q "status.*online"; then
    echo "✗ Processo $APP_NAME não está online"
    return 1
  fi

  return 0
}

# Função para verificar logs do PM2
check_pm2_logs() {
  LOG_DIR="/opt/apps/backend/current/logs"

  # Verificar se diretório de logs existe
  if [ ! -d "$LOG_DIR" ]; then
    echo "⚠️  Diretório de logs não encontrado: $LOG_DIR"
    return 0  # Não fatal
  fi

  # Verificar se logs estão sendo gerados (modificados nos últimos 5 minutos)
  if find "$LOG_DIR" -name "*.log" -mmin -5 | grep -q .; then
    echo "✓ Logs do PM2 estão sendo gerados"
    return 0
  else
    echo "⚠️  Logs do PM2 não foram atualizados recentemente"
    return 0  # Não fatal, apenas aviso
  fi
}

# Tentar validar o serviço com retry
for i in $(seq 1 $MAX_RETRIES); do
  echo "Tentativa $i de $MAX_RETRIES..."

  # 1. Verificar PM2 primeiro
  if check_pm2_health; then
    echo "✓ PM2 está rodando $APP_NAME corretamente"

    # 2. Verificar HTTP
    if check_http_health; then
      echo "✓ Serviço HTTP está respondendo na porta $APP_PORT"

      # 3. Verificar logs (opcional)
      check_pm2_logs

      echo "=== ✓ Validação completa: SUCESSO ==="
      exit 0
    else
      echo "⚠️  PM2 online mas HTTP não responde ainda..."
    fi
  else
    echo "⚠️  PM2 ainda não está pronto..."
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo "Aguardando ${RETRY_DELAY}s antes da próxima tentativa..."
    sleep $RETRY_DELAY
  fi
done

echo "=== ✗ Falha: Serviço não passou na validação após $MAX_RETRIES tentativas ==="
exit 1
