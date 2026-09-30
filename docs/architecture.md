# Filesystem Intelligence Monitoring Platform — Architecture

## 1. Overview

The Filesystem Intelligence Monitoring Platform is a Linux filesystem monitoring system designed to collect filesystem usage data from monitored EC2 instances and present the data through a centralized web dashboard.

The platform supports:

- Multiple monitored EC2 instances
- Filesystem capacity monitoring
- Filesystem utilization monitoring
- Directory-level storage analysis
- Historical filesystem metrics
- 7-day and 14-day growth analysis
- Average daily growth calculation
- Capacity prediction
- Filesystem health status
- User authentication
- Instance-level access control
- Agent token authentication
- IMDSv2-based EC2 identity verification
- Timezone-aware dashboard display

## 2. High-Level Architecture

User / Administrator
        |
        v
Web Browser / Chrome
        |
        v
Central EC2 Elastic IP / Domain
        |
        v
Caddy
        |
        v
Node.js / Express
        |
        v
SQLite Database
        |
        v
Historical Metrics / Intelligence

## 3. Monitored EC2 Architecture

Each monitored EC2 instance runs a filesystem monitoring agent.

Monitored EC2
    |
    +-- IMDSv2
    |      |
    |      +-- Instance ID
    |      +-- Region
    |
    +-- fs-monitor-agent
           |
           +-- df filesystem metrics
           |
           +-- du directory metrics
           |
           +-- Authenticated API request
                    |
                    v
             Central Platform

## 4. Central Application Components

### Node.js / Express

Location:

src/server.js

Responsibilities:

- HTTP server
- Authentication routes
- Dashboard APIs
- Agent metrics API
- Instance management
- Historical data APIs
- Intelligence APIs
- Security middleware

### Authentication

Location:

src/auth.js

Responsibilities:

- Password hashing
- Password verification
- Application user creation
- Agent token generation
- Agent token hashing

Passwords are stored using bcrypt hashes.

Agent tokens are stored as SHA-256 hashes.

### Database

Location:

src/database.js

Runtime database:

data/monitoring.db

Repository schema:

database/schema.sql

The database stores:

- Users
- Instances
- Agent tokens
- User-instance relationships
- Filesystem metrics
- Directory metrics

The production SQLite database is intentionally excluded from Git.

### Intelligence Engine

Location:

src/intelligence.js

Responsibilities:

- Growth calculation
- 7-day growth
- 14-day growth
- Average daily growth
- Directory growth
- Capacity prediction
- Filesystem health calculation

## 5. Frontend

Frontend files:

public/

Main files:

public/index.html
public/dashboard.js
public/chart.js
public/login.html
public/login.js
public/add-instance.html
public/add-instance.js

The dashboard provides:

- Instance selection
- Timezone selection
- Current capacity
- Current usage
- Utilization percentage
- Agent status
- Last collection time
- Growth statistics
- Storage utilization trend
- Capacity prediction
- Filesystem health
- Top storage contributors

## 6. Reverse Proxy

Caddy is used as the reverse proxy.

Current domainless configuration:

:80 {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}

Caddy accepts HTTP traffic and forwards requests to the Node.js application.

## 7. Process Management

PM2 manages the Node.js application.

Application name:

fs-monitor-platform

Application entry point:

src/server.js

PM2 provides:

- Application process management
- Restart support
- Process monitoring
- Startup persistence

## 8. Agent Scheduling

The monitoring agent is executed by systemd.

Service:

fs-monitor-agent.service

Timer:

fs-monitor-agent.timer

The timer executes the agent approximately every minute.

## 9. Data Flow

1. Agent starts
2. Agent reads /etc/fs-monitor-agent/agent.conf
3. Agent requests EC2 metadata using IMDSv2
4. Agent gets instance ID and region
5. Agent reads filesystem information
6. Agent reads directory usage
7. Agent builds JSON payload
8. Agent sends authenticated request
9. Central API validates the agent token
10. Central API verifies EC2 identity
11. Metrics are stored in SQLite
12. Dashboard requests current and historical data
13. Intelligence calculations are performed
14. Dashboard renders the results

## 10. Security Model

The platform uses:

- Password hashing using bcrypt
- Session-based authentication
- Agent token authentication
- SHA-256 token storage
- IMDSv2 instance identity verification
- Helmet security headers
- Rate limiting
- Content Security Policy
- Same-origin protections
- Secrets stored outside Git
- Production database excluded from Git

## 11. Repository vs Runtime Data

Repository files:

src/
public/
agent/
deploy/
database/
docs/
package.json
package-lock.json
.env.example
.gitignore

Runtime-only files:

.env
data/*.db
data/*.db-wal
data/*.db-shm
agent/agent.conf
node_modules/
backup/
logs/

Runtime data must not be committed to GitHub.

## 12. Current Deployment Model

The platform currently runs without a domain.

Current dashboard:

http://15.252.35.3/

The current Caddy configuration listens on port 80 and proxies requests to Node.js on 127.0.0.1:3000.

A domain can be added later without changing the core monitoring architecture.
