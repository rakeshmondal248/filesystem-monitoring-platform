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

FILESYSTEM_JSON=$(cat <<EOF
{
  "mount": "$MOUNT_POINT",
  "usedBytes": $USED,
  "capacityBytes": $CAPACITY,
  "freeBytes": $FREE,
  "usagePercent": $USE_PERCENT
}
EOF
)

DIRECTORIES=""

while read -r SIZE DIR_PATH; do

    if [ -z "$SIZE" ]; then
        continue
    fi

    SIZE=${SIZE//,/}

    ITEM=$(cat <<EOF
{
  "mount": "$MOUNT_POINT",
  "path": "$DIR_PATH",
  "usedBytes": $SIZE
}
EOF
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

PAYLOAD=$(cat <<EOF
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
EOF
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
