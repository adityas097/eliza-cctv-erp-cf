// Phase 9: CI/CD & Deployment Test Suite
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 9: CI/CD Pipeline & Deployment Infrastructure', () => {
  const workflowPath = path.resolve(__dirname, '../.github/workflows/ci-deploy.yml');
  const headersPath = path.resolve(__dirname, '../public/_headers');
  const routesPath = path.resolve(__dirname, '../public/_routes.json');
  const htaccessPath = path.resolve(__dirname, '../public/.htaccess');

  it('validates CI/CD workflow security gates and deployment targets', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflow = fs.readFileSync(workflowPath, 'utf-8');

    // Security & audit checks
    expect(workflow).toContain('npm run security:audit');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run build');

    // Staging and Production segregation
    expect(workflow).toContain('deploy-staging');
    expect(workflow).toContain('deploy-production');
    expect(workflow).toContain('cloudflare/pages-action');
    expect(workflow).toContain('supabase db push');
  });

  it('verifies Cloudflare Pages routing and security headers', () => {
    expect(fs.existsSync(headersPath)).toBe(true);
    expect(fs.existsSync(routesPath)).toBe(true);
    expect(fs.existsSync(htaccessPath)).toBe(true);

    const headers = fs.readFileSync(headersPath, 'utf-8');
    expect(headers).toContain('Content-Security-Policy');
    expect(headers).toContain('Strict-Transport-Security');
    expect(headers).toContain('X-Frame-Options: DENY');

    const routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
    expect(routes.version).toBe(1);
    expect(routes.include).toContain('/*');
    expect(routes.exclude).toContain('/assets/*');

    const htaccess = fs.readFileSync(htaccessPath, 'utf-8');
    expect(htaccess).toContain('RewriteEngine On');
    expect(htaccess).toContain('index.html');
  });
});
