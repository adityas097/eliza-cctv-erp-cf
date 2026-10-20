// Automatic Employee Ledgers & Payout Management Service
import { db } from '../store/db.js';

class LedgerService {
  /**
   * Posts a Job Earning payout and ledger credit when a job is verified.
   */
  async postJobEarning(jobOrPayload, assigneeOrDate = null, date = null) {
    // Check if called with single payload object: { employeeId, amount, jobId, remarks }
    if (jobOrPayload && jobOrPayload.employeeId && jobOrPayload.amount !== undefined) {
      const payload = jobOrPayload;
      const postDate = assigneeOrDate || new Date().toISOString().split('T')[0];
      const empId = payload.employeeId;
      const emp = await db.collection('employees').get(empId);
      const empName = emp ? emp.name : 'Technician';
      const amount = Number(payload.amount) || 0;

      const payoutId = `PAY-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
      const payout = {
        id: payoutId,
        employeeId: empId,
        employeeName: empName,
        jobId: payload.jobId || null,
        date: postDate,
        type: "Job Earning",
        amount,
        direction: "CR",
        status: "Approved",
        paidAmount: 0,
        mode: null,
        reference: null,
        paidOn: null,
        remarks: payload.remarks || `Job Earning for ${payload.jobId || 'Job'}`,
        approvedBy: 'Auto'
      };

      await db.collection('payouts').create(payout);

      await this._appendLedgerEntry({
        employeeId: empId,
        date: postDate,
        refType: "Job",
        refId: payload.jobId || payoutId,
        narration: payload.remarks || `Job Earning: ${payload.jobId || payoutId}`,
        credit: amount,
        debit: 0
      });

      return payout;
    }

    const job = jobOrPayload;
    const assignee = assigneeOrDate;
    const postDate = date || (job.actualEnd ? job.actualEnd.split('T')[0] : new Date().toISOString().split('T')[0]);
    const empId = assignee.employeeId;
    const emp = await db.collection('employees').get(empId);
    const empName = emp ? emp.name : 'Technician';

    let amount = 0;
    if (assignee.payBasis === 'PerPoint') {
      amount = (Number(assignee.units) || Number(job.pointsCount) || 1) * (Number(assignee.rate) || 600);
    } else if (assignee.payBasis === 'PerJob') {
      amount = Number(assignee.rate) || 1500;
    } else if (assignee.payBasis === 'Daily') {
      amount = (Number(assignee.units) || 1) * (Number(assignee.rate) || 500);
    } else {
      amount = Number(assignee.rate) || 1000;
    }

    // 1. Create Payout record in Pending status
    const payoutId = `PAY-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const payout = {
      id: payoutId,
      employeeId: empId,
      employeeName: empName,
      jobId: job.id,
      date: postDate,
      type: "Job Earning",
      amount,
      direction: "CR",
      status: "Pending",
      paidAmount: 0,
      mode: null,
      reference: null,
      paidOn: null,
      remarks: `Job ${job.id}: ${job.title} (${assignee.role || 'Lead'} - ${assignee.payBasis || 'PerPoint'})`,
      approvedBy: null
    };

    await db.collection('payouts').create(payout);

    // 2. Post Ledger Credit (Company owes Employee)
    await this._appendLedgerEntry({
      employeeId: empId,
      date: postDate,
      refType: "Job",
      refId: job.id,
      narration: `Job Verified: ${job.id} - ${job.title} (${assignee.units || job.pointsCount || 1} units @ ₹${assignee.rate})`,
      credit: amount,
      debit: 0
    });

    return payout;
  }

  /**
   * Changes payout status with audit trails and automated debit ledger entries.
   */
  async updatePayoutStatus(payoutId, newStatus, paymentDetails = {}, currentUser = 'Aditya Sharma') {
    const payout = await db.collection('payouts').get(payoutId);
    if (!payout) throw new Error(`Payout ${payoutId} not found`);

    const oldStatus = payout.status;
    const updates = { status: newStatus };

    if (newStatus === 'Approved') {
      updates.approvedBy = currentUser;
      updates.approvedAt = new Date().toISOString();
    } else if (newStatus === 'Paid' || newStatus === 'Partially Paid') {
      const paidAmt = Number(paymentDetails.paidAmount) || (newStatus === 'Paid' ? payout.amount : 0);
      updates.paidAmount = (Number(payout.paidAmount) || 0) + paidAmt;
      updates.mode = paymentDetails.mode || 'UPI';
      updates.reference = paymentDetails.reference || `REF-${Date.now().toString().slice(-6)}`;
      updates.paidOn = paymentDetails.date || new Date().toISOString().split('T')[0];

      if (updates.paidAmount >= payout.amount) {
        updates.status = 'Paid';
      }

      // Post Debit Ledger Entry for the disbursed amount
      await this._appendLedgerEntry({
        employeeId: payout.employeeId,
        date: updates.paidOn,
        refType: "Payout",
        refId: payout.id,
        narration: `Disbursed via ${updates.mode} (Ref: ${updates.reference})${newStatus === 'Partially Paid' ? ' [Part Payment]' : ''}`,
        credit: 0,
        debit: paidAmt
      });
    } else if (newStatus === 'Cancelled') {
      // Reversing entry if previously credited
      if (payout.direction === 'CR') {
        await this._appendLedgerEntry({
          employeeId: payout.employeeId,
          date: new Date().toISOString().split('T')[0],
          refType: "Adjustment",
          refId: payout.id,
          narration: `REVERSAL: Payout ${payout.id} Cancelled (${payout.remarks})`,
          credit: 0,
          debit: payout.amount
        });
      }
    }

    const updated = await db.collection('payouts').update(payoutId, updates);

    // Audit log
    const auditLogs = db.collection('auditLogs');
    await auditLogs.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser,
      role: 'Staff Governance',
      action: 'PAYOUT_STATUS_CHANGED',
      module: 'PAYOUTS',
      details: `Payout ${payoutId} (${payout.employeeName}) transitioned from '${oldStatus}' to '${updates.status || newStatus}'`
    });

