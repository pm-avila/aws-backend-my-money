#!/bin/bash
set -eux

echo "=== AfterInstall: Instalando dependências ==="

# Diretórios
TEMP_DIR="/tmp/codedeploy-app"
TARGET_DIR="/opt/apps/backend/current"

echo "Current user: $(whoami)"
echo "Current groups: $(groups)"

# Verificar se o diretório temporário existe
if [ ! -d "$TEMP_DIR" ]; then
  echo "✗ Diretório temporário $TEMP_DIR não existe"
  exit 1
fi

# Verificar se TARGET_DIR existe e criar se necessário
mkdir -p "$TARGET_DIR"

# Limpar diretório de destino (mantendo logs se existirem)
if [ -d "$TARGET_DIR" ] && [ "$(ls -A $TARGET_DIR 2>/dev/null)" ]; then
  echo "Limpando diretório de destino..."
  # Salvar logs se existirem
  if [ -d "$TARGET_DIR/logs" ]; then
    mv "$TARGET_DIR/logs" "/tmp/logs-backup" 2>/dev/null || true
  fi
  rm -rf "$TARGET_DIR"/*
fi

# Mover arquivos do temporário para o destino
echo "Movendo arquivos para $TARGET_DIR..."
mv "$TEMP_DIR"/* "$TARGET_DIR/" 2>/dev/null || cp -r "$TEMP_DIR"/* "$TARGET_DIR/"

# Mover arquivos ocultos também (como .gitignore)
if ls "$TEMP_DIR"/.[!.]* 1> /dev/null 2>&1; then
  mv "$TEMP_DIR"/.[!.]* "$TARGET_DIR/" 2>/dev/null || cp -r "$TEMP_DIR"/.[!.]* "$TARGET_DIR/"
fi

# Restaurar logs se foram salvos
if [ -d "/tmp/logs-backup" ]; then
  mv "/tmp/logs-backup" "$TARGET_DIR/logs"
fi

echo "✓ Arquivos movidos para $TARGET_DIR"

# Limpar diretório temporário
# Agora funciona porque fix_permissions.sh já ajustou as permissões
echo "Limpando diretório temporário..."
if rm -rf "$TEMP_DIR"; then
  echo "✓ Diretório temporário limpo com sucesso"
else
  echo "⚠️  Aviso: Não foi possível limpar completamente $TEMP_DIR (não fatal)"
fi

cd "$TARGET_DIR"

# Verificar Node.js disponível (script roda como appuser)
node --version || { echo "✗ Node.js não encontrado"; exit 1; }
echo "✓ Node.js disponível"

# Instalar dependências (sem dev)
echo "Instalando dependências de produção..."
npm ci --omit=dev
echo "✓ Dependências instaladas"

# (Opcional) Migrations
# echo "Executando migrations..."
# npm run prisma:migrate || true

echo "=== AfterInstall: Concluído ==="
