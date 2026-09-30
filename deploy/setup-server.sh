#!/bin/bash

set -e

PROJECT_DIR="/opt/fs-monitor-platform"

echo "=========================================="
echo "Filesystem Monitor Platform Setup"
echo "=========================================="

echo
echo "[1/10] Checking privileges..."

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: Please run this script with sudo."
    exit 1
fi

echo "Running as root: OK"

echo
echo "[2/10] Checking Ubuntu..."

if [ ! -f /etc/os-release ]; then
    echo "ERROR: /etc/os-release not found."
    exit 1
fi

. /etc/os-release

echo "OS: ${PRETTY_NAME:-Unknown}"

if [ "${ID:-}" != "ubuntu" ]; then
    echo "WARNING: This script was designed for Ubuntu."
fi

echo
echo "[3/10] Installing required system packages..."

apt-get update

apt-get install -y \
    curl \
    ca-certificates \
    sqlite3 \
    openssl

echo "Required packages installed."

echo
echo "[4/10] Checking Node.js..."

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is not installed."
    echo "Install Node.js 20+ before running this script."
    exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node')"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

echo "Node.js version: ${NODE_VERSION}"

if [ "${NODE_MAJOR}" -lt 20 ]; then
    echo "ERROR: Node.js 20 or newer is required."
    exit 1
fi

echo "Node.js version requirement: OK"

echo
echo "[5/10] Checking npm..."

if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is not installed."
    exit 1
fi

echo "npm version: $(npm --version)"

echo
echo "[6/10] Checking project directory..."

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Creating project directory: $PROJECT_DIR"
    mkdir -p "$PROJECT_DIR"
fi

if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "ERROR: package.json not found in $PROJECT_DIR"
    echo "Clone the GitHub repository into $PROJECT_DIR before running this script."
    exit 1
fi

chown -R ubuntu:ubuntu "$PROJECT_DIR"

cd "$PROJECT_DIR"

echo "Project directory: $PROJECT_DIR"
echo "package.json: found"

echo
echo "[7/10] Installing Node.js dependencies..."

if [ ! -f package-lock.json ]; then
    echo "ERROR: package-lock.json not found."
    exit 1
fi

sudo -u ubuntu npm ci

echo "Node.js dependencies installed."

echo
echo "[8/10] Preparing runtime directories..."

mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/logs"

chown ubuntu:ubuntu "$PROJECT_DIR/data"
chown ubuntu:ubuntu "$PROJECT_DIR/logs"

echo "Runtime directories ready."

echo
echo "[9/10] Preparing environment template..."

if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        chown ubuntu:ubuntu "$PROJECT_DIR/.env"
        chmod 600 "$PROJECT_DIR/.env"
        echo ".env created from .env.example."
        echo "IMPORTANT: Set a real SESSION_SECRET before starting the application."
    else
        echo "WARNING: .env.example not found."
    fi
else
    echo ".env already exists. Existing environment file was preserved."
fi

echo
echo "[10/10] Verifying application database initialization..."

sudo -u ubuntu env NODE_ENV=production node -e "
require('./src/database');
console.log('Database initialization: OK');
"

if [ -f "$PROJECT_DIR/data/monitoring.db" ]; then
    chown ubuntu:ubuntu "$PROJECT_DIR/data/monitoring.db"
    chmod 600 "$PROJECT_DIR/data/monitoring.db"
    echo "SQLite database: $PROJECT_DIR/data/monitoring.db"
else
    echo "ERROR: monitoring.db was not created."
    exit 1
fi

echo
echo "=========================================="
echo "Setup completed successfully"
echo "=========================================="

echo
echo "Next steps:"
echo "1. Review .env"
echo "2. Set a strong SESSION_SECRET"
echo "3. Create an application user"
echo "4. Install/configure PM2"
echo "5. Install/configure Caddy"
echo "6. Start and verify the application"

echo
echo "IMPORTANT:"
echo "- This script does not configure production agents."
echo "- This script does not copy production databases."
echo "- This script does not install Caddy or PM2."
echo "- This script does not overwrite an existing .env."
echo
