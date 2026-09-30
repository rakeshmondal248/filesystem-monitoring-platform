# Filesystem Monitoring Platform

A Linux filesystem monitoring platform that collects filesystem usage and directory-level storage metrics from monitored EC2/Linux instances and presents them through a web dashboard.

## Overview

The platform is designed to monitor filesystem growth over time and provide:

* Filesystem capacity and utilization
* Historical filesystem usage
* 7-day and 14-day growth analysis
* Average daily growth
* Capacity prediction
* Filesystem health status
* Top storage contributors
* Multiple monitored instances
* User-based instance access
* Agent token authentication
* AWS EC2 instance identity verification
* Timezone-aware dashboard data

## Architecture

```text
Monitored Linux /u01
        |
        | agent.sh
        | HTTPS/HTTP API
        v
Central Server
        |
        v
Caddy
        |
        v
Node.js / Express
        |
        v
SQLite
        |
        v
Filesystem Intelligence Dashboard
```

The repository contains both the central monitoring platform and the packaged monitoring agent.

## Repository Structure

```text
filesystem-monitoring-platform/
├── agent/
│   ├── agent.sh
│   ├── agent.conf.example
│   ├── fs-monitor-agent.service
│   └── fs-monitor-agent.timer
│
├── database/
│   └── schema.sql
│
├── deploy/
│   ├── Caddyfile.example
│   └── setup-server.sh
│
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── troubleshooting.md
│
├── public/
│   ├── index.html
│   ├── login.html
│   ├── login.js
│   ├── dashboard.js
│   ├── add-instance.html
│   ├── add-instance.js
│   └── chart.js
│
├── src/
│   ├── auth.js
│   ├── create-user.js
│   ├── database.js
│   ├── intelligence.js
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

## Requirements

A deployment requires:

* Ubuntu/Linux server
* Node.js and npm
* SQLite
* Caddy or another reverse proxy
* A filesystem to monitor, such as `/u01`
* Network connectivity between the monitoring agent and central server

## Configuration

The repository intentionally does not contain production secrets.

Copy the environment template and configure it for the deployment:

```text
.env.example
```

The environment configuration includes:

* `PORT`
* `SESSION_SECRET`
* `DEFAULT_TIMEZONE`

The monitoring agent uses:

```text
agent/agent.conf.example
```

The agent configuration includes:

* `MONITOR_URL`
* `AGENT_TOKEN`
* `MOUNT_POINT`

Production credentials, tokens, databases, private keys, and runtime files must remain outside Git.

## Installation

Clone the repository:

```bash
git clone https://github.com/rakeshmondal248/filesystem-monitoring-platform.git
cd filesystem-monitoring-platform
```

Install Node.js dependencies:

```bash
npm ci
```

Further deployment and configuration instructions are available in:

```text
docs/deployment.md
```

## Database

The application uses SQLite for persistent monitoring data.

The database schema is provided in:

```text
database/schema.sql
```

Runtime database files are intentionally excluded from Git.

## Monitoring Agent

The packaged agent is located at:

```text
agent/agent.sh
```

Systemd service and timer templates are provided:

```text
agent/fs-monitor-agent.service
agent/fs-monitor-agent.timer
```

The agent collects filesystem and directory metrics and sends them to the central platform.

## Documentation

Detailed documentation:

* `docs/architecture.md` — system architecture and component relationships
* `docs/deployment.md` — deployment and configuration procedure
* `docs/troubleshooting.md` — common problems and troubleshooting procedures

## Security

This repository is public, but production secrets are not included.

The following types of files are excluded from Git:

* `.env`
* Agent configuration containing real tokens
* SQLite databases
* SQLite WAL/SHM files
* Backups
* Private keys
* Certificates
* `node_modules`
* Runtime logs

Before deploying, generate a new production session secret and configure real agent credentials outside the repository.

## License

No open-source license has been selected for this project yet.
