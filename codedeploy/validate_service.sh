#!/bin/bash
set -eux

# Executar healthcheck do diretório atual
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/healthcheck.sh"
