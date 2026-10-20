#!/bin/bash
# ==============================================================================
# ELIZA INFOTECH CCTV CRM & ERP - AUTOMATED OFF-SITE BACKUP SYNC
# Infrastructure: Oracle Cloud Infrastructure (OCI) Always-Free VM
# Target: Oracle Object Storage (Bucket: eliza-erp-backups)
# Retention Policy: 30 Daily Snapshots, 12 Monthly Archives
# ==============================================================================

set -euo pipefail

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DAY=$(date +"%d")
BACKUP_DIR="/var/backups/eliza-erp"
SQL_FILE="${BACKUP_DIR}/eliza_db_${TIMESTAMP}.sql"
ENC_FILE="${SQL_FILE}.gpg"
OCI_BUCKET="eliza-erp-backups"
LOG_FILE="/var/log/eliza-backup.log"

echo "[$(date -Iseconds)] Initiating automated off-site database backup..." >> "${LOG_FILE}"

mkdir -p "${BACKUP_DIR}"

# 1. Execute pg_dump against Supabase Primary (SSL Required)
if ! PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
  -h "${SUPABASE_DB_HOST:-aws-0-ap-south-1.pooler.supabase.com}" \
  -p "${SUPABASE_DB_PORT:-5432}" \
  -U "${SUPABASE_DB_USER:-postgres.eliza_prod}" \
  -d postgres \
  --clean --if-exists --no-owner --no-privileges \
  -f "${SQL_FILE}"; then
  echo "[$(date -Iseconds)] ERROR: pg_dump execution failed!" >> "${LOG_FILE}"
  # Dispatch alert webhook
  curl -s -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 CRITICAL: Eliza ERP Database Backup Failed at ${TIMESTAMP}\"}" \
    "${ALERT_WEBHOOK_URL:-}" || true
  exit 1
fi

# 2. Encrypt with GPG (AES-256 Symmetric)
gpg --batch --yes --cipher-algo AES256 --passphrase "${BACKUP_ENCRYPTION_KEY}" \
  -c "${SQL_FILE}"

rm -f "${SQL_FILE}"

# 3. Upload to Oracle Object Storage via OCI CLI
if [ "${DATE_DAY}" -eq "01" ]; then
  DEST_PATH="monthly/eliza_db_${TIMESTAMP}.sql.gpg"
else
  DEST_PATH="daily/eliza_db_${TIMESTAMP}.sql.gpg"
fi

oci os object put --bucket-name "${OCI_BUCKET}" \
  --file "${ENC_FILE}" \
  --name "${DEST_PATH}" \
  --force >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Successfully uploaded ${DEST_PATH} to Oracle Cloud." >> "${LOG_FILE}"

# 4. Enforce Retention Policy: Remove local archives older than 7 days
find "${BACKUP_DIR}" -type f -name "*.gpg" -mtime +7 -delete

echo "[$(date -Iseconds)] Backup cycle completed cleanly." >> "${LOG_FILE}"
