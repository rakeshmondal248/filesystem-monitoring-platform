#!/bin/bash

set -euo pipefail

INSTALL_DIR="/opt/fs-monitor-agent"
CONFIG_DIR="/etc/fs-monitor-agent"
CONFIG_FILE="${CONFIG_DIR}/agent.conf"

echo "=============================================="
echo "TASK 17 - Filesystem Monitor Agent Deployment"
echo "=============================================="

echo "[1/8] Checking required commands..."

command -v curl >/dev/null 2>&1 || {
    echo "ERROR: curl is not installed"
    exit 1
}

command -v systemctl >/dev/null 2>&1 || {
    echo "ERROR: systemctl is not available"
    exit 1
}

echo "Required commands available."

echo "[2/8] Checking filesystem..."

MOUNT_POINT="${MOUNT_POINT:-/u01}"

if [ ! -d "$MOUNT_POINT" ]; then
    echo "ERROR: Mount point does not exist: $MOUNT_POINT"
    exit 1
fi

echo "Mount point: $MOUNT_POINT"

echo "[3/8] Checking EC2 identity..."

IMDS_TOKEN=$(
    curl -sS \
    --fail \
    -X PUT \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" \
    http://169.254.169.254/latest/api/token
)

INSTANCE_ID=$(
    curl -sS \
    --fail \
    -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-id
)

REGION=$(
    curl -sS \
    --fail \
    -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
    http://169.254.169.254/latest/meta-data/placement/region
)

if [ -z "$INSTANCE_ID" ]; then
    echo "ERROR: Could not determine EC2 instance ID"
    exit 1
fi

if [ -z "$REGION" ]; then
    echo "ERROR: Could not determine AWS region"
    exit 1
fi

echo "Instance ID: $INSTANCE_ID"
echo "Region: $REGION"

echo "[4/8] Checking deployment parameters..."

if [ -z "${MONITOR_URL:-}" ]; then
    echo "ERROR: MONITOR_URL is not configured"
    exit 1
fi

if [ -z "${AGENT_TOKEN:-}" ]; then
    echo "ERROR: AGENT_TOKEN is not configured"
    exit 1
fi

echo "Monitoring URL configured."
echo "Agent token configured."

echo "[5/8] Creating directories..."

sudo mkdir -p "$INSTALL_DIR"
sudo mkdir -p "$CONFIG_DIR"

echo "[6/8] Writing agent configuration..."

sudo tee "$CONFIG_FILE" >/dev/null <<CONFIG
MONITOR_URL=${MONITOR_URL}
AGENT_TOKEN=${AGENT_TOKEN}
MOUNT_POINT=${MOUNT_POINT}
CONFIG

sudo chown root:root "$CONFIG_FILE"
sudo chmod 600 "$CONFIG_FILE"

echo "Configuration created."

echo "[7/8] Creating agent..."

sudo tee "${INSTALL_DIR}/agent.sh" >/dev/null <<'AGENT'
#!/bin/bash

set -euo pipefail

CONFIG="/etc/fs-monitor-agent/agent.conf"

source "$CONFIG"

TOKEN=$(curl -sS -X PUT \
"http://169.254.169.254/latest/api/token" \
-H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

INSTANCE_ID=$(curl -sS \
-H "X-aws-ec2-metadata-token: $TOKEN" \
"http://169.254.169.254/latest/meta-data/instance-id")

REGION=$(curl -sS \
-H "X-aws-ec2-metadata-token: $TOKEN" \
"http://169.254.169.254/latest/meta-data/placement/region")

HOSTNAME=$(hostname)

DF_LINE=$(df -B1 "$MOUNT_POINT" | tail -1)

CAPACITY=$(echo "$DF_LINE" | awk '{print $2}')
USED=$(echo "$DF_LINE" | awk '{print $3}')
FREE=$(echo "$DF_LINE" | awk '{print $4}')
USE_PERCENT=$(echo "$DF_LINE" | awk '{print $5}' | tr -d '%')

FILESYSTEM_JSON=$(cat <<JSON
{
  "mount": "$MOUNT_POINT",
  "usedBytes": $USED,
  "capacityBytes": $CAPACITY,
  "freeBytes": $FREE,
  "usagePercent": $USE_PERCENT
}
JSON
)

DIRECTORIES=""

while read -r SIZE DIR_PATH; do

    if [ -z "$SIZE" ]; then
        continue
    fi

    SIZE=${SIZE//,/}

    ITEM=$(cat <<JSON
{
  "mount": "$MOUNT_POINT",
  "path": "$DIR_PATH",
  "usedBytes": $SIZE
}
JSON
)

    if [ -z "$DIRECTORIES" ]; then
        DIRECTORIES="$ITEM"
    else
        DIRECTORIES="$DIRECTORIES,$ITEM"
    fi

done < <(
    sudo du -x -B1 -d 1 "$MOUNT_POINT" 2>/dev/null |
    sort -nr |
    head -20 |
    awk '{print $1, substr($0,index($0,$2))}'
)

PAYLOAD=$(cat <<JSON
{
  "instanceId": "$INSTANCE_ID",
  "region": "$REGION",
  "hostname": "$HOSTNAME",
  "filesystems": [
    $FILESYSTEM_JSON
  ],
  "directories": [
    $DIRECTORIES
  ]
}
JSON
)

curl \
--fail \
--silent \
--show-error \
--retry 3 \
--connect-timeout 10 \
--max-time 30 \
-X POST \
-H "Authorization: Bearer $AGENT_TOKEN" \
-H "Content-Type: application/json" \
-d "$PAYLOAD" \
"$MONITOR_URL"

echo
echo "Metrics sent successfully: $(date -Is)"
AGENT

sudo chown root:root "${INSTALL_DIR}/agent.sh"
sudo chmod 750 "${INSTALL_DIR}/agent.sh"

echo "[8/8] Creating systemd service and timer..."

sudo tee /etc/systemd/system/fs-monitor-agent.service >/dev/null <<SERVICE
[Unit]
Description=Filesystem Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/fs-monitor-agent/agent.sh
User=root

SERVICE

sudo tee /etc/systemd/system/fs-monitor-agent.timer >/dev/null <<TIMER
[Unit]
Description=Run Filesystem Monitoring Agent Every Minute

[Timer]
OnBootSec=30
OnUnitActiveSec=60
Unit=fs-monitor-agent.service

[Install]
WantedBy=timers.target
TIMER

sudo systemctl daemon-reload
sudo systemctl enable fs-monitor-agent.timer
sudo systemctl start fs-monitor-agent.timer

echo "=============================================="
echo "TASK 17 deployment completed"
echo "=============================================="

echo "Instance ID : $INSTANCE_ID"
echo "Region      : $REGION"
echo "Mount Point : $MOUNT_POINT"

sudo systemctl status fs-monitor-agent.timer --no-pager
