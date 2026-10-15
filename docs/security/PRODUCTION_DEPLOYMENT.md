# AeroPark Smart Parking: Production Deployment & Hardening Guide

This document outlines the security architecture and deployment requirements for operating the Smart Parking Backend API, Admin Web App, and Kiosk displays in production.

---

## 1. Network Topology & VPC Security Groups

A multi-tier VPC configuration is required to isolate database services from public accessibility.

```
                    Internet (HTTPS 443)
                            │
                            ▼
              ┌───────────────────────────┐
              │   Public Subnet (ALB/DMZ) │
              │   Nginx Ingress Proxy     │
              └─────────────┬─────────────┘
                            │ (Port 3000)
                            ▼
              ┌───────────────────────────┐
              │   Private App Subnet      │
              │   Node.js / Express API   │
              └─────────────┬─────────────┘
                            │ (Port 5432)
                            ▼
              ┌───────────────────────────┐
              │   Isolated DB Subnet      │
              │   AWS RDS PostgreSQL      │
              └───────────────────────────┘
```

### Security Group Ingress / Egress Matrix

| Tier | Security Group | Inbound Rules | Outbound Rules |
| :--- | :--- | :--- | :--- |
| **Ingress (Nginx/ALB)** | `sg-smartparking-alb` | `0.0.0.0/0:443 (HTTPS)`<br>`0.0.0.0/0:80 (HTTP -> 301)` | `sg-smartparking-app:3000` |
| **Backend API** | `sg-smartparking-app` | `sg-smartparking-alb:3000` | `sg-smartparking-db:5432`<br>`HTTPS (Outbound for OS updates / S3 backups)` |
| **PostgreSQL RDS** | `sg-smartparking-db` | `sg-smartparking-app:5432` | `None` (Completely isolated) |

> **Critical Rule:** The PostgreSQL instance must have `Publicly Accessible: No` enabled in AWS RDS. Direct access from developer workstations must be brokered via an encrypted bastion / AWS Systems Manager (SSM) Session Manager tunnel.

---

## 2. Nginx Reverse Proxy Configuration

Nginx acts as the TLS termination point, sanitizes forwarded headers, sets strict Content Security Policy (CSP) headers, and proxies requests to Express.

```nginx
# /etc/nginx/sites-available/smartparking.conf

# Upstream Node.js API server
upstream api_cluster {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.smartparking.aero admin.smartparking.aero;
    return 301 https://$host$request_uri;
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.smartparking.aero;

    # TLS Certificates & Cipher Hardening
    ssl_certificate /etc/letsencrypt/live/api.smartparking.aero/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.smartparking.aero/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'; base-uri 'none';" always;

    # Request Body Size Limitation (matches Express 100kb limit)
    client_max_body_size 100k;
    client_body_buffer_size 100k;

    # Timeouts
    client_body_timeout 10s;
    client_header_timeout 10s;
    keepalive_timeout 65s;
    send_timeout 10s;

    # Proxy to Node API
    location / {
        proxy_pass http://api_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Real IP Forwarding (enables trust proxy 1 in Express)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if enabled)
        proxy_set_header Upgrade $http_upgrade;

        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

---

## 3. Least-Privilege Database Users (AWS RDS)

Do not connect the Node.js application using the `postgres` superuser. Create a dedicated application user with restricted privileges:

```sql
-- 1. Create limited application user
CREATE USER smartparking_app WITH PASSWORD '<STRONG_SECURE_PASSWORD>';

-- 2. Grant connection and schema usage
GRANT CONNECT ON DATABASE smart_parking TO smartparking_app;
\c smart_parking;
GRANT USAGE ON SCHEMA public TO smartparking_app;

-- 3. Grant DML only (No DROP, ALTER, TRUNCATE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smartparking_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO smartparking_app;

-- 4. Ensure future tables also inherit these privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO smartparking_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO smartparking_app;
```

---

## 4. Automated Database Backups & Point-In-Time Recovery (PITR)

### 4.1 RDS Native Backups
* **Backup Retention:** Enable Automated Backups on AWS RDS with a **30-day retention period**.
* **PITR Window:** Enables restoring the database to any millisecond within the past 30 days.
* **Storage Encryption:** Enabled with an AWS KMS Customer Managed Key (CMK).

### 4.2 Nightly Encrypted Cold Backup Script (Off-Cloud Retention)

Deploy this cron task on an admin worker host to store daily logical dumps in an immutable S3 bucket with Object Lock:

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/smartparking"
DUMP_FILE="${BACKUP_DIR}/smartparking_${TIMESTAMP}.dump"
S3_BUCKET="s3://aeropark-immutable-backups/postgres"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting logical database backup..."
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -U "smartparking_app" \
  -d "smart_parking" \
  -F c \
  -b \
  -v \
  -f "${DUMP_FILE}"

echo "[$(date)] Encrypting and uploading to S3..."
aws s3 cp "${DUMP_FILE}" "${S3_BUCKET}/smartparking_${TIMESTAMP}.dump" \
  --sse aws:kms \
  --sse-kms-key-id "alias/smartparking-backup-key"

echo "[$(date)] Removing local temporary dump..."
rm -f "${DUMP_FILE}"
echo "[$(date)] Backup completed successfully."
```

---

## 5. Environment Variables & Secret Management

All secrets must be injected into the production environment via AWS Secrets Manager or HashiCorp Vault. Never commit `.env` to source control.

| Variable | Description | Security Requirements |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Uses `smartparking_app` role; SSL mode required (`sslmode=require`) |
| `JWT_SECRET` | Secret key for access token signing | Minimum 32 random characters (64+ recommended) |
| `MFA_ENC_KEY` | AES-256-GCM secret for MFA TOTP seeds | Exactly 64 hex characters (32 bytes) |
| `CORS_ALLOWED_ORIGINS` | Allowlist of trusted web domains | Comma-separated HTTPS URLs (e.g., `https://admin.smartparking.aero`) |
| `APK_DOWNLOAD_SECRET_PATH` | Obfuscated route for operator APK | Must begin with `/` followed by random UUID slug (e.g., `/distribution/9d4f8e7a6b5c4123-operator.apk`) |
| `NODE_ENV` | Runtime environment | Set to `production` (enables error masking, strict rate limiting) |
| `PORT` | API listen port | Set to `3000` (internal reverse-proxy port) |

---

## 6. Incident Response & Monitoring

1. **Incident Correlation:** Every 500 error logged by `src/middleware/errorHandler.ts` emits an `incidentId` (UUID v4).
2. **CloudWatch / Datadog Query:** Filter logs by `[error][<incidentId>]` to immediately pinpoint root cause without exposing stack traces to end users.
3. **Alerting Thresholds:**
   * Sustained `429 Too Many Requests` $> 50/\text{min}$ indicates potential brute force / DDoS.
   * `401 Unauthorized` rate spikes indicate mass session invalidation or token tampering.
