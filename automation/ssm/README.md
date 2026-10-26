# Task 17 - SSM Agent Deployment Automation

## Overview

Task 17 extends the existing Linux Filesystem Growth Monitoring and Intelligence Platform with reusable AWS Systems Manager (SSM) automation for deploying the filesystem monitoring agent to EC2 instances.

This automation is part of the existing project, not a separate application.

## Deployment Script

Script: `install-agent.sh`

Location: `automation/ssm/install-agent.sh`

The installer:

1. Checks required commands and the configured filesystem mount point.
2. Retrieves the EC2 instance ID and AWS Region using IMDSv2.
3. Validates the monitoring URL and agent token supplied through environment variables.
4. Creates the installation and configuration directories.
5. Writes the agent configuration with restricted file permissions.
6. Installs the filesystem metrics collection script.
7. Creates a systemd service and timer.
8. Enables and starts the systemd timer.

## Prerequisites

- An EC2 Linux instance with the required filesystem mounted, normally at `/u01`.
- AWS Systems Manager Agent installed and the instance managed by Systems Manager.
- Appropriate IAM permissions for the deployment workflow.
- `curl`, `systemctl`, and `sudo` available on the target instance.
- A valid monitoring endpoint and authorized agent token.

## Configuration

The installer expects these environment variables:

- `MONITOR_URL` - monitoring API endpoint.
- `AGENT_TOKEN` - authorized agent authentication token.
- `MOUNT_POINT` - filesystem mount point; defaults to `/u01`.

Supply configuration values securely. Never commit real tokens, credentials, private keys, or sensitive backups to GitHub.

## Monitoring Workflow

The installed agent collects filesystem capacity and usage metrics and measures top-level directory usage. It sends the metrics to the central monitoring platform through the agent metrics API.

The systemd timer schedules recurring collection approximately every minute. SSM is used for deployment and management; it is not required for every scheduled collection.

## Verification

Run these commands on the target EC2 instance after deployment:

```bash
sudo systemctl status fs-monitor-agent.timer --no-pager
sudo systemctl list-timers fs-monitor-agent.timer
sudo systemctl status fs-monitor-agent.service --no-pager
```

Check the central dashboard to confirm that the target instance is registered and its metrics are updating.

## Security Notes

- Keep the agent configuration file restricted to root access.
- Never publish actual agent tokens, AWS credentials, or private keys.
- Grant only the IAM permissions required for deployment and secure configuration retrieval.
- Verify that the target instance is managed by SSM before deployment.

## Project Structure

```text
automation/
└── ssm/
    ├── install-agent.sh
    └── README.md
```

This automation extends the existing Filesystem Growth Monitoring and Intelligence Platform.
