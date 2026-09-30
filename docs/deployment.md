# Filesystem Intelligence Monitoring Platform — Deployment Guide

## 1. Prerequisites

Required:

- Ubuntu 24.04 or newer
- sudo/root access
- Git
- Node.js 20+
- npm
- SQLite3
- Caddy
- PM2
- Network access

## 2. Clone Repository

Clone the repository:

sudo git clone <GITHUB_REPOSITORY_URL> /opt/fs-monitor-platform

Set ownership:

sudo chown -R ubuntu:ubuntu /opt/fs-monitor-platform

Enter the project:

cd /opt/fs-monitor-platform

## 3. Install Dependencies

Install exact dependencies:

npm ci

## 4. Configure Environment

Create the environment file:

cp .env.example .env

Edit:

nano .env

Required values:

PORT=3000
SESSION_SECRET=GENERATE_A_NEW_SECRET
DEFAULT_TIMEZONE=Asia/Kolkata

Generate a secret:

openssl rand -hex 32

Never commit .env.

## 5. Initialize Database

Create the database directory:

mkdir -p data

Initialize the schema:

sqlite3 data/monitoring.db < database/schema.sql

Verify:

sqlite3 data/monitoring.db ".tables"

Expected tables:

agent_tokens
directory_metrics
filesystem_metrics
instances
user_instances
users

## 6. Create Application User

Run:

node src/create-user.js <username> <password>

Example:

node src/create-user.js admin 'CHANGE_THIS_PASSWORD'

Use a strong production password.

## 7. Test Application

Start Node.js:

node src/server.js

From another terminal:

curl -s http://127.0.0.1:3000/api/health

Expected:

{"status":"ok"}

Stop the manual process with CTRL+C.

## 8. Configure PM2

Install PM2 if required:

sudo npm install -g pm2

Start:

pm2 start src/server.js --name fs-monitor-platform

Check:

pm2 status

Save:

pm2 save

Configure startup:

pm2 startup

Run the command printed by PM2.

Then:

pm2 save

## 9. Configure Caddy

Copy the template:

sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile

Validate:

sudo caddy validate --config /etc/caddy/Caddyfile

Restart:

sudo systemctl restart caddy

Check:

sudo systemctl status caddy

## 10. Verify Caddy

Run:

curl -I http://127.0.0.1/

Expected:

HTTP/1.1 200 OK

For an Elastic IP deployment:

curl -I http://<CENTRAL_ELASTIC_IP>/

## 11. Install Monitoring Agent

Create directory:

sudo mkdir -p /opt/fs-monitor-agent

Copy agent:

sudo cp agent/agent.sh /opt/fs-monitor-agent/agent.sh

Set permissions:

sudo chmod 750 /opt/fs-monitor-agent/agent.sh

Create configuration directory:

sudo mkdir -p /etc/fs-monitor-agent

Create configuration:

sudo nano /etc/fs-monitor-agent/agent.conf

Example:

MONITOR_URL=http://<CENTRAL_ELASTIC_IP>/api/agent/metrics
AGENT_TOKEN=<AGENT_TOKEN>
MOUNT_POINT=/u01

Never commit agent.conf.

## 12. Install Systemd Agent

Copy service:

sudo cp agent/fs-monitor-agent.service /etc/systemd/system/

Copy timer:

sudo cp agent/fs-monitor-agent.timer /etc/systemd/system/

Reload:

sudo systemctl daemon-reload

Enable timer:

sudo systemctl enable --now fs-monitor-agent.timer

Check:

systemctl status fs-monitor-agent.timer

Manual test:

sudo systemctl start fs-monitor-agent.service

Check logs:

sudo journalctl -u fs-monitor-agent.service -n 50 --no-pager

## 13. Multi-Instance Deployment

Each monitored EC2 instance requires:

- Monitoring agent
- Valid agent token
- Correct mount point
- Central monitoring URL
- Registered instance
- User-instance assignment

The central platform stores metrics using the corresponding EC2 instance ID.

## 14. Health Checks

Node.js:

curl -s http://127.0.0.1:3000/api/health

PM2:

pm2 status

Caddy:

sudo systemctl is-active caddy

Agent timer:

systemctl is-active fs-monitor-agent.timer

Database:

sqlite3 data/monitoring.db "PRAGMA integrity_check;"

Expected:

ok

## 15. Domainless Deployment

The current platform works without a domain.

Example:

http://15.252.35.3/

Caddy:

:80 {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}

Agent:

MONITOR_URL=http://15.252.35.3/api/agent/metrics

## 16. Future Domain Deployment

A domain can later be configured in Caddy.

Example:

monitor.example.com {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}

Caddy can then provide HTTPS certificates.

## 17. Production Rules

Never commit:

.env
agent/agent.conf
*.db
*.db-wal
*.db-shm
node_modules/
backup/
logs/
private keys

Never replace the production database with an empty database during application updates.

Always back up production data before modifying it.

## 18. Updating an Existing Deployment

cd /opt/fs-monitor-platform

git pull

npm ci

pm2 restart fs-monitor-platform

pm2 status

curl -s http://127.0.0.1:3000/api/health

sudo systemctl is-active caddy
