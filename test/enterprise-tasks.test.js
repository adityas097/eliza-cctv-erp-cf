// Vitest Test Suite for Enterprise Multi-Tenancy, Clean-Slate Reset & Employee Parity
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/store/db.js';
import { store } from '../src/services/store.js';
import { auth } from '../src/services/auth.js';

describe('Enterprise Suite - Multi-Tenant, Clean Reset & Staff Parity', () => {
  beforeEach(() => {
    db.resetFactory();
  });

  describe('TASK 2: Clean-Slate Reset (One-Time Versioned Migration)', () => {
    it('should create backup and reset accounts values to zero while keeping party & item masters', () => {
      const initialParties = (db.state.parties || []).length;
      const initialItems = (db.state.items || []).length;
      const initialInventory = (db.state.inventory || []).length;
      expect(initialParties).toBeGreaterThan(0);
      expect(initialItems).toBeGreaterThan(0);
      expect(initialInventory).toBeGreaterThan(0);

      // Perform clean-slate reset
      const result = db.cleanSlateReset();
      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();

      // Versioned migration flag
      expect(db.state.settings?.resetV1Done).toBe(true);

      // Party and Item masters preserved
      expect(db.state.parties.length).toBe(initialParties);
      expect(db.state.items.length).toBe(initialItems);
      expect(db.state.inventory.length).toBe(initialInventory);

      // Party balances zeroed
      db.state.parties.forEach(p => {
        expect(p.balance).toBe(0);
        expect(p.openingBalance).toBe(0);
        expect(p.transactions).toEqual([]);
      });

      // Outstanding inventory dues zeroed
      db.state.inventory.forEach(inv => {
        expect(inv.outstandingDue).toBe(0);
      });

      // Jobs, leads, tickets deleted for the company
      expect((db.state.jobs || []).length).toBe(0);
      expect((db.state.leads || []).length).toBe(0);
      expect((db.state.tickets || []).length).toBe(0);
      expect((db.state.payouts || []).length).toBe(0);
      expect((db.state.projects || []).length).toBe(0);

      // Only Owner in Employees
      expect(db.state.employees.length).toBe(1);
      expect(db.state.employees[0].roleCode).toBe('ADMIN');
      expect(db.state.employees[0].name).toBe('Aditya Sharma');

      // KPIs strictly 0 without errors or NaN
      const kpis = store.getKpis();
      expect(kpis.revenueBooked).toBe(0);
      expect(kpis.grossProfit).toBe(0);
      expect(kpis.pipelineQuoted).toBe(0);
      expect(kpis.openJobsCount).toBe(0);
      expect(kpis.openTicketsCount).toBe(0);
      expect(kpis.techBalanceDue).toBe(0);
      expect(isNaN(kpis.grossMarginPct)).toBe(false);
      expect(kpis.grossMarginPct).toBe(0);
    });

    it('should export full backup structure with all state collections', () => {
      const backup = db.exportFullBackup();
      expect(backup.app).toBe('ELIZA_ENTERPRISE_ERP');
      expect(backup.exportedAt).toBeDefined();
      expect(backup.state).toBeDefined();
      expect(backup.state.parties).toBeDefined();
      expect(backup.state.inventory).toBeDefined();
      expect(backup.state.users).toBeDefined();
      expect(backup.state.employees).toBeDefined();
    });
  });

  describe('TASK 3: Multi-Company Tenant Scoping', () => {
    it('should isolate data between two different companies', async () => {
      // 1. Company 1 (Eliza Infotech default)
      db.setActiveCompanyId('comp-eliza');
      await db.collection('jobs').create({ id: 'JOB-ELIZA-01', clientName: 'Eliza Client 1', status: 'Scheduled' });
      const elizaJobs = await db.collection('jobs').list();
      expect(elizaJobs.some(j => j.id === 'JOB-ELIZA-01')).toBe(true);

      // 2. Company 2 Signup / Creation
      const signupResult = await auth.signUp(
        'Apex Security Systems',
        'Rajesh Kumar',
        'rajesh@apexsec.com',
        'password123',
        '+91 98765-43210'
      );
      expect(signupResult.success).toBe(true);
      const company2Id = signupResult.company.id;
      expect(company2Id).toBeDefined();
      expect(db.getActiveCompanyId()).toBe(company2Id);

      // Company 2 queries should NOT see Company 1's jobs
      const company2Jobs = await db.collection('jobs').list();
      expect(company2Jobs.some(j => j.id === 'JOB-ELIZA-01')).toBe(false);
      expect(company2Jobs.length).toBe(0);

      // Company 2 creates its own job
      await db.collection('jobs').create({ id: 'JOB-APEX-01', clientName: 'Apex Client 1', status: 'In Progress' });
      const updatedComp2Jobs = await db.collection('jobs').list();
      expect(updatedComp2Jobs.length).toBe(1);
      expect(updatedComp2Jobs[0].id).toBe('JOB-APEX-01');

      // Switch back to Company 1: should see JOB-ELIZA-01 and NOT JOB-APEX-01
      db.setActiveCompanyId('comp-eliza');
      const recheckedElizaJobs = await db.collection('jobs').list();
      expect(recheckedElizaJobs.some(j => j.id === 'JOB-ELIZA-01')).toBe(true);
      expect(recheckedElizaJobs.some(j => j.id === 'JOB-APEX-01')).toBe(false);
    });

    it('should block suspended user accounts from logging in', async () => {
      // Create user
      const user = store.addUser({
        name: 'Temporary Tech',
        username: 'temptech',
        password: 'password123',
        email: 'temptech@test.com',
        role: 'Technician',
        roleCode: 'TECH'
      });

      // Suspend user
      store.toggleUserStatus(user.id);
      expect(user.status).toBe('Suspended');

      // Attempt login
      const loginRes = await auth.login('temptech', 'password123');
      expect(loginRes.success).toBe(false);
      expect(loginRes.message).toContain('suspended');
    });
  });

  describe('TASK 4: Employee <-> User Accounts Sync & Parity', () => {
    it('should link employee to user account upon creation and propagate deactivation', () => {
      const emp = {
        id: 'EMP-999',
        name: 'Vikas Malik',
        email: 'vikas@testcorp.com',
        phone: '+91 99999-11111',
        role: 'Technician',
        roleCode: 'TECH',
        active: true
      };
      db.state.employees.push(emp);

      // Create linked user login
      const linkedUser = store.syncEmployeeToUser(emp, { username: 'vikas_m', password: 'password123' });
      expect(linkedUser).toBeDefined();
      expect(linkedUser.username).toBe('vikas_m');
      expect(linkedUser.employeeId).toBe('EMP-999');
      expect(emp.userId).toBe(linkedUser.id);
      expect(linkedUser.status).toBe('Active');

      // Deactivate employee -> propagates to user
      store.deactivateEmployee('EMP-999');
      expect(emp.active).toBe(false);
      expect(linkedUser.status).toBe('Suspended');
    });

    it('should detect mismatches and execute reconciliation successfully', () => {
      // Add an unlinked user
      const orphanUser = {
        id: 'usr-orphan',
        username: 'orphan_login',
        name: 'Orphan User',
        email: 'orphan@test.com',
        role: 'Technician',
        roleCode: 'TECH',
        status: 'Active'
      };
      db.state.users.push(orphanUser);

      // Add an unlinked employee
      const orphanEmp = {
        id: 'EMP-orphan',
        name: 'Unlinked Staff',
        email: 'unlinked@test.com',
        role: 'Technician',
        active: true
      };
      db.state.employees.push(orphanEmp);

      const beforeRec = store.getReconciliationReport();
      expect(beforeRec.isFullyReconciled).toBe(false);
      expect(beforeRec.accountsWithoutEmployees.length).toBeGreaterThan(0);

      // Execute reconciliation
      store.reconcileEmployees();

      const afterRec = store.getReconciliationReport();
      expect(afterRec.accountsWithoutEmployees.length).toBe(0);
      expect(orphanUser.employeeId).toBeDefined();
    });

    it('should configure Aditya Sharma as Super Admin across employee seed data and reconciliation', () => {
      const adityaEmp = (db.state.employees || []).find(e => e.name === 'Aditya Sharma' || e.id === 'EMP-012');
      expect(adityaEmp).toBeDefined();
      expect(adityaEmp.role).toBe('Super Admin');
      expect(adityaEmp.roleCode).toBe('ADMIN');
      expect(adityaEmp.email).toBe('aditya@elizainfotech.com');
    });
  });
});
