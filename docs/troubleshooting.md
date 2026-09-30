# Filesystem Intelligence Monitoring Platform — Troubleshooting

## 1. Dashboard Does Not Open

Check Caddy:

sudo systemctl status caddy

Check PM2:

pm2 status

Check Node.js:

curl -s http://127.0.0.1:3000/api/health

Check Caddy response:

curl -I http://127.0.0.1/

If required:

sudo systemctl restart caddy

## 2. PM2 Application Is Offline

Check:

pm2 status

Logs:

pm2 logs fs-monitor-platform --lines 100

Restart:

pm2 restart fs-monitor-platform

Health:

curl -s http://127.0.0.1:3000/api/health

## 3. Database Problems

Check tables:

sqlite3 data/monitoring.db ".tables"

Check integrity:

sqlite3 data/monitoring.db "PRAGMA integrity_check;"

Expected:

ok

Never delete the production database as a troubleshooting step.

## 4. Agent Is Not Sending Metrics

Check timer:

systemctl status fs-monitor-agent.timer

Check service:

systemctl status fs-monitor-agent.service

Check logs:

sudo journalctl -u fs-monitor-agent.service -n 100 --no-pager

Run manually:

sudo systemctl start fs-monitor-agent.service

Then:

sudo journalctl -u fs-monitor-agent.service -n 30 --no-pager

## 5. Agent Configuration Problem

The configuration file is:

/etc/fs-monitor-agent/agent.conf

It contains:

MONITOR_URL
AGENT_TOKEN
MOUNT_POINT

Do not print the file contents because it contains a secret token.

## 6. Agent Timer Shows Inactive

The agent service is a oneshot service.

Therefore:

inactive (dead)

after a successful execution can be normal.

The timer should be active:

systemctl is-active fs-monitor-agent.timer

Expected:

active

## 7. Instance Shows Offline

Check:

systemctl is-active fs-monitor-agent.timer

Check:

sudo journalctl -u fs-monitor-agent.service -n 50 --no-pager

Check network connectivity to the central API.

## 8. Dashboard Shows No Historical Data

Check metrics:

sqlite3 data/monitoring.db \
"SELECT instance_id, COUNT(*) FROM filesystem_metrics GROUP BY instance_id;"

Check recent metrics:

sqlite3 data/monitoring.db \
"SELECT instance_id, collected_at, mount, usage_percent FROM filesystem_metrics ORDER BY collected_at DESC LIMIT 10;"

Do not delete historical data to fix a dashboard issue.

## 9. 7-Day or 14-Day Growth Shows Insufficient History

This can be expected.

The intelligence engine requires enough historical data for the requested period.

Less than 7 days of data can make 7-day growth unavailable.

Less than 14 days of data can make 14-day growth unavailable.

Continue collecting metrics.

## 10. Capacity Prediction Is Unavailable

Capacity prediction requires historical growth data.

If there is insufficient historical growth or positive growth cannot be calculated, prediction may be unavailable.

## 11. Filesystem Health Shows CRITICAL

Filesystem health is based on filesystem utilization.

First verify:

df -h /u01

Do not modify health thresholds simply to make a demonstration look better.

## 12. Caddy Configuration Error

Validate:

sudo caddy validate --config /etc/caddy/Caddyfile

Restart:

sudo systemctl restart caddy

Check:

sudo systemctl status caddy

## 13. Port 3000 Problem

Check:

pm2 status

Check listening port:

sudo ss -lntp | grep 3000

The application normally listens on:

127.0.0.1:3000

Caddy proxies requests to Node.js.

## 14. Security Rules

Never print:

.env
agent.conf
session secrets
agent tokens
private keys

Never commit secrets to Git.

Never delete the production database to resolve an application problem.

Always inspect logs and health endpoints first.

## 15. Quick Health Check

Run:

pm2 status

curl -s http://127.0.0.1:3000/api/health

sudo systemctl is-active caddy

systemctl is-active fs-monitor-agent.timer

sqlite3 data/monitoring.db "PRAGMA integrity_check;"
