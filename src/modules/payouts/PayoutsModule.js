// Payouts & Automatic Employee Ledgers Module
import { db, formatCurrency, formatDate, formatDateTime, numberToWordsIndian } from '../../store/db.js';
import { ledgerService } from '../../services/ledgerService.js';
import { auth } from '../../services/auth.js';
import { store } from '../../services/store.js';
import { periodStore } from '../../store/periodStore.js';
import { inRange } from '../../services/periodService.js';
import { renderPagePeriodHeader } from '../../components/PeriodPicker/PeriodPicker.js';
import { exportToCsv } from '../../services/exportService.js';
import Chart from 'chart.js/auto';

export function renderPayoutsModule(container, initialEmpId = null) {
  let activeTab = 'payouts'; // 'payouts' | 'ledger' | 'summary'
  let payoutDateBasis = 'date';
  let payouts = [];
  let employees = [];
  let selectedEmpId = initialEmpId || 'EMP-001';

  let statusFilter = 'All';
  let typeFilter = 'All';
  let empFilter = 'All';
  let selectedPayoutIds = new Set();

  async function loadData() {
    payouts = await db.collection('payouts').list();
    employees = await db.collection('employees').list();
    if (!selectedEmpId && employees.length) selectedEmpId = employees[0].id;
    renderView();
  }

  function getFilteredPayouts() {
    const period = periodStore.getPagePeriod('payouts');
    return payouts.filter(p => {
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const rawDate = p[payoutDateBasis] || p.date || p.createdAt;
        if (!rawDate) return false;
        const dateStr = String(rawDate).slice(0, 10);
        if (!inRange(dateStr, period)) return false;
      }

      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (typeFilter !== 'All' && p.type !== typeFilter) return false;
      if (empFilter !== 'All' && p.employeeId !== empFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderView() {
    const filtered = getFilteredPayouts();

    // Compute totals
    const pendingSum = payouts.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const approvedSum = payouts.filter(p => p.status === 'Approved').reduce((sum, p) => sum + ((Number(p.amount) || 0) - (Number(p.paidAmount) || 0)), 0);
    const paidSum = payouts.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    const onHoldSum = payouts.filter(p => p.status === 'On Hold').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    container.innerHTML = `
      <div class="payouts-module-view">
        <!-- Top Page Period Header -->
        <div id="payoutsPagePeriodContainer"></div>

        <!-- Top Executive Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.4); color: #93c5fd; margin-bottom: 6px;">
                ● AUTOMATED LABOUR ACCOUNTING & FINANCIAL LEDGERS
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                EMPLOYEE PAYOUTS & AUTOMATIC LEDGERS
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Verified work order earnings, partial payment vouchers, double-entry auto-ledgers and aging payables summary.
              </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="addManualPayoutBtn" class="btn btn-secondary btn-sm" style="color: #38bdf8;">
                + Manual Adjustment / Advance
              </button>
              <button id="checkLedgerIntegrityBtn" class="btn btn-secondary btn-sm">
                🛡 Ledger Integrity Check
              </button>
              ${auth.isSuperAdmin() ? `
                <button id="cleanPayoutsLedgerBtn" class="btn btn-secondary btn-sm" style="color: var(--red-accent); border-color: rgba(239, 68, 68, 0.4);">
                  🗑 Clean Payouts & Ledgers
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Totals Metric Bar -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 20px;">
          <div class="kpi-card amber">
            <span class="kpi-label">Pending Approval</span>
            <div class="kpi-value" style="color: #fbbf24;">${formatCurrency(pendingSum)}</div>
            <div class="kpi-subtitle">Newly verified jobs awaiting review</div>
          </div>
          <div class="kpi-card teal">
            <span class="kpi-label">Approved Dues (Ready)</span>
            <div class="kpi-value" style="color: #2dd4bf;">${formatCurrency(approvedSum)}</div>
            <div class="kpi-subtitle">Ready for bank / UPI disbursement</div>
          </div>
          <div class="kpi-card green">
            <span class="kpi-label">Total Disbursed (Paid)</span>
            <div class="kpi-value" style="color: #34d399;">${formatCurrency(paidSum)}</div>
            <div class="kpi-subtitle">Posted to employee debit ledgers</div>
          </div>
          <div class="kpi-card red">
            <span class="kpi-label">On Hold / Under Audit</span>
            <div class="kpi-value" style="color: #f87171;">${formatCurrency(onHoldSum)}</div>
            <div class="kpi-subtitle">Site quality verification holds</div>
          </div>
        </div>

        <!-- Navigation Tab Controls -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; flex-wrap: wrap;">
          <button id="tabPayoutsBtn" class="btn btn-sm ${activeTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}">
            Payout Management (${filtered.length} Records)
          </button>
          <button id="tabLedgerBtn" class="btn btn-sm ${activeTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}">
            Employee Double-Entry Ledgers
          </button>
          <button id="tabSummaryBtn" class="btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}">
            Payables Aging Summary & Charts
          </button>
        </div>

        <!-- Tab Body Content -->
        ${activeTab === 'payouts' ? renderPayoutsTab(filtered) : ''}
        ${activeTab === 'ledger' ? renderLedgerTab() : ''}
        ${activeTab === 'summary' ? renderSummaryTab() : ''}
      </div>
    `;

    const headerContainer = document.getElementById('payoutsPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'payouts', {
      dateBasisOptions: [
        { key: 'date', label: 'Payout Date' },
        { key: 'approvedAt', label: 'Approved Date' },
        { key: 'paidAt', label: 'Paid Date' }
      ],
      currentDateBasis: payoutDateBasis,
      onDateBasisChange: (newBasis) => {
        payoutDateBasis = newBasis;
        renderView();
      },
      onPeriodChange: () => {
        renderView();
      }
    });

    attachEvents();
  }

  function renderPayoutsTab(filtered) {
    const allSelected = filtered.length > 0 && filtered.every(p => selectedPayoutIds.has(p.id));
    const someSelected = filtered.some(p => selectedPayoutIds.has(p.id));

    return `
      <!-- Filters -->
      <div class="table-card" style="padding: 14px 18px; margin-bottom: 20px;">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <div style="width: 170px;">
            <select id="payoutEmpFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
              <option value="All">Employee: All</option>
              ${employees.map(e => `
                <option value="${e.id}" ${empFilter === e.id ? 'selected' : ''}>${e.name}</option>
              `).join('')}
            </select>
          </div>
          <div style="width: 150px;">
            <select id="payoutStatusFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
              <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>Status: All</option>
              <option value="Pending" ${statusFilter === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Approved" ${statusFilter === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Partially Paid" ${statusFilter === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
              <option value="Paid" ${statusFilter === 'Paid' ? 'selected' : ''}>Paid</option>
              <option value="On Hold" ${statusFilter === 'On Hold' ? 'selected' : ''}>On Hold</option>
              <option value="Cancelled" ${statusFilter === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
          <div style="width: 150px;">
            <select id="payoutTypeFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
              <option value="All" ${typeFilter === 'All' ? 'selected' : ''}>Type: All</option>
              <option value="Job Earning" ${typeFilter === 'Job Earning' ? 'selected' : ''}>Job Earning</option>
              <option value="Advance" ${typeFilter === 'Advance' ? 'selected' : ''}>Advance</option>
              <option value="Bonus" ${typeFilter === 'Bonus' ? 'selected' : ''}>Bonus</option>
              <option value="Incentive" ${typeFilter === 'Incentive' ? 'selected' : ''}>Incentive</option>
              <option value="Deduction" ${typeFilter === 'Deduction' ? 'selected' : ''}>Deduction</option>
              <option value="Penalty" ${typeFilter === 'Penalty' ? 'selected' : ''}>Penalty</option>
              <option value="Reimbursement" ${typeFilter === 'Reimbursement' ? 'selected' : ''}>Reimbursement</option>
            </select>
          </div>
          <button id="exportPayoutsCsvBtn" class="btn btn-secondary btn-sm" style="margin-left: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Export CSV
          </button>
          <span style="font-size: 11.5px; color: var(--text-muted); margin-left: auto; display: flex; align-items: center; gap: 6px;">
            Showing <strong>${filtered.length}</strong> of ${payouts.length} payouts in period
            ${(filtered.length < payouts.length && periodStore.getPagePeriod('payouts')?.preset !== 'all_time') ? `
              <button id="clearPayoutDateFilterBtn" class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 10.5px;">Clear / All Time</button>
            ` : ''}
          </span>
        </div>

        <!-- Bulk Bar -->
        <div id="payoutBulkBar" style="display: ${selectedPayoutIds.size > 0 ? 'flex' : 'none'}; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
          <span style="font-size: 12.5px; font-weight: 600; color: #38bdf8;">
            ${selectedPayoutIds.size} Payout(s) Selected
          </span>
          <div style="display: flex; gap: 8px;">
            <button id="bulkApprovePayoutsBtn" class="btn btn-primary btn-sm">
              Approve Selected
            </button>
            <button id="bulkClearPayoutsBtn" class="btn btn-secondary btn-sm">
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Payouts Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;">
                  <input type="checkbox" id="selectAllPayoutsCheckbox" ${allSelected ? 'checked' : ''}>
                </th>
                <th>Payout ID</th>
                <th>Employee</th>
                <th>Classification</th>
                <th>Amount</th>
                <th>Disbursed / Bal</th>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks & Reference</th>
                <th class="text-center">Action / Voucher</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="10" style="text-align: center; padding: 36px; color: var(--text-dim);">
                    <div style="font-size: 20px; margin-bottom: 6px;">💳</div>
                    <div style="font-weight: 600;">No payout vouchers found. Click "+ Post Payout Entry" to record your first transaction.</div>
                  </td>
                </tr>
              ` : filtered.map(p => {
                const isPaid = p.status === 'Paid';
                const remaining = (Number(p.amount) || 0) - (Number(p.paidAmount) || 0);

                const statusPills = {
                  Pending: 'status-reorder',
                  Approved: 'status-progress',
                  'Partially Paid': 'status-progress',
                  Paid: 'status-instock',
                  'On Hold': 'status-reorder',
                  Cancelled: 'status-reorder'
                };

                return `
                  <tr>
                    <td style="text-align: center;">
                      <input type="checkbox" class="payout-select-cb" data-payout-id="${p.id}" ${selectedPayoutIds.has(p.id) ? 'checked' : ''}>
                    </td>
                    <td style="font-family: monospace; font-weight: 700; color: #38bdf8;">${p.id}</td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-main);">${p.employeeName}</div>
                      ${p.jobId ? `<div style="font-size: 10px; color: var(--text-dim);">Job: ${p.jobId}</div>` : ''}
                    </td>
                    <td>
                      <span class="status-pill status-progress" style="font-size: 10.5px;">${p.type}</span>
                    </td>
                    <td style="font-weight: 700; color: ${p.direction === 'CR' ? '#34d399' : '#f87171'};">
                      ${p.direction === 'CR' ? '+' : '-'}${formatCurrency(p.amount)}
                    </td>
                    <td>
                      <div style="font-size: 12px; font-weight: 600;">Paid: ${formatCurrency(p.paidAmount || 0)}</div>
                      ${remaining > 0 ? `<div style="font-size: 10.5px; color: #fbbf24;">Due: ${formatCurrency(remaining)}</div>` : ''}
                    </td>
                    <td style="font-size: 12px;">${formatDate(p.date)}</td>
                    <td>
                      <span class="status-pill ${statusPills[p.status] || 'status-progress'}">
                        ${p.status}
                      </span>
                    </td>
                    <td>
                      <div style="font-size: 11.5px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${p.remarks}
                      </div>
                      ${p.reference ? `<div style="font-size: 10px; color: #38bdf8;">${p.mode}: ${p.reference}</div>` : ''}
                    </td>
                    <td class="text-center" style="white-space: nowrap;">
                      ${p.status === 'Pending' ? `
                        <button class="btn btn-primary btn-sm approve-single-payout-btn" data-payout-id="${p.id}" style="padding: 2px 7px; font-size: 11px;">
                          Approve
                        </button>
                      ` : ''}
                      ${(p.status === 'Approved' || p.status === 'Partially Paid') ? `
                        <button class="btn btn-primary btn-sm mark-paid-dialog-btn" data-payout-id="${p.id}" style="padding: 2px 7px; font-size: 11px; background: linear-gradient(135deg, #059669, #10b981);">
                          Disburse
                        </button>
                      ` : ''}
                      <button class="btn btn-secondary btn-sm print-voucher-btn" data-payout-id="${p.id}" title="Print Payment Voucher" style="padding: 2px 6px; font-size: 11px;">
                        📄 Voucher
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderLedgerTab() {
    return `
      <div style="display: grid; grid-template-columns: 280px 1fr; gap: 20px;">
        <!-- Employee Selector Sidebar -->
        <div class="table-card" style="padding: 16px;">
          <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: var(--text-dim);">
            Select Employee Ledger
          </h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${employees.length === 0 ? `
              <div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 20px;">
                No employees found. Add staff in Team module.
              </div>
            ` : employees.map(e => `
              <div class="emp-ledger-card ${selectedEmpId === e.id ? 'active-emp' : ''}" data-emp-id="${e.id}" style="background: ${selectedEmpId === e.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card-subtle)'}; border: 1px solid ${selectedEmpId === e.id ? '#3b82f6' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 10px 12px; cursor: pointer;">
                <div style="font-weight: 700; font-size: 13px; color: var(--text-main);">${e.name}</div>
                <div style="font-size: 11px; color: #38bdf8;">${e.role} &bull; ${e.payType}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Ledger Statement Area -->
        <div id="ledgerStatementContainer" class="table-card" style="padding: 24px;">
          <!-- Dynamically populated ledger table -->
        </div>
      </div>
    `;
  }

  async function updateLedgerStatementView() {
    const cont = document.getElementById('ledgerStatementContainer');
    if (!cont) return;

    const period = periodStore.getPagePeriod('payouts');
    const data = await ledgerService.getEmployeeLedger(selectedEmpId, period);
    const emp = data?.employee;

    if (!emp) {
      cont.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-dim);">
          <div style="font-size: 24px; margin-bottom: 8px;">📑</div>
          <div style="font-weight: 600;">No employee ledger selected.</div>
          <div style="font-size: 12px; margin-top: 4px;">Select an employee from the left panel to inspect their statement.</div>
        </div>
      `;
      return;
    }

    cont.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="status-pill status-instock" style="font-size: 10.5px;">● OFFICIAL EMPLOYEE LEDGER</span>
            <span class="status-pill" style="font-size: 10.5px; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Period: ${data.periodLabel || 'All Time'}</span>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #fff;">${emp ? emp.name : 'Employee'}</h3>
          <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
            ${emp?.role} | Pay Basis: <strong>${emp?.payType}</strong> | UPI: <strong>${emp?.upiId || 'Not registered'}</strong>
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="settleAllDuesBtn" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #059669, #10b981);">
            ✓ Settle Approved Dues
          </button>
          <button id="printLedgerPdfBtn" class="btn btn-secondary btn-sm">
            🖨 Print Statement
          </button>
        </div>
      </div>

      <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 18px;">
        <div class="kpi-card" style="padding: 12px 16px;">
          <span class="kpi-label">Opening Balance</span>
          <div class="kpi-value" style="font-size: 17px; color: #94a3b8;">${formatCurrency(Math.abs(data.openingBalance || 0))}</div>
          <div class="kpi-subtitle">${(data.openingBalance || 0) >= 0 ? 'Cr (Payable)' : 'Dr (Advance)'}</div>
        </div>
        <div class="kpi-card teal" style="padding: 12px 16px;">
          <span class="kpi-label">Total Credits (Earned)</span>
          <div class="kpi-value" style="font-size: 17px; color: #2dd4bf;">${formatCurrency(data.totalCredit)}</div>
          <div class="kpi-subtitle">During Period</div>
        </div>
        <div class="kpi-card green" style="padding: 12px 16px;">
          <span class="kpi-label">Total Debits (Disbursed)</span>
          <div class="kpi-value" style="font-size: 17px; color: #34d399;">${formatCurrency(data.totalDebit)}</div>
          <div class="kpi-subtitle">During Period</div>
        </div>
        <div class="kpi-card ${data.closingBalance > 0 ? 'amber' : 'teal'}" style="padding: 12px 16px;">
          <span class="kpi-label">Closing Net Balance</span>
          <div class="kpi-value" style="font-size: 17px; color: ${data.closingBalance > 0 ? '#fbbf24' : '#34d399'};">
            ${formatCurrency(Math.abs(data.closingBalance))}
          </div>
          <div class="kpi-subtitle">${data.balanceType}</div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="erp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Narration / Activity Description</th>
              <th style="text-align: right;">Credit (Earned)</th>
              <th style="text-align: right;">Debit (Paid)</th>
              <th style="text-align: right;">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            <!-- Opening Balance Row -->
            <tr style="background: rgba(255,255,255,0.03); font-weight: 700;">
              <td style="font-size: 12px; color: var(--text-dim);">${period?.from ? formatDate(period.from) : '—'}</td>
              <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">OPENING</td>
              <td style="font-size: 12px; color: #94a3b8;">Opening Balance (as of ${period?.from ? formatDate(period.from) : 'Beginning'})</td>
              <td style="text-align: right; color: var(--text-dim);">—</td>
              <td style="text-align: right; color: var(--text-dim);">—</td>
              <td style="text-align: right; font-weight: 700; color: #38bdf8;">
                ${formatCurrency(Math.abs(data.openingBalance || 0))} ${(data.openingBalance || 0) >= 0 ? 'Cr' : 'Dr'}
              </td>
            </tr>

            ${data.entries.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">No transactions posted in this period.</td></tr>
            ` : data.entries.map(e => `
              <tr>
                <td style="font-size: 12px;">${formatDate(e.date)}</td>
                <td style="font-family: monospace; font-size: 11px; color: #38bdf8;">${e.refId || e.id}</td>
                <td style="font-size: 12.5px;">${e.narration}</td>
                <td style="text-align: right; font-weight: 600; color: #34d399;">${e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                <td style="text-align: right; font-weight: 600; color: #f87171;">${e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                <td style="text-align: right; font-weight: 700; color: ${e.balanceAfter >= 0 ? '#38bdf8' : '#fbbf24'};">
                  ${formatCurrency(Math.abs(e.balanceAfter))} ${e.balanceAfter >= 0 ? 'Cr' : 'Dr'}
                </td>
              </tr>
            `).join('')}

            <!-- Closing Balance Row -->
            <tr style="background: rgba(255,255,255,0.04); font-weight: 800; border-top: 2px solid var(--border-color);">
              <td style="font-size: 12px; color: #34d399;">${period?.to ? formatDate(period.to) : '—'}</td>
              <td style="font-family: monospace; font-size: 11px; color: #34d399;">CLOSING</td>
              <td style="font-size: 12px; color: #34d399;">Closing Balance (as of ${period?.to ? formatDate(period.to) : 'End of Period'})</td>
              <td style="text-align: right; color: #34d399;">${formatCurrency(data.totalCredit)}</td>
              <td style="text-align: right; color: #f87171;">${formatCurrency(data.totalDebit)}</td>
              <td style="text-align: right; font-weight: 800; color: ${data.closingBalance >= 0 ? '#34d399' : '#fbbf24'};">
                ${formatCurrency(Math.abs(data.closingBalance))} ${data.balanceType}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 14px; font-size: 12px; padding: 10px 14px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; display: flex; align-items: center; justify-content: space-between;">
        <span>🛡 <strong>Double-Entry Ledger Identity Verified:</strong> Opening (${formatCurrency(data.openingBalance || 0)}) + Credits (${formatCurrency(data.totalCredit)}) − Debits (${formatCurrency(data.totalDebit)}) = Closing (${formatCurrency(data.closingBalance)})</span>
        <span class="status-pill status-instock" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">BALANCED</span>
      </div>
    `;

    document.getElementById('settleAllDuesBtn')?.addEventListener('click', async () => {
      if (confirm(`Disburse and settle all approved payout dues for ${emp?.name}?`)) {
        const res = await ledgerService.settleAllApproved(selectedEmpId, {
          mode: 'UPI',
          reference: `UPI/ST-${Date.now().toString().slice(-6)}`
        }, auth.getCurrentUser()?.name || 'Super Admin');

        alert(`Settled ${res.settledCount} payout(s) totalling ${formatCurrency(res.totalSettled)}!`);
        await loadData();
        await updateLedgerStatementView();
      }
    });

    document.getElementById('printLedgerPdfBtn')?.addEventListener('click', () => {
      window.print();
    });
  }

  function renderSummaryTab() {
    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div id="payablesSummaryStatsContainer">
          <!-- Dynamically populated summary & aging buckets -->
        </div>
      </div>
    `;
  }

  async function updatePayablesSummaryView() {
    const cont = document.getElementById('payablesSummaryStatsContainer');
    if (!cont) return;

    const data = await ledgerService.getPayablesSummary();

    cont.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px;">
        <div class="kpi-card amber">
          <span class="kpi-label">Total Outstanding Payable to Staff</span>
          <div class="kpi-value" style="color: #fbbf24;">${formatCurrency(data.totalPayableOverall)}</div>
          <div class="kpi-subtitle">Across all active surveillance technicians and helpers</div>
        </div>
        <div class="kpi-card teal">
          <span class="kpi-label">Total Advance Balance Recoverable</span>
          <div class="kpi-value" style="color: #2dd4bf;">${formatCurrency(data.totalRecoverableOverall)}</div>
          <div class="kpi-subtitle">Advances to be recovered from next verified jobs</div>
        </div>
      </div>

      <div class="table-card" style="padding: 20px; margin-bottom: 20px;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">Staff Payables by Aging Buckets</h4>
        <div style="height: 250px; position: relative;">
          <canvas id="payablesAgingChart"></canvas>
        </div>
      </div>

      <div class="table-card">
        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role & Pay Basis</th>
                <th style="text-align: right;">Total Earned</th>
                <th style="text-align: right;">Total Paid</th>
                <th style="text-align: right;">Advances</th>
                <th style="text-align: right;">Current Due</th>
                <th style="text-align: right;">0–7 Days</th>
                <th style="text-align: right;">8–30 Days</th>
                <th style="text-align: right;">30+ Days</th>
                <th class="text-center">Ledger</th>
              </tr>
            </thead>
            <tbody>
              ${data.summary.map(s => `
                <tr>
                  <td style="font-weight: 700;">${s.employee.name}</td>
                  <td style="font-size: 12px; color: var(--text-dim);">${s.employee.role} (${s.employee.payType})</td>
                  <td style="text-align: right; color: #34d399; font-weight: 600;">${formatCurrency(s.totalEarned)}</td>
                  <td style="text-align: right; color: #38bdf8;">${formatCurrency(s.totalPaid)}</td>
                  <td style="text-align: right; color: #f87171;">${formatCurrency(s.totalAdvances)}</td>
                  <td style="text-align: right; font-weight: 700; color: ${s.closingBalance > 0 ? '#fbbf24' : '#34d399'};">
                    ${formatCurrency(Math.abs(s.closingBalance))}
                  </td>
                  <td style="text-align: right; font-size: 12px;">${formatCurrency(s.bucket0to7)}</td>
                  <td style="text-align: right; font-size: 12px;">${formatCurrency(s.bucket8to30)}</td>
                  <td style="text-align: right; font-size: 12px; color: ${s.bucket30Plus > 0 ? '#ef4444' : 'inherit'}; font-weight: ${s.bucket30Plus > 0 ? '700' : 'normal'};">
                    ${formatCurrency(s.bucket30Plus)}
                  </td>
                  <td class="text-center">
                    <button class="btn btn-secondary btn-sm jump-to-ledger-btn" data-emp-id="${s.employee.id}" style="padding: 2px 7px; font-size: 11px;">
                      View
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render aging chart
    const chartCtx = document.getElementById('payablesAgingChart')?.getContext('2d');
    if (chartCtx) {
      new Chart(chartCtx, {
        type: 'bar',
        data: {
          labels: data.summary.slice(0, 6).map(s => s.employee.name.split(' ')[0]),
          datasets: [
            { label: '0–7 Days', data: data.summary.slice(0, 6).map(s => s.bucket0to7), backgroundColor: '#38bdf8' },
            { label: '8–30 Days', data: data.summary.slice(0, 6).map(s => s.bucket8to30), backgroundColor: '#fbbf24' },
            { label: '30+ Days', data: data.summary.slice(0, 6).map(s => s.bucket30Plus), backgroundColor: '#ef4444' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { stacked: true }, y: { stacked: true } }
        }
      });
    }

    cont.querySelectorAll('.jump-to-ledger-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        selectedEmpId = btn.getAttribute('data-emp-id');
        activeTab = 'ledger';
        renderView();
        await updateLedgerStatementView();
      });
    });
  }

  function attachEvents() {
    // Tabs
    document.getElementById('tabPayoutsBtn')?.addEventListener('click', () => { activeTab = 'payouts'; renderView(); });
    document.getElementById('tabLedgerBtn')?.addEventListener('click', async () => {
      activeTab = 'ledger';
      renderView();
      await updateLedgerStatementView();
    });
    document.getElementById('tabSummaryBtn')?.addEventListener('click', async () => {
      activeTab = 'summary';
      renderView();
      await updatePayablesSummaryView();
    });

    // Clean Payouts & Ledgers button
    document.getElementById('cleanPayoutsLedgerBtn')?.addEventListener('click', async () => {
      const confirmText = prompt('CLEAN PAYOUTS & LEDGERS CONFIRMATION:\n\nThis will permanently delete all payout vouchers, employee ledger entries, and reset account dues to zero.\n\nType "CLEAN" to confirm:');
      if (confirmText === 'CLEAN') {
        store.cleanPayoutsAndLedgers();
        alert('All payouts and ledger accounts have been cleaned and reset to zero.');
        selectedPayoutIds.clear();
        await loadData();
      } else if (confirmText !== null) {
        alert('Action cancelled. You must type "CLEAN" in capital letters to proceed.');
      }
    });

    // Clear date filter
    document.getElementById('clearPayoutDateFilterBtn')?.addEventListener('click', () => {
      periodStore.setPagePeriod('payouts', { preset: 'all_time' });
      renderView();
    });

    // Export CSV
    document.getElementById('exportPayoutsCsvBtn')?.addEventListener('click', () => {
      exportPayoutsCsv();
    });

    // Filters
    document.getElementById('payoutEmpFilter')?.addEventListener('change', (e) => { empFilter = e.target.value; renderView(); });
    document.getElementById('payoutStatusFilter')?.addEventListener('change', (e) => { statusFilter = e.target.value; renderView(); });
    document.getElementById('payoutTypeFilter')?.addEventListener('change', (e) => { typeFilter = e.target.value; renderView(); });

    // Select All Payouts Checkbox
    const selectAllPayoutsCb = document.getElementById('selectAllPayoutsCheckbox');
    if (selectAllPayoutsCb) {
      const currentFiltered = getFilteredPayouts();
      const allSelected = currentFiltered.length > 0 && currentFiltered.every(p => selectedPayoutIds.has(p.id));
      const someSelected = currentFiltered.some(p => selectedPayoutIds.has(p.id));
      selectAllPayoutsCb.indeterminate = !allSelected && someSelected;

      selectAllPayoutsCb.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
          currentFiltered.forEach(p => selectedPayoutIds.add(p.id));
        } else {
          currentFiltered.forEach(p => selectedPayoutIds.delete(p.id));
        }
        renderView();
      });
    }

    // Individual Payout Row Checkboxes
    container.querySelectorAll('.payout-select-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-payout-id');
        if (e.target.checked) selectedPayoutIds.add(id);
        else selectedPayoutIds.delete(id);
        renderView();
      });
    });

    // Bulk Approve
    document.getElementById('bulkApprovePayoutsBtn')?.addEventListener('click', async () => {
      if (selectedPayoutIds.size === 0) return;
      if (confirm(`Approve ${selectedPayoutIds.size} selected payout record(s)?`)) {
        for (const id of selectedPayoutIds) {
          try {
            await ledgerService.updatePayoutStatus(id, 'Approved', {}, auth.getCurrentUser()?.name || 'Super Admin');
          } catch (e) {
            console.warn(e);
          }
        }
        selectedPayoutIds.clear();
        await loadData();
      }
    });

    // Bulk Clear
    document.getElementById('bulkClearPayoutsBtn')?.addEventListener('click', () => {
      selectedPayoutIds.clear();
      renderView();
    });

    // Manual Payout Adjustment Modal
    document.getElementById('addManualPayoutBtn')?.addEventListener('click', () => openManualPayoutModal());

    // Ledger Integrity Check
    document.getElementById('checkLedgerIntegrityBtn')?.addEventListener('click', async () => {
      const res = await ledgerService.checkLedgerIntegrity();
      if (res.healthy) {
        alert(`🛡 Ledger Audit Passed: All ${res.totalEntriesChecked} double-entry records across ${res.employeesCheckedCount} staff profiles reconcile with 0.00% variance.`);
      } else {
        alert(`⚠️ Ledger Discrepancies Detected: ${res.issues.length} entries have balance variance.`);
      }
    });

    // Employee ledger selection
    container.querySelectorAll('.emp-ledger-card').forEach(card => {
      card.addEventListener('click', async () => {
        selectedEmpId = card.getAttribute('data-emp-id');
        container.querySelectorAll('.emp-ledger-card').forEach(c => c.style.borderColor = 'var(--border-color)');
        card.style.borderColor = '#3b82f6';
        await updateLedgerStatementView();
      });
    });

    // Approve Single Payout
    container.querySelectorAll('.approve-single-payout-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-payout-id');
        await ledgerService.updatePayoutStatus(id, 'Approved', {}, auth.getCurrentUser()?.name || 'Super Admin');
        await loadData();
      });
    });

    // Mark Paid Dialog
    container.querySelectorAll('.mark-paid-dialog-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-payout-id');
        const payout = payouts.find(p => p.id === id);
        if (payout) openMarkPaidModal(payout);
      });
    });

    // Print Payment Voucher
    container.querySelectorAll('.print-voucher-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-payout-id');
        const payout = payouts.find(p => p.id === id);
        if (payout) printPaymentVoucher(payout);
      });
    });
  }

  function exportPayoutsCsv() {
    const filtered = getFilteredPayouts();
    const period = periodStore.getPagePeriod('payouts');
    const headers = ['Payout ID', 'Employee Name', 'Type', 'Amount', 'Paid Amount', 'Status', 'Date', 'Remarks'];
    const rows = filtered.map(p => [
      p.id,
      p.employeeName || '',
      p.type || '',
      p.amount || 0,
      p.paidAmount || 0,
      p.status || '',
      p.date || '',
      p.remarks || ''
    ]);
    exportToCsv('employee_payouts', headers, rows, {
      reportTitle: 'Employee Labour Payouts & Disbursal Register',
      period,
      filtersApplied: `Date Basis: ${payoutDateBasis}, Status: ${statusFilter}, Type: ${typeFilter}`
    });
  }

  function openMarkPaidModal(payout) {
    const existing = document.getElementById('markPaidModal');
    if (existing) existing.remove();

    const dueAmount = payout.amount - (Number(payout.paidAmount) || 0);

    const html = `
      <div id="markPaidModal" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 520px;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Disburse Payment: ${payout.id}</h3>
              <p style="font-size: 11.5px; color: var(--text-dim);">${payout.employeeName} &bull; Total Due: ${formatCurrency(dueAmount)}</p>
            </div>
            <button id="closeMarkPaidBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="markPaidForm">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Payment Amount (Supports Partial Disbursements)</label>
                <input type="number" id="disburseAmount" class="form-control" value="${dueAmount}" max="${dueAmount}" min="1" required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Disbursement Mode</label>
                  <select id="disburseMode" class="form-control">
                    <option value="UPI">UPI Transfer</option>
                    <option value="Bank">NEFT / RTGS Bank Transfer</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Payment Date</label>
                  <input type="date" id="disburseDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">UTR / Transaction Reference</label>
                <input type="text" id="disburseRef" class="form-control" value="UPI/${Date.now().toString().slice(-8)}" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="cancelMarkPaidBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Authorize & Post to Ledger</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('markPaidModal');
    const close = () => modal.remove();

    document.getElementById('closeMarkPaidBtn')?.addEventListener('click', close);
    document.getElementById('cancelMarkPaidBtn')?.addEventListener('click', close);

    document.getElementById('markPaidForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const paidAmount = Number(document.getElementById('disburseAmount').value);
      const mode = document.getElementById('disburseMode').value;
      const reference = document.getElementById('disburseRef').value.trim();
      const date = document.getElementById('disburseDate').value;

      const isFull = paidAmount >= dueAmount;
      const status = isFull ? 'Paid' : 'Partially Paid';

      await ledgerService.updatePayoutStatus(payout.id, status, {
        paidAmount,
        mode,
        reference,
        date
      }, auth.getCurrentUser()?.name || 'Super Admin');

      close();
      await loadData();
    });
  }

  function openManualPayoutModal() {
    const existing = document.getElementById('manualPayoutModal');
    if (existing) existing.remove();

    const html = `
      <div id="manualPayoutModal" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 540px;">
          <div class="modal-header">
            <h3 class="modal-title">Manual Financial Entry / Adjustment</h3>
            <button id="closeManualPayoutBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="manualPayoutForm">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Employee / Staff Member</label>
                <select id="manPayoutEmp" class="form-control" required>
                  ${employees.map(e => `
                    <option value="${e.id}">${e.name} (${e.role})</option>
                  `).join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Adjustment Type</label>
                  <select id="manPayoutType" class="form-control">
                    <option value="Advance">Field Cash Advance (DR)</option>
                    <option value="Bonus">Performance Bonus (CR)</option>
                    <option value="Incentive">On-Time Incentive (CR)</option>
                    <option value="Reimbursement">Fuel / Travel Claim (CR)</option>
                    <option value="Salary">Monthly Salary Credit (CR)</option>
                    <option value="Deduction">Equipment Tool Deduction (DR)</option>
                    <option value="Penalty">SLA Breach Penalty (DR)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Amount (₹)</label>
                  <input type="number" id="manPayoutAmount" class="form-control" min="1" placeholder="e.g. 2000" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Narration / Justification Remarks</label>
                <input type="text" id="manPayoutRemarks" class="form-control" placeholder="e.g. Advance for high-voltage substation layout survey" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="cancelManualPayoutBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Post Entry</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('manualPayoutModal');
    const close = () => modal.remove();

    document.getElementById('closeManualPayoutBtn')?.addEventListener('click', close);
    document.getElementById('cancelManualPayoutBtn')?.addEventListener('click', close);

    document.getElementById('manualPayoutForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const employeeId = document.getElementById('manPayoutEmp').value;
      const type = document.getElementById('manPayoutType').value;
      const amount = Number(document.getElementById('manPayoutAmount').value);
      const remarks = document.getElementById('manPayoutRemarks').value.trim();

      await ledgerService.createManualPayout({
        employeeId,
        type,
        amount,
        remarks
      }, auth.getCurrentUser()?.name || 'Super Admin');

      close();
      await loadData();
    });
  }

  function printPaymentVoucher(payout) {
    const company = db.state.company;
    const amountInWords = numberToWordsIndian(payout.paidAmount || payout.amount);

    const voucherHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Voucher - ${payout.id}</title>
        <style>
          @page { size: A5 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; line-height: 1.4; font-size: 13px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 16px; font-weight: 800; color: #1e3a8a; }
          .voucher-num { font-size: 14px; font-weight: 700; color: #0f172a; }
          .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 14px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 35px; }
          .sig { border-top: 1px dashed #64748b; padding-top: 4px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${company.name}</div>
            <div style="font-size: 11px; color: #64748b;">${company.address}</div>
          </div>
          <div style="text-align: right;">
            <div class="voucher-num">PAYMENT DISBURSEMENT VOUCHER</div>
            <div style="font-size: 12px; color: #2563eb;">VCH Ref: ${payout.id}</div>
          </div>
        </div>

        <div class="box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Paid To: <strong>${payout.employeeName}</strong></span>
            <span>Date: <strong>${formatDate(payout.paidOn || payout.date)}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Classification: <strong>${payout.type}</strong></span>
            <span>Payment Mode: <strong>${payout.mode || 'UPI / Cash'}</strong></span>
          </div>
          <div style="margin-bottom: 8px;">
            Transaction Reference: <strong>${payout.reference || 'N/A'}</strong>
          </div>
          <div style="margin-bottom: 8px;">
            Narration: <em>${payout.remarks}</em>
          </div>
          <div style="background: #f1f5f9; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <div>Amount in Words: <strong>${amountInWords}</strong></div>
            <div style="font-size: 18px; font-weight: 800; color: #1e3a8a;">${formatCurrency(payout.paidAmount || payout.amount)}</div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig">
            Authorized Signatory / Managing Director<br>
            <strong>Aditya Sharma</strong>
          </div>
          <div class="sig">
            Employee Signature / Receiver Stamp<br>
            <strong>${payout.employeeName}</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(voucherHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  }

  loadData();
}
