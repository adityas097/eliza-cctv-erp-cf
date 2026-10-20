// Developer Tools & Integrations Console Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { permissionService } from '../src/services/permissionService.js';
import { integrationsService } from '../src/services/integrationsService.js';
import { ROLES } from '../src/config/permissions.js';
import { normalizeSupabaseUrl } from '../src/services/supabase.js';

describe('Phase 4: Developer Tools & Zero-Leak Integrations Console', () => {
  const superAdminUser = { id: 'usr-01', name: 'Aditya Sharma', role: ROLES.SUPER_ADMIN, roleCode: 'ADMIN' };
  const adminUser = { id: 'usr-02', name: 'Standard Admin', role: ROLES.ADMIN, roleCode: 'ADMIN' };
  const supervisorUser = { id: 'usr-03', name: 'Sunil Verma', role: ROLES.SUPERVISOR, roleCode: 'OPS' };
  const techUser = { id: 'usr-04', name: 'Deepak Saini', role: ROLES.TECHNICIAN, roleCode: 'TECH' };

  describe('1. Super Admin Route Gating (403 Enforcement)', () => {
    it('allows Super Admin full access to developer-tools route', () => {
      const check = permissionService.assertRouteAccess(superAdminUser, 'developer-tools');
      expect(check.allowed).toBe(true);
    });

    it('strictly denies Admin access to developer-tools with 403 status', () => {
      const check = permissionService.assertRouteAccess(adminUser, 'developer-tools');
      expect(check.allowed).toBe(false);
      expect(check.statusCode).toBe(403);
    });

    it('strictly denies Supervisor access to developer-tools with 403 status', () => {
      const check = permissionService.assertRouteAccess(supervisorUser, 'developer-tools');
      expect(check.allowed).toBe(false);
      expect(check.statusCode).toBe(403);
    });

    it('strictly denies Technician access to developer-tools with 403 status', () => {
      const check = permissionService.assertRouteAccess(techUser, 'developer-tools');
      expect(check.allowed).toBe(false);
      expect(check.statusCode).toBe(403);
    });
  });

  describe('2. Write-Only Secrets Security Model', () => {
    it('saves secrets as write-only and never leaks plain text secret in getIntegrations()', async () => {
      const secretToSave = 'super-secret-service-role-key-998877';
      const result = await integrationsService.saveIntegration('supabase', {
        url: 'https://test-tenant.supabase.co'
      }, secretToSave, superAdminUser);

      expect(result.success).toBe(true);

      const all = integrationsService.getIntegrations();
      const supabaseConfig = all.supabase;

      // Crucial: The plain text secret must NEVER be returned in the object
      expect(JSON.stringify(supabaseConfig)).not.toContain(secretToSave);
      expect(supabaseConfig.secretMasked).toBe('••••8877');
      expect(supabaseConfig.publicConfig.url).toBe('https://test-tenant.supabase.co');
    });

    it('runs connection testing without leaking sensitive parameters', async () => {
      const testRes = await integrationsService.testConnection('google_sso');
      expect(testRes.success).toBe(true);
      expect(typeof testRes.latencyMs).toBe('number');
      expect(testRes.message).toBeDefined();
    });
  });

  describe('3. Dynamic Tenant Feature Flags', () => {
    it('updates feature flags and verifies state persistence', () => {
      const flagsBefore = integrationsService.getFeatureFlags();
      expect(flagsBefore).toBeDefined();

      integrationsService.setFeatureFlag('maintenanceMode', true, superAdminUser);
      const flagsAfter = integrationsService.getFeatureFlags();
      expect(flagsAfter.maintenanceMode).toBe(true);

      // Revert back
      integrationsService.setFeatureFlag('maintenanceMode', false, superAdminUser);
      expect(integrationsService.getFeatureFlags().maintenanceMode).toBe(false);
    });
  });

  describe('4. Modern Free-Tier Integrations & Key Resolution', () => {
    it('normalizes Supabase URLs from raw project reference IDs or full URLs', () => {
      expect(normalizeSupabaseUrl('abcdefghijklmnopqrst')).toBe('https://abcdefghijklmnopqrst.supabase.co');
      expect(normalizeSupabaseUrl('https://abcdefghijklmnopqrst.supabase.co/')).toBe('https://abcdefghijklmnopqrst.supabase.co');
      expect(normalizeSupabaseUrl('https://my-custom-proxy.internal')).toBe('https://my-custom-proxy.internal');
      expect(normalizeSupabaseUrl('')).toBe('');
      expect(normalizeSupabaseUrl(null)).toBe('');
    });

    it('exposes accurate modern Free Plan tiers and metadata across developer tools', () => {
      const list = integrationsService.getIntegrations();

      // Supabase
      expect(list.supabase.tier).toContain('Free Plan');
      expect(list.supabase.secretLabel).toContain('Secret API Key (or Legacy Service Role Key)');

      // Google SSO
      expect(list.google_sso.tier).toContain('Free Tier');

      // Firebase FCM
      expect(list.firebase.tier).toContain('Spark Plan');
      expect(list.firebase.publicConfig.vapidKey).toBeDefined();

      // Transactional Email
      expect(list.smtp.tier).toContain('Resend Free');
      expect(list.smtp.secretLabel).toContain('Resend');

      // WhatsApp Cloud API
      expect(list.whatsapp.tier).toContain('1,000 free');

      // Cloudflare
      expect(list.cloudflare.tier).toContain('Free Plan');

      // Oracle Always Free
      expect(list.offsite_backup.tier).toContain('Always Free');
    });
  });
});

