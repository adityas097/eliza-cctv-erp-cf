# Operations & Incident Response Runbook

**Eliza Infotech CCTV CRM & ERP System**  
*System Tier:* Mission Critical Field Operations & Fiscal ERP  
*Target Recovery Objectives:* **RPO <= 24 hours** | **RTO <= 4 hours**

---

## 1. System Incident Classification Matrix

| Severity Level | Definition | Response SLA | Action Required |
|---|---|---|---|
| **P1 - Critical** | Database down, login failure across all users, data corruption. | **< 30 mins** | Invoke rollback or trigger hot disaster recovery restore from Oracle backup. |
| **P2 - High** | Technician unable to submit sign-offs, quotation PDF generation failing. | **< 2 hours** | Inspect Supabase edge logs, verify storage permissions. |
| **P3 - Medium** | Non-critical integration (e.g. WhatsApp status alerts) offline. | **< 8 hours** | Verify API quota in Developer Tools -> Integrations Hub. |
| **P4 - Low** | Minor cosmetic glitch, typo, or non-blocking report sorting. | Next cycle | Queue in standard patch branch. |

---

## 2. Emergency Rollback Procedures

### Frontend Rollback (Cloudflare Pages)
If a faulty deployment reaches production:
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Compute (Pages)** -> `eliza-cctv-erp`.
2. Navigate to the **Deployments** tab.
3. Locate the previous verified deployment SHA (e.g., commit `cc7bb30` or `a77e08c`).
4. Click the three dots `...` next to that build and select **Rollback to this deployment**.
5. *Execution Time:* Under 30 seconds globally.

### Database Migration Rollback (Supabase)
All schema migrations are forward-compatible (expand/contract pattern). If a migration fails or breaks constraints:
1. Access the Supabase SQL Editor.
2. If restoring prior schema snapshot:
   ```sql
   -- Restore staging schema from automated point-in-time backup
   SELECT supabase_restore_snapshot('staging-pre-migration-snapshot');
   ```

---

## 3. Disaster Recovery (DR) Restore Drill Procedure

A monthly DR drill must be executed on the **1st Sunday of every month** into the **Staging Project**:

### Drill Step-by-Step
1. **Download Latest Snapshot:**
   Retrieve the latest encrypted database dump from the Oracle Object Storage bucket `eliza-erp-backups/daily/`.
2. **Decrypt Archive:**
   ```bash
   gpg --decrypt --output eliza_backup_restore.sql eliza_backup_YYYY-MM-DD.sql.gpg
   ```
3. **Restore into Staging Project:**
   ```bash
   psql -h aws-0-ap-south-1.pooler.supabase.com -p 5432 -d postgres -U postgres.staging -f eliza_backup_restore.sql
   ```
4. **Validation Smoke Tests:**
   - Execute verification query:
     ```sql
     SELECT COUNT(*) FROM jobs;
     SELECT COUNT(*) FROM ledger;
     SELECT COUNT(*) FROM people WHERE role = 'Super Admin';
     ```
   - Verify technician payout isolation under RLS.
5. **Log Drill Completion:**
   Record timestamp, operator name, duration, and table row counts in the DR Audit Ledger in `docs/RUNBOOK.md`.

---

## 4. Secret & Credential Rotation Runbook

If a service key or OAuth secret is suspected of exposure:
1. **Google OAuth Client Secret:**
   - Go to Google Cloud Console -> APIs & Services -> Credentials.
   - Click your OAuth Client -> Generate New Secret.
   - Open Developer Tools in the ERP -> Integrations -> Google SSO -> Paste new secret (masked immediately).
   - Delete old secret in Google Cloud Console.
2. **Supabase Anon / Service Keys:**
   - Go to Supabase Project Settings -> API.
   - Click **Generate New API Keys**.
   - Update Cloudflare Pages Environment Variables with new publishable key and redeploy.

---

## 5. Routine Maintenance Schedule

| Cadence | Task | Owner |
|---|---|---|
| **Daily (02:00 IST)** | Automated DB snapshot & Oracle Object Storage replication. | Automated Cron |
| **Weekly (Monday)** | Review Redacted Security Logs in Developer Tools. | Super Admin |
| **Monthly (1st Sun)** | Staging database restore drill & key rotation review. | Super Admin |
| **Quarterly** | `npm audit` dependency review & Dependabot updates. | Technical Lead |
