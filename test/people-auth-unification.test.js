import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES, normalizeRole, DEFAULT_PERMISSION_MATRIX } from '../src/config/permissions.js';
import { PermissionService } from '../src/services/permissionService.js';
import { PeopleService } from '../src/services/peopleService.js';
import { db } from '../src/store/db.js';
import { store } from '../src/services/store.js';

describe('People & Identity Unification Test Suite', () => {
  let peopleService;
  let permissionService;

  beforeEach(() => {
    localStorage.clear();
    peopleService = new PeopleService();
    permissionService = new PermissionService();

    // Seed mock database state (db.state and store.state share same reference)
    db.state = {
      activeCompanyId: 'comp-eliza',
      employees: [
        { id: 'EMP-001', name: 'Amit Sharma', role: 'Senior Technician', email: 'amit@eliza.in', phone: '9812011223', active: true, canBeAssignedJobs: true, companyId: 'comp-eliza' },
        { id: 'EMP-002', name: 'Sunil Verma', role: 'Supervisor', email: 'sunil@eliza.in', phone: '9416022334', active: true, canBeAssignedJobs: false, companyId: 'comp-eliza' }
      ],
      users: [
        { id: 'usr-01', username: 'aditya', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin', roleCode: 'ADMIN', status: 'Active', companyId: 'comp-eliza' },
        { id: 'usr-02', username: 'amit', email: 'amit@eliza.in', name: 'Amit Sharma', role: 'Senior Technician', roleCode: 'TECH', status: 'Active', companyId: 'comp-eliza' }
      ],
      jobs: [
        { id: 'JOB-001', title: 'Bank CCTV AMC', assignees: [{ employeeId: 'EMP-001', name: 'Amit Sharma' }], companyId: 'comp-eliza' }
      ],
      tickets: [
        { id: 'TKT-001', title: 'DVR Offline', assignedTo: 'EMP-001', companyId: 'comp-eliza' }
      ],
      payouts: [
        { id: 'PAY-001', employeeId: 'EMP-001', amount: 1200, direction: 'CR', paidAmount: 0, companyId: 'comp-eliza' }
      ],
      ledger: [
        { id: 'LED-001', employeeId: 'EMP-001', amount: 1200, companyId: 'comp-eliza' }
      ]
    };
  });

  describe('1. Role & Permission Matrix Tests', () => {
    it('normalizes roles correctly across various string formats', () => {
      expect(normalizeRole('Super Admin')).toBe(ROLES.SUPER_ADMIN);
      expect(normalizeRole('ADMIN')).toBe(ROLES.ADMIN);
      expect(normalizeRole('Operations Manager')).toBe(ROLES.SUPERVISOR);
      expect(normalizeRole('Accountant')).toBe(ROLES.ACCOUNTS);
      expect(normalizeRole('Sales Exec')).toBe(ROLES.SALES_EXEC);
      expect(normalizeRole('Technician')).toBe(ROLES.TECHNICIAN);
      expect(normalizeRole('Helper')).toBe(ROLES.HELPER);
      expect(normalizeRole('Unknown')).toBe(ROLES.VIEWER);
    });

    it('grants Super Admin full access across all resources', () => {
      const superAdminUser = { name: 'Aditya', role: ROLES.SUPER_ADMIN, roleCode: 'ADMIN' };
      expect(permissionService.can(superAdminUser, 'user_management', 'create')).toBe(true);
      expect(permissionService.can(superAdminUser, 'user_management', 'delete')).toBe(true);
      expect(permissionService.canAccessRoute(superAdminUser, 'admin-users')).toBe(true);
    });

    it('blocks non-super-admins from accessing admin-users route and user_management resource', () => {
      const adminUser = { name: 'John Admin', role: ROLES.ADMIN };
      const techUser = { name: 'Deepak Tech', role: ROLES.TECHNICIAN };

      expect(permissionService.canAccessRoute(adminUser, 'admin-users')).toBe(false);
      expect(permissionService.canAccessRoute(techUser, 'admin-users')).toBe(false);
      expect(permissionService.can(adminUser, 'user_management', 'read')).toBe(false);

      const routeCheck = permissionService.assertRouteAccess(techUser, 'admin-users');
      expect(routeCheck.allowed).toBe(false);
      expect(routeCheck.statusCode).toBe(403);
    });

    it('allows toggling permissions and resetting matrix to defaults', () => {
      const actor = { name: 'Aditya', role: 'Super Admin' };
      // Grant supervisor write access to crm_quotations
      permissionService.togglePermission('crm_quotations', ROLES.SUPERVISOR, 'update', true, actor);
      expect(permissionService.can({ role: ROLES.SUPERVISOR }, 'crm_quotations', 'update')).toBe(true);

      // Reset to defaults
      permissionService.resetToDefaults(actor);
      expect(permissionService.can({ role: ROLES.SUPERVISOR }, 'crm_quotations', 'update')).toBe(false);
    });
  });

  describe('2. Single Source of Truth & Reconciliation Engine', () => {
    it('reconciles legacy employees and users into a unified person record by email', async () => {
      const report = peopleService.reconcile();
      expect(report.totalPeople).toBeGreaterThanOrEqual(2);

      const people = await peopleService.list();
      const amit = people.find(p => p.email === 'amit@eliza.in');
      expect(amit).toBeDefined();
      expect(amit.fullName).toBe('Amit Sharma');
      expect(amit.authUserId).toBe('usr-02');
      expect(amit.employeeCode).toBe('EMP-001');

      const aditya = people.find(p => p.email === 'aditya@eliza.in');
      expect(aditya).toBeDefined();
      expect(aditya.role).toBe(ROLES.SUPER_ADMIN);
      expect(aditya.authUserId).toBe('usr-01');
    });

    it('syncs people back into db.state.employees and store.state.users automatically', async () => {
      peopleService.reconcile();
      expect(db.state.employees.length).toBeGreaterThanOrEqual(2);
      expect(store.state.users.length).toBeGreaterThanOrEqual(2);

      const syncedAmit = db.state.employees.find(e => e.email === 'amit@eliza.in');
      expect(syncedAmit).toBeDefined();
      expect(syncedAmit.id).toBe('EMP-001');
    });
  });

  describe('3. Hard Safeguards Enforcement', () => {
    it('prevents self-demotion and self-suspension', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const aditya = people.find(p => p.email === 'aditya@eliza.in');

      const selfActor = { id: aditya.authUserId, email: aditya.email, name: aditya.fullName, role: 'Super Admin' };

      // Attempt self-suspension
      await expect(peopleService.updatePerson(aditya.id, { accessStatus: 'SUSPENDED' }, selfActor))
        .rejects.toThrow(/You cannot suspend or deactivate your own account/i);

      // Attempt self-demotion
      await expect(peopleService.updatePerson(aditya.id, { role: ROLES.TECHNICIAN }, selfActor))
        .rejects.toThrow(/You cannot demote or change your own role/i);
    });

    it('prevents self-deletion', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const aditya = people.find(p => p.email === 'aditya@eliza.in');
      const selfActor = { id: aditya.authUserId, email: aditya.email, name: aditya.fullName, role: 'Super Admin' };

      await expect(peopleService.deletePerson(aditya.id, aditya.employeeCode, selfActor))
        .rejects.toThrow(/You cannot delete your own account/i);
    });

    it('prevents demoting or deleting the last active Super Admin', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const aditya = people.find(p => p.email === 'aditya@eliza.in');

      // Actor is another admin (simulated external actor)
      const otherActor = { id: 'usr-999', email: 'other@eliza.in', name: 'Other Admin', role: 'Super Admin' };

      // Attempt demoting the only active Super Admin
      await expect(peopleService.updatePerson(aditya.id, { role: ROLES.ADMIN }, otherActor))
        .rejects.toThrow(/Cannot demote or suspend the last active Super Admin/i);

      // Attempt deleting the only active Super Admin
      await expect(peopleService.deletePerson(aditya.id, aditya.employeeCode, otherActor))
        .rejects.toThrow(/Cannot delete the last active Super Admin/i);
    });
  });

  describe('4. Soft vs Hard Delete Dependency Protection', () => {
    it('blocks hard deletion of a person with linked jobs, tickets, or payouts', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const amit = people.find(p => p.email === 'amit@eliza.in');
      const actor = { id: 'usr-01', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin' };

      // Amit has 1 job, 1 ticket, 1 payout, 1 ledger entry
      await expect(peopleService.deletePerson(amit.id, amit.employeeCode, actor))
        .rejects.toThrow(/Cannot hard-delete person with historical activity/i);
    });

    it('allows Archive / Anonymize for a person with dependencies, preserving financial integrity', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const amit = people.find(p => p.email === 'amit@eliza.in');
      const actor = { id: 'usr-01', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin' };

      const res = await peopleService.archivePerson(amit.id, amit.employeeCode, actor);
      expect(res.person.accessStatus).toBe('DEACTIVATED');
      expect(res.person.employmentStatus).toBe('EXITED');
      expect(res.person.fullName).toContain('Former Employee');
      expect(res.person.canBeAssignedJobs).toBe(false);

      // Ensure historical job still references EMP-001 alias
      const syncedEmployees = db.state.employees;
      const archivedRecord = syncedEmployees.find(e => e.id === 'EMP-001');
      expect(archivedRecord).toBeDefined();
      expect(archivedRecord.active).toBe(false);
    });

    it('allows hard delete only when zero dependencies exist and typed code matches', async () => {
      peopleService.reconcile();
      const actor = { id: 'usr-01', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin' };

      // Create a brand new person with zero activity
      const newPerson = await peopleService.createPerson({
        fullName: 'Temporary Helper',
        email: 'temp@eliza.in',
        phone: '9999900000',
        role: ROLES.HELPER
      }, {}, actor);

      // Mismatch confirmation code should reject
      await expect(peopleService.deletePerson(newPerson.id, 'WRONG_CODE', actor))
        .rejects.toThrow(/Confirmation mismatch/i);

      // Correct confirmation code with zero dependencies succeeds
      const result = await peopleService.deletePerson(newPerson.id, newPerson.employeeCode, actor);
      expect(result.success).toBe(true);
      expect(result.mode).toBe('HARD_DELETE');

      const check = await peopleService.get(newPerson.id);
      expect(check).toBeNull();
    });
  });

  describe('5. Sync Side-Effects & Dispatch Eligibility', () => {
    it('suspending a person revokes sessions and removes them from getActiveAssignablePeople', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const amit = people.find(p => p.email === 'amit@eliza.in');
      const actor = { id: 'usr-01', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin' };

      // Verify initially eligible
      let assignables = await peopleService.getActiveAssignablePeople();
      expect(assignables.some(p => p.id === amit.id)).toBe(true);

      // Suspend Amit
      await peopleService.updatePerson(amit.id, { accessStatus: 'SUSPENDED' }, actor);

      // Verify removed from active assignable list
      assignables = await peopleService.getActiveAssignablePeople();
      expect(assignables.some(p => p.id === amit.id)).toBe(false);

      // Reactivate Amit
      await peopleService.updatePerson(amit.id, { accessStatus: 'ACTIVE' }, actor);
      assignables = await peopleService.getActiveAssignablePeople();
      expect(assignables.some(p => p.id === amit.id)).toBe(true);
    });

    it('marking employment status as EXITED auto-suspends access and blocks job dispatch', async () => {
      peopleService.reconcile();
      const people = await peopleService.list();
      const amit = people.find(p => p.email === 'amit@eliza.in');
      const actor = { id: 'usr-01', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin' };

      const res = await peopleService.updatePerson(amit.id, { employmentStatus: 'EXITED' }, actor);
      expect(res.person.accessStatus).toBe('SUSPENDED');
      expect(res.person.canBeAssignedJobs).toBe(false);
      expect(res.warning).toContain('outstanding ledger balance');
    });

    it('rejects duplicate email in createPerson', async () => {
      peopleService.reconcile();
      const actor = { id: 'usr-01', email: 'aditya@eliza.in', name: 'Aditya Sharma', role: 'Super Admin' };

      await expect(peopleService.createPerson({
        fullName: 'Duplicate User',
        email: 'amit@eliza.in', // Already exists
        phone: '9812011223',
        role: ROLES.TECHNICIAN
      }, {}, actor)).rejects.toThrow(/already exists/i);
    });

    it('enforces 5-attempt lockout for 15 minutes in MockAuthAdapter', () => {
      const adapter = peopleService.authAdapter;
      const testEmail = 'intruder@target.com';

      // 4 failed attempts should not lock out
      for (let i = 0; i < 4; i++) {
        adapter.recordFailedAttempt(testEmail);
        expect(adapter.checkLockout(testEmail).locked).toBe(false);
      }

      // 5th failed attempt should trigger lockout
      adapter.recordFailedAttempt(testEmail);
      const lockout = adapter.checkLockout(testEmail);
      expect(lockout.locked).toBe(true);
      expect(lockout.remainingMinutes).toBeGreaterThanOrEqual(14);
    });
  });
});
