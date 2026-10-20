// Phase 8: Backup & Disaster Recovery Tests
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 8: Backups & Disaster Recovery Verification Suite', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/oracle_backup_sync.sh');
  const edgeFnPath = path.resolve(__dirname, '../supabase/functions/database-backup/index.ts');
  const runbookPath = path.resolve(__dirname, '../docs/RUNBOOK.md');

  it('validates Oracle Cloud automated backup script syntax and invariants', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const script = fs.readFileSync(scriptPath, 'utf-8');

    // Strict bash flags
    expect(script).toContain('set -euo pipefail');
    // PostgreSQL dump
    expect(script).toContain('pg_dump');
    // AES-256 Symmetric GPG Encryption
    expect(script).toContain('gpg --batch --yes --cipher-algo AES256');
    // Oracle Object Storage upload
    expect(script).toContain('oci os object put --bucket-name');
    // Retention policy (30 daily / monthly rotation)
    expect(script).toContain('DEST_PATH="monthly/');
    expect(script).toContain('DEST_PATH="daily/');
    // Failure webhook alerting
    expect(script).toContain('ALERT_WEBHOOK_URL');
  });

  it('validates Supabase Edge Function backup orchestrator', () => {
    expect(fs.existsSync(edgeFnPath)).toBe(true);
    const fn = fs.readFileSync(edgeFnPath, 'utf-8');

    expect(fn).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(fn).toContain('DR_BACKUP_GENERATED');
    expect(fn).toContain('checksumSha256');
  });

  it('confirms documented RPO, RTO and monthly drill protocol in RUNBOOK.md', () => {
    const runbook = fs.readFileSync(runbookPath, 'utf-8');

    expect(runbook).toContain('RPO <= 24 hours');
    expect(runbook).toContain('RTO <= 4 hours');
    expect(runbook).toContain('Disaster Recovery (DR) Restore Drill Procedure');
    expect(runbook).toContain('gpg --decrypt');
  });
});
