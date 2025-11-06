#!/bin/bash
# Wrapper script to run import_tasks_mcp.py with the virtual environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python"

# Load nvm if available (for Node.js/npx)
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use stable Node.js version
if command -v nvm &> /dev/null; then
    nvm use stable > /dev/null 2>&1
    # Ensure npx is in PATH
    export PATH="$NVM_DIR/versions/node/$(nvm current)/bin:$PATH"
fi

if [ ! -f "$VENV_PYTHON" ]; then
    echo "Error: Virtual environment not found. Please run: python3 -m venv venv && ./venv/bin/pip install mcp"
    exit 1
fi

exec "$VENV_PYTHON" "$SCRIPT_DIR/import_tasks_mcp.py" "$@"

