// Vitest Test Suite for Eliza Infotech Field Operations & Single Source of Truth
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/store/db.js';
import { slaService } from '../src/services/slaService.js';
import { ledgerService } from '../src/services/ledgerService.js';
import { jobService } from '../src/services/jobService.js';
import { store } from '../src/services/store.js';

describe('Field Operations Suite - Unit Tests', () => {
  beforeEach(() => {
    // Reset local state for clean tests
    db.resetStorage();
  });

  describe('1. SLA Service & Calculations', () => {
    it('should correctly calculate due times based on SLA matrix', () => {
      const now = new Date('2026-10-20T10:00:00');
      const dueTimes = slaService.calculateDueTimes('Critical', now);

      expect(dueTimes.slaResponseDue).toBeDefined();
      expect(dueTimes.slaResolveDue).toBeDefined();

      const respDate = new Date(dueTimes.slaResponseDue);
      const resoDate = new Date(dueTimes.slaResolveDue);

      expect(respDate.getTime()).toBeGreaterThan(now.getTime());
      expect(resoDate.getTime()).toBeGreaterThan(respDate.getTime());
    });

    it('should smart-suggest Critical severity from keywords', () => {
      expect(slaService.suggestSeverity('DVR is beeping continuously', 'DVR/NVR')).toBe('Critical');
      expect(slaService.suggestSeverity('No video output on main monitor', 'Camera')).toBe('Critical');
      expect(slaService.suggestSeverity('Main SMPS tripped and smoking', 'Power/SMPS')).toBe('Critical');
      expect(slaService.suggestSeverity('Minor cable clipping needed', 'Cabling')).not.toBe('Critical');
    });

    it('should detect breached status when resolve due date has passed', () => {
      const pastTicket = {
        id: 'TKT-TEST',
        status: 'Open',
        loggedAt: '2026-10-18T10:00:00',
        slaResolveDue: '2026-10-19T10:00:00'
      };
      const status = slaService.computeTicketSlaStatus(pastTicket);
      expect(status.isBreached).toBe(true);
      expect(status.pctRemaining).toBe(0);
    });
  });

  describe('2. Ledger Service & Double-Entry Accounting', () => {
    it('should post Credit when a job earning payout is approved', async () => {
      const empId = 'EMP-001';
      const initialLedger = await ledgerService.getEmployeeLedger(empId);
      const initialBalance = initialLedger.closingBalance;

      // Post job earning of ₹1,500
      await ledgerService.postJobEarning({
        employeeId: empId,
        jobId: 'JOB-TEST-01',
        amount: 1500,
        remarks: 'Test job 10 points'
      });

      const updatedLedger = await ledgerService.getEmployeeLedger(empId);
      expect(updatedLedger.closingBalance).toBe(initialBalance + 1500);
      expect(updatedLedger.totalCredit).toBe(initialLedger.totalCredit + 1500);
    });

    it('should post Debit when payout is disbursed (Paid)', async () => {
      const empId = 'EMP-002';
      // Create an approved payout
      const payout = await db.collection('payouts').create({
        id: 'PAY-TEST-01',
        employeeId: empId,
        employeeName: 'Sunil Verma',
        type: 'Job Earning',
        amount: 2000,
        direction: 'CR',
        status: 'Approved',
        paidAmount: 0,
        date: '2026-10-20'
      });

      const ledgerBefore = await ledgerService.getEmployeeLedger(empId);

      // Disburse payment
      await ledgerService.updatePayoutStatus(payout.id, 'Paid', {
        paidAmount: 2000,
        mode: 'UPI',
        reference: 'UPI12345678',
        paidOn: '2026-10-20'
      });

      const ledgerAfter = await ledgerService.getEmployeeLedger(empId);
      expect(ledgerAfter.totalDebit).toBe(ledgerBefore.totalDebit + 2000);
      expect(ledgerAfter.closingBalance).toBe(ledgerBefore.closingBalance - 2000);
    });

    it('should post a reversing entry on cancellation, never delete history', async () => {
      const empId = 'EMP-003';
      const initialLedger = await ledgerService.getEmployeeLedger(empId);
      const initialEntriesCount = initialLedger.entries.length;

      // Create an approved payout
      const payout = await db.collection('payouts').create({
        id: 'PAY-TEST-CANCEL',
        employeeId: empId,
        employeeName: 'Deepak Saini',
        type: 'Bonus',
        amount: 500,
        direction: 'CR',
        status: 'Approved',
        paidAmount: 0,
        date: '2026-10-20'
      });

      // Cancel payout
      await ledgerService.updatePayoutStatus(payout.id, 'Cancelled', {
        reason: 'Duplicate entry'
      });

      const ledgerAfter = await ledgerService.getEmployeeLedger(empId);
      // Entry history should have increased (reversal entry appended)
      expect(ledgerAfter.entries.length).toBeGreaterThan(initialEntriesCount);
      // Reversing entry must exist
      const reversal = ledgerAfter.entries.find(e => e.narration.includes('REVERSAL'));
      expect(reversal).toBeDefined();
    });

    it('should pass mathematical integrity check across all employee ledgers', async () => {
      const check = await ledgerService.checkLedgerIntegrity();
      expect(check.passed).toBe(true);
      expect(check.discrepancies.length).toBe(0);
    });
  });

  describe('3. Payout Status Transitions & Partial Payments', () => {
    it('should handle partial payment correctly and leave remainder as Partially Paid', async () => {
      const payout = await db.collection('payouts').create({
        id: 'PAY-TEST-PARTIAL',
        employeeId: 'EMP-004',
        employeeName: 'Manoj Kumar',
        type: 'Job Earning',
        amount: 5000,
        direction: 'CR',
        status: 'Approved',
        paidAmount: 0,
        date: '2026-10-20'
      });

      // Pay ₹3,000 out of ₹5,000
      const result = await ledgerService.updatePayoutStatus(payout.id, 'Partially Paid', {
        paidAmount: 3000,
        mode: 'Bank',
        reference: 'NEFT998877',
        paidOn: '2026-10-20'
      });

      expect(result.status).toBe('Partially Paid');
      expect(result.paidAmount).toBe(3000);
      expect(result.amount - result.paidAmount).toBe(2000);
    });
  });

  describe('4. Single Source of Truth Reconciliations', () => {
    it('Dashboard weighted pipeline must equal SUM(quoted × winProb) from CRM records', () => {
      const leads = store.state.leads || [];
      const expectedWeighted = leads.reduce((sum, l) => sum + ((Number(l.quotedValue) || 0) * (Number(l.winProb) || 0)), 0);
      const kpis = store.getKpis();

      expect(Math.round(kpis.pipelineWeighted)).toBe(Math.round(expectedWeighted));
    });

    it('Project labour cost must equal SUM of Job Earning payouts for linked jobs', () => {
      db._reconcileProjectLabour();
      const prj = store.state.projects.find(p => p.id === 'PRJ-2026-01');
      if (prj) {
        // Find verified jobs linked to this project
        const linkedJobs = (store.state.jobs || []).filter(j => j.projectId === prj.id && j.status === 'Verified');
        const linkedJobIds = new Set(linkedJobs.map(j => j.id));

        const expectedLabour = (store.state.payouts || [])
          .filter(p => linkedJobIds.has(p.jobId) && p.type === 'Job Earning')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        expect(Number(prj.labourCost)).toBe(expectedLabour);
      }
    });

    it('Technician payout totals must be derived exclusively from Payout store', () => {
      const kpis = store.getKpis();
      const expectedDue = (store.state.payouts || [])
        .filter(p => p.status === 'Pending' || p.status === 'Approved' || p.status === 'Partially Paid')
        .reduce((sum, p) => sum + ((Number(p.amount) || 0) - (Number(p.paidAmount) || 0)), 0);

      expect(kpis.totalPayableToStaff).toBe(expectedDue);
    });
  });

  describe('5. Job Service Validation & Cascading Completion Flow', () => {
    it('should reject moving a job to In Progress without assignees', () => {
      const unassignedJob = {
        id: 'JOB-INVALID',
        status: 'Scheduled',
        assignees: []
      };
      const check = jobService.validateStatusTransition(unassignedJob, 'In Progress');
      expect(check.valid).toBe(false);
      expect(check.error).toContain('assigned technician');
    });

    it('should reject verifying a job that has not been marked Completed', () => {
      const scheduledJob = {
        id: 'JOB-SCHEDULED',
        status: 'Scheduled',
        assignees: [{ employeeId: 'EMP-001' }]
      };
      const check = jobService.validateStatusTransition(scheduledJob, 'Verified');
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Completed');
    });

    it('verifying a job should automatically generate Pending payouts for assignees', async () => {
      // Create a completed job with 2 assignees
      const testJob = await db.collection('jobs').create({
        id: 'JOB-CASCADE-TEST',
        title: 'Cascade Verification Test',
        type: 'New Install',
        clientId: 'PRT-01',
        clientName: 'Test Client',
        projectId: 'PRJ-2026-01',
        status: 'Completed',
        pointsCount: 10,
        camsCount: 8,
        assignees: [
          { employeeId: 'EMP-003', role: 'Lead', payBasis: 'PerPoint', rate: 150, units: 10 },
          { employeeId: 'EMP-004', role: 'Support', payBasis: 'PerJob', rate: 500, units: 1 }
        ],
        checklist: [{ text: 'Done', done: true }]
      });

      // Verify the job
      await jobService.updateJobStatus(testJob.id, 'Verified', 'Super Admin');

      // Check that 2 Job Earning payouts were created in Pending status
      const payouts = await db.collection('payouts').list(p => p.jobId === testJob.id);
      expect(payouts.length).toBe(2);

      const leadPayout = payouts.find(p => p.employeeId === 'EMP-003');
      expect(leadPayout).toBeDefined();
      expect(leadPayout.amount).toBe(1500); // 10 * 150
      expect(leadPayout.status).toBe('Pending');

      const supportPayout = payouts.find(p => p.employeeId === 'EMP-004');
      expect(supportPayout).toBeDefined();
      expect(supportPayout.amount).toBe(500); // PerJob rate
      expect(supportPayout.status).toBe('Pending');
    });
  });

  describe('6. Job Sheets & Job Board CRUD Lifecycle', () => {
    it('should support full Create, Read, Update and Delete lifecycle on jobs', async () => {
      // 1. CREATE
      const newJob = await db.collection('jobs').create({
        id: 'JOB-CRUD-001',
        title: 'High-Res IP Camera Array Installation',
        type: 'New Install',
        clientId: 'PRT-01',
        clientName: 'Panipat Sugar Mills',
        siteAddress: 'Outer Ring Road, Panipat',
        status: 'Scheduled',
        priority: 'High',
        pointsCount: 12,
        camsCount: 12,
        assignees: [
          { employeeId: 'EMP-001', role: 'Lead', payBasis: 'PerPoint', rate: 200, units: 12 }
        ],
        checklist: [{ text: 'Mount NVR rack', done: false }]
      });

      expect(newJob.id).toBe('JOB-CRUD-001');

      // 2. READ
      const fetched = await db.collection('jobs').get('JOB-CRUD-001');
      expect(fetched).toBeDefined();
      expect(fetched.title).toBe('High-Res IP Camera Array Installation');
      expect(fetched.status).toBe('Scheduled');

      // 3. UPDATE
      const updated = await db.collection('jobs').update('JOB-CRUD-001', {
        title: 'Updated Scope: 16-Camera Array',
        camsCount: 16,
        status: 'In Progress'
      });

      expect(updated.title).toBe('Updated Scope: 16-Camera Array');
      expect(updated.camsCount).toBe(16);
      expect(updated.status).toBe('In Progress');

      // 4. DELETE
      const deleteResult = await jobService.deleteJob('JOB-CRUD-001', 'Test Runner');
      expect(deleteResult).toBe(true);

      const afterDelete = await db.collection('jobs').get('JOB-CRUD-001');
      expect(afterDelete).toBeNull();
    });

    it('should cleanly unlink and reset service ticket when a linked job is deleted', async () => {
      // Create ticket
      const ticket = await db.collection('tickets').create({
        id: 'TKT-CRUD-LINK',
        issue: 'NVR HDD Offline',
        status: 'Open',
        clientId: 'PRT-01',
        clientName: 'Test Client'
      });

      // Spawn job from ticket
      const job = await jobService.createJobFromTicket(ticket, 'Super Admin');
      expect(job.ticketId).toBe(ticket.id);

      const ticketAfterSpawn = await db.collection('tickets').get(ticket.id);
      expect(ticketAfterSpawn.status).toBe('Assigned');
      expect(ticketAfterSpawn.jobId).toBe(job.id);

      // Now delete the job
      await jobService.deleteJob(job.id, 'Super Admin');

      // Verify job is gone
      const deletedJob = await db.collection('jobs').get(job.id);
      expect(deletedJob).toBeNull();

      // Verify ticket is unlinked and reverted to Open
      const ticketAfterDelete = await db.collection('tickets').get(ticket.id);
      expect(ticketAfterDelete.jobId).toBeNull();
      expect(ticketAfterDelete.status).toBe('Open');
    });
  });
});
