#!/bin/bash

set -e

PROJECT_DIR="/opt/fs-monitor-platform"

echo "=========================================="
echo "Filesystem Monitor Platform Setup"
echo "=========================================="

echo
echo "[1/8] Checking Ubuntu..."
if [ "$(id -u)" -ne 0 ]; then
    echo "Please run this script with sudo."
    exit 1
fi

echo
echo "[2/8] Installing required packages..."
apt-get update
apt-get install -y curl ca-certificates sqlite3

echo
echo "[3/8] Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed."
    echo "Install Node.js 20+ before continuing."
    exit 1
fi

echo "Node.js version:"
node --version

echo
echo "[4/8] Checking npm..."
if ! command -v npm >/dev/null 2>&1; then
    echo "npm is not installed."
    exit 1
fi

echo "npm version:"
npm --version

echo
echo "[5/8] Preparing project directory..."
mkdir -p "$PROJECT_DIR"
chown -R ubuntu:ubuntu "$PROJECT_DIR"

echo
echo "[6/8] Installing Node.js dependencies..."
cd "$PROJECT_DIR"

if [ ! -f package.json ]; then
    echo "ERROR: package.json not found."
    exit 1
fi

npm ci

echo
echo "[7/8] Preparing runtime directories..."
mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/logs"

chown -R ubuntu:ubuntu "$PROJECT_DIR/data"
chown -R ubuntu:ubuntu "$PROJECT_DIR/logs"

echo
echo "[8/8] Setup completed."
echo
echo "Next steps:"
echo "1. Create .env from .env.example"
echo "2. Configure SESSION_SECRET"
echo "3. Initialize the database"
echo "4. Create the first application user"
echo "5. Configure PM2"
echo "6. Configure Caddy"
echo
echo "=========================================="
echo "Setup completed successfully"
echo "=========================================="