    return updated;
  }

  /**
   * Creates a manual payout entry (Advance, Bonus, Incentive, Deduction, Penalty, Reimbursement, Salary).
   */
  async createManualPayout(data, currentUser = 'Aditya Sharma') {
    const emp = await db.collection('employees').get(data.employeeId);
    if (!emp) throw new Error('Employee not found');

    const payoutId = `PAY-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const amount = Number(data.amount) || 0;
    const direction = (data.type === 'Deduction' || data.type === 'Penalty' || data.type === 'Advance') ? 'DR' : 'CR';

    const payout = {
      id: payoutId,
      employeeId: data.employeeId,
      employeeName: emp.name,
      jobId: data.jobId || null,
      date: data.date || new Date().toISOString().split('T')[0],
      type: data.type,
      amount,
      direction,
      status: data.status || (data.type === 'Advance' ? 'Paid' : 'Approved'),
      paidAmount: data.paidAmount || (data.type === 'Advance' ? amount : 0),
      mode: data.mode || (data.type === 'Advance' ? 'Cash' : null),
      reference: data.reference || null,
      paidOn: data.paidOn || (data.type === 'Advance' ? (data.date || new Date().toISOString().split('T')[0]) : null),
      remarks: data.remarks || `${data.type} adjustment`,
      approvedBy: currentUser
    };

    await db.collection('payouts').create(payout);

    // Append to ledger automatically
    if (direction === 'CR') {
      await this._appendLedgerEntry({
        employeeId: data.employeeId,
        date: payout.date,
        refType: "Payout",
        refId: payout.id,
        narration: `${payout.type}: ${payout.remarks}`,
        credit: amount,
        debit: 0
      });
    } else {
      await this._appendLedgerEntry({
        employeeId: data.employeeId,
        date: payout.date,
        refType: "Adjustment",
        refId: payout.id,
        narration: `${payout.type}: ${payout.remarks}${payout.mode ? ` (via ${payout.mode})` : ''}`,
        credit: 0,
        debit: amount
      });
    }

    return payout;
  }

  /**
   * Internal helper to append ledger entry with running balance computation.
   */
  async _appendLedgerEntry(entryData) {
    const entries = await db.collection('ledger').list(e => e.employeeId === entryData.employeeId);
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const currentBalance = entries.length > 0 ? entries[entries.length - 1].balanceAfter : 0;
    const credit = Number(entryData.credit) || 0;
    const debit = Number(entryData.debit) || 0;
    const newBalance = currentBalance + credit - debit;

    const newLedgerItem = {
      id: `LED-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`,
      employeeId: entryData.employeeId,
      date: entryData.date || new Date().toISOString().split('T')[0],
      refType: entryData.refType || "Adjustment",
      refId: entryData.refId || null,
      narration: entryData.narration,
      credit,
      debit,
      balanceAfter: newBalance
    };

    await db.collection('ledger').create(newLedgerItem);
    return newLedgerItem;
  }

  /**
   * Calculates comprehensive ledger statement for a given employee.
   */
  async getEmployeeLedger(employeeId, fromDate = null, toDate = null) {
    const emp = await db.collection('employees').get(employeeId);
    let allEntries = await db.collection('ledger').list(e => e.employeeId === employeeId);
    allEntries.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const cleanDate = (d) => String(d || '').slice(0, 10);

    // If "All Time" or fromDate starts at baseline 1970-01-01, opening balance is 0
    let openingBalance = 0;
    let filteredEntries = allEntries;

    if (fromDate && fromDate !== '1970-01-01') {
      const priorEntries = allEntries.filter(e => cleanDate(e.date) < fromDate);
      openingBalance = priorEntries.reduce((sum, e) => sum + (Number(e.credit) || 0) - (Number(e.debit) || 0), 0);
      filteredEntries = filteredEntries.filter(e => cleanDate(e.date) >= fromDate);
    }

    if (toDate && toDate < '2099-01-01') {
      filteredEntries = filteredEntries.filter(e => cleanDate(e.date) <= toDate);
    }

    let running = openingBalance;
    const computedEntries = filteredEntries.map(e => {
      running += (Number(e.credit) || 0) - (Number(e.debit) || 0);
      return {
        ...e,
        balanceAfter: running
      };
    });

    const totalCredit = computedEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
    const totalDebit = computedEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
    const closingBalance = running;

    // Strict Double-Entry Ledger Assertion: Opening + Credits - Debits = Closing
    const identityCheck = Math.abs((openingBalance + totalCredit - totalDebit) - closingBalance) < 0.001;
    if (!identityCheck) {
      console.error(`Ledger Identity Assertion Failed for ${employeeId}: ${openingBalance} + ${totalCredit} - ${totalDebit} !== ${closingBalance}`);
    }

    return {
      employee: emp,
      openingBalance,
      entries: computedEntries,
      totalCredit,
      totalDebit,
      closingBalance,
      isReconciled: identityCheck,
      balanceType: closingBalance >= 0 ? 'Payable' : 'Recoverable'
    };
  }

  /**
   * Computes Payables Summary with aging buckets across all employees.
   */
  async getPayablesSummary() {
    const employees = await db.collection('employees').list();
    const payouts = await db.collection('payouts').list();
    const now = new Date();

    const summary = employees.map(emp => {
      const empPayouts = payouts.filter(p => p.employeeId === emp.id);

      const totalEarned = empPayouts
        .filter(p => p.type === 'Job Earning' || p.type === 'Bonus' || p.type === 'Incentive' || p.type === 'Reimbursement' || p.type === 'Salary')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const totalPaid = empPayouts.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
      const totalAdvances = empPayouts
        .filter(p => p.type === 'Advance')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const closingBalance = totalEarned - totalPaid - totalAdvances;

      // Aging buckets for pending/approved dues
      let bucket0to7 = 0;
      let bucket8to30 = 0;
      let bucket30Plus = 0;

      empPayouts
        .filter(p => p.status === 'Pending' || p.status === 'Approved' || p.status === 'Partially Paid')
        .forEach(p => {
          const balance = (Number(p.amount) || 0) - (Number(p.paidAmount) || 0);
          const pDate = new Date(p.date);
          const daysOld = Math.floor((now - pDate) / (1000 * 60 * 60 * 24));

          if (daysOld <= 7) bucket0to7 += balance;
          else if (daysOld <= 30) bucket8to30 += balance;
          else bucket30Plus += balance;
        });

      return {
        employee: emp,
        totalEarned,
        totalPaid,
        totalAdvances,
        closingBalance,
        balanceType: closingBalance >= 0 ? 'Payable' : 'Recoverable',
        bucket0to7,
        bucket8to30,
        bucket30Plus
      };
    });

    const totalPayableOverall = summary.reduce((sum, s) => sum + (s.closingBalance > 0 ? s.closingBalance : 0), 0);
    const totalRecoverableOverall = summary.reduce((sum, s) => sum + (s.closingBalance < 0 ? Math.abs(s.closingBalance) : 0), 0);

    return {
      summary,
      totalPayableOverall,
      totalRecoverableOverall
    };
  }

  /**
   * Settles all approved dues for an employee in one go.
   */
  async settleAllApproved(employeeId, paymentDetails = {}, currentUser = 'Aditya Sharma') {
    const payouts = await db.collection('payouts').list(p => p.employeeId === employeeId && p.status === 'Approved');
    if (!payouts.length) return { settledCount: 0, totalSettled: 0 };

    let totalSettled = 0;
    for (const p of payouts) {
      const remaining = p.amount - (Number(p.paidAmount) || 0);
      if (remaining > 0) {
        await this.updatePayoutStatus(p.id, 'Paid', {
          paidAmount: remaining,
          mode: paymentDetails.mode || 'UPI',
          reference: paymentDetails.reference || `SETTLE-${Date.now().toString().slice(-6)}`,
          date: paymentDetails.date || new Date().toISOString().split('T')[0]
        }, currentUser);
        totalSettled += remaining;
      }
    }

    return { settledCount: payouts.length, totalSettled };
  }

  /**
   * Ledger integrity check: recomputes balances from raw entries and flags any discrepancies.
   */
  async checkLedgerIntegrity() {
    const employees = await db.collection('employees').list();
    const ledger = await db.collection('ledger').list();
    const payouts = await db.collection('payouts').list();
    const issues = [];

    employees.forEach(emp => {
      const empEntries = ledger.filter(e => e.employeeId === emp.id);
      empEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

      let expected = 0;
      empEntries.forEach((entry, idx) => {
        expected += (Number(entry.credit) || 0) - (Number(entry.debit) || 0);
        if (Math.abs(expected - (Number(entry.balanceAfter) || 0)) > 0.01) {
          issues.push({
            employeeId: emp.id,
            employeeName: emp.name,
            entryId: entry.id,
            recordedBalance: entry.balanceAfter,
            calculatedBalance: expected,
            message: `Discrepancy at entry ${entry.id}: recorded ${entry.balanceAfter}, calculated ${expected}`
          });
        }
      });
    });

    return {
      passed: issues.length === 0,
      healthy: issues.length === 0,
      totalEntriesChecked: ledger.length,
      employeesCheckedCount: employees.length,
      discrepancies: issues,
      issues
    };
  }
}

export const ledgerService = new LedgerService();
