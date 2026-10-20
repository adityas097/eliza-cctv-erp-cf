// Multi-Tenant Isolation & Row-Level Security (RLS) Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/store/db.js';
import { DataImporter } from '../src/services/dataImporter.js';
import { ROLES, normalizeRole } from '../src/config/permissions.js';

describe('Phase 3: Multi-Tenant Foundation & RLS Simulation Suite', () => {
  beforeEach(() => {
    db.resetFactory();
  });

  describe('1. Cross-Tenant Isolation (Org A vs Org B)', () => {
    it('should strictly isolate data between distinct organizations', () => {
      // Seed data in Tenant A (Eliza Infotech)
      const orgA = 'comp-eliza';
      const orgB = 'comp-sonipat-branch';

      const jobsA = [
        { id: 'JOB-A1', companyId: orgA, title: 'Panipat Refinery Surveillance' },
        { id: 'JOB-A2', companyId: orgA, title: 'UHBVN Substation Install' }
      ];

      const jobsB = [
        { id: 'JOB-B1', companyId: orgB, title: 'Sonipat Highway Toll Plaza' }
      ];

      const combinedJobs = [...jobsA, ...jobsB];

      // RLS Policy Simulation for Tenant A
      const tenantAView = combinedJobs.filter(j => j.companyId === orgA);
      expect(tenantAView.length).toBe(2);
      expect(tenantAView.some(j => j.id === 'JOB-B1')).toBe(false);

      // RLS Policy Simulation for Tenant B
      const tenantBView = combinedJobs.filter(j => j.companyId === orgB);
      expect(tenantBView.length).toBe(1);
      expect(tenantBView[0].title).toBe('Sonipat Highway Toll Plaza');
      expect(tenantBView.some(j => j.id === 'JOB-A1')).toBe(false);
    });

    it('should block cross-tenant updates and writes', () => {
      const activeOrg = 'comp-eliza';
      const targetRecordOrg = 'comp-other';

      const updateAttempt = (callerOrg, recordOrg, data) => {
        if (callerOrg !== recordOrg) {
          throw new Error('RLS Violation: Cross-tenant modification denied.');
        }
        return { success: true, ...data };
      };

      expect(() => updateAttempt(activeOrg, targetRecordOrg, { status: 'Verified' }))
        .toThrow('RLS Violation: Cross-tenant modification denied.');
    });
  });

  describe('2. Role-Based Data Isolation (Technician vs Admin Payouts)', () => {
    const mockPayouts = [
      { id: 'PAY-01', org_id: 'comp-eliza', employee_id: 'EMP-001', amount: 1200, type: 'Job Earning' },
      { id: 'PAY-02', org_id: 'comp-eliza', employee_id: 'EMP-002', amount: 35000, type: 'Salary' },
      { id: 'PAY-03', org_id: 'comp-eliza', employee_id: 'EMP-003', amount: 600, type: 'Job Earning' },
      { id: 'PAY-04', org_id: 'comp-sonipat', employee_id: 'EMP-003', amount: 800, type: 'Job Earning' }
    ];

    it('should allow Super Admin & Accounts to view all tenant payouts', () => {
      const callerRole = ROLES.SUPER_ADMIN;
      const callerOrg = 'comp-eliza';

      const visiblePayouts = mockPayouts.filter(p => {
        if (p.org_id !== callerOrg) return false;
        if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTS, ROLES.SUPERVISOR].includes(callerRole)) {
          return true;
        }
        return false;
      });

      expect(visiblePayouts.length).toBe(3);
      expect(visiblePayouts.some(p => p.employee_id === 'EMP-001')).toBe(true);
      expect(visiblePayouts.some(p => p.employee_id === 'EMP-002')).toBe(true);
      expect(visiblePayouts.some(p => p.employee_id === 'EMP-003')).toBe(true);
    });

    it('should strictly restrict Technician to only their own payouts in their own organization', () => {
      const callerRole = ROLES.TECHNICIAN;
      const callerOrg = 'comp-eliza';
      const callerEmployeeId = 'EMP-003'; // Deepak Saini

      const visiblePayouts = mockPayouts.filter(p => {
        if (p.org_id !== callerOrg) return false;
        if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTS, ROLES.SUPERVISOR].includes(callerRole)) {
          return true;
        }
        if (callerRole === ROLES.TECHNICIAN) {
          return p.employee_id === callerEmployeeId;
        }
        return false;
      });

      // Deepak can only see his own payout (PAY-03)
      expect(visiblePayouts.length).toBe(1);
      expect(visiblePayouts[0].id).toBe('PAY-03');
      expect(visiblePayouts[0].employee_id).toBe('EMP-003');

      // Crucial: Deepak CANNOT see Sunil Verma's salary (PAY-02) or Amit Sharma's earning (PAY-01)
      expect(visiblePayouts.some(p => p.id === 'PAY-01')).toBe(false);
      expect(visiblePayouts.some(p => p.id === 'PAY-02')).toBe(false);
      // Crucial: Deepak cannot see other tenant's payout even with same employee ID (PAY-04)
      expect(visiblePayouts.some(p => p.id === 'PAY-04')).toBe(false);
    });

    it('should deny all data access to anonymous / unauthenticated callers', () => {
      const callerAuthId = null; // Anonymous

      const queryWithAuth = (authId, collection) => {
        if (!authId) return []; // Default deny in RLS
        return collection;
      };

      const result = queryWithAuth(callerAuthId, mockPayouts);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('3. Idempotent Data Importer & Dry-Run Engine', () => {
    it('should run a non-destructive dry-run analysis on local state', async () => {
      const res = await DataImporter.dryRun();
      expect(res.success).toBe(true);
      expect(res.mode).toBe('DRY_RUN');
      expect(res.stats.partiesCount).toBeGreaterThan(0);
      expect(res.stats.itemsCount).toBeGreaterThan(0);
      expect(res.stats.jobsCount).toBeGreaterThan(0);
      expect(res.isReady).toBe(true);
    });
  });
});
