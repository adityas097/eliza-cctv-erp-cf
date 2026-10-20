// Phase 7: Production Readiness Test Suite
import { describe, it, expect } from 'vitest';
import { errorHandler } from '../src/services/errorHandler.js';
import fs from 'fs';
import path from 'path';

describe('Phase 7: Production Readiness & Observability Suite', () => {
  describe('1. Global Error Boundary & Observability', () => {
    it('captures runtime exceptions with unique correlation IDs and PII redaction', () => {
      const sensitiveContext = {
        email: 'client@company.com',
        apiKey: 'sk_live_verysecret12345',
        action: 'INVOICE_GENERATION'
      };

      const refId = errorHandler.captureException(new Error('Database timeout simulation'), sensitiveContext);
      expect(refId).toMatch(/^err_/);

      const logs = errorHandler.getRecentLogs();
      const recent = logs.find(l => l.id === refId);
      expect(recent).toBeDefined();
      expect(recent.message).toBe('Database timeout simulation');
      // PII check: secrets must be redacted
      expect(recent.context.apiKey).toBe('[REDACTED]');
    });
  });

  describe('2. SEO & Robots Protection', () => {
    it('enforces noindex, nofollow on authenticated ERP index.html', () => {
      const indexPath = path.resolve(__dirname, '../index.html');
      const html = fs.readFileSync(indexPath, 'utf-8');
      expect(html).toContain('meta name="robots" content="noindex, nofollow"');
    });
  });

  describe('3. Core Technical Documentation Suite', () => {
    it('verifies existence and structure of production architecture, security, and runbook docs', () => {
      const archPath = path.resolve(__dirname, '../docs/ARCHITECTURE.md');
      const runbookPath = path.resolve(__dirname, '../docs/RUNBOOK.md');
      const secPath = path.resolve(__dirname, '../docs/SECURITY.md');
      const readmePath = path.resolve(__dirname, '../README.md');

      expect(fs.existsSync(archPath)).toBe(true);
      expect(fs.existsSync(runbookPath)).toBe(true);
      expect(fs.existsSync(secPath)).toBe(true);
      expect(fs.existsSync(readmePath)).toBe(true);

      const runbook = fs.readFileSync(runbookPath, 'utf-8');
      expect(runbook).toContain('RPO <= 24 hours');
      expect(runbook).toContain('RTO <= 4 hours');
      expect(runbook).toContain('Disaster Recovery (DR) Restore Drill');

      const sec = fs.readFileSync(secPath, 'utf-8');
      expect(sec).toContain('Row-Level Security');
      expect(sec).toContain('DPDP');
    });
  });
});
