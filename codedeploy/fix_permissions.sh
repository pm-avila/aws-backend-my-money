#!/bin/bash
set -e

echo "==== FixPermissions: Corrigindo permissões recursivamente ===="

TEMP_DIR="/tmp/codedeploy-app"

# Verificar se o diretório existe
if [ ! -d "$TEMP_DIR" ]; then
  echo "⚠️  Diretório $TEMP_DIR não encontrado, nada a corrigir"
  exit 0
fi

# Aplicar permissões recursivamente para appuser
echo "Aplicando permissões recursivas em $TEMP_DIR..."
chown -R appuser:appuser "$TEMP_DIR"
chmod -R 755 "$TEMP_DIR"

echo "✓ Permissões aplicadas: appuser:appuser com modo 755"
echo "=== FixPermissions: Concluído ==="
