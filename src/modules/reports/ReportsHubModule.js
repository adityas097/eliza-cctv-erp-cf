// Reports & Accounts Hub Module
// Provides 10 centralized date-filtered analytical and compliance reports with compare support, export & print.

import { periodStore } from '../../store/periodStore.js';
import { formatDisplayDate, formatPeriodRange, getPresets } from '../../services/periodService.js';
import { selectors, calculateDelta, filterByPeriod } from '../../services/queryService.js';
import { renderPagePeriodHeader } from '../../components/PeriodPicker/PeriodPicker.js';
import { downloadCSV, printReport } from '../../services/exportService.js';
import { db } from '../../store/db.js';
import { ledgerService } from '../../services/ledgerService.js';

let activeTab = 'pnl';
let projectDateBasis = 'orderDate';
let selectedEmployeeId = 'EMP-001';

export async function renderReportsHubModule(container) {
  if (!container) return;

  const period = periodStore.getPagePeriod('reports');
  const comparePeriod = (period.compare && period.compare !== 'none' && period.compareFrom && period.compareTo)
    ? { from: period.compareFrom, to: period.compareTo, preset: period.compare }
    : null;

  const presets = getPresets();
  const periodLabel = presets[period.preset] ? presets[period.preset].label : formatPeriodRange(period.from, period.to);

  container.innerHTML = `
    <div class="reports-hub-module">
      <!-- Page Period Header with Pin & Date Basis -->
      <div id="reportsPagePeriodContainer"></div>

      <!-- Module Title & Top Stats Banner -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
              FINANCIAL & OPERATIONAL AUDIT
            </span>
            <span style="font-size: 11.5px; color: var(--text-dim);">Global Date-Filtered Hub</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #fff; margin: 0;">
            Executive Reports & Accounts Register
          </h1>
          <p style="font-size: 12.5px; color: var(--text-muted); margin: 4px 0 0;">
            Comprehensive audit reports across P&L, GST taxation, technician ledgers, SLA compliance & pipeline analytics.
          </p>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="exportActiveReportCsvBtn" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
          <button id="printActiveReportBtn" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print Statement
          </button>
        </div>
      </div>

      <!-- Navigation Tabs (10 Reports) -->
      <div class="tabs-nav" style="display: flex; overflow-x: auto; gap: 4px; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; padding-bottom: 2px;">
        <button class="tab-btn ${activeTab === 'pnl' ? 'active' : ''}" data-tab="pnl">1. Project P&L</button>
        <button class="tab-btn ${activeTab === 'sales' ? 'active' : ''}" data-tab="sales">2. Sales & Pipeline</button>
        <button class="tab-btn ${activeTab === 'quotations' ? 'active' : ''}" data-tab="quotations">3. Quotation Register</button>
        <button class="tab-btn ${activeTab === 'gst' ? 'active' : ''}" data-tab="gst">4. GST Summary</button>
        <button class="tab-btn ${activeTab === 'aging' ? 'active' : ''}" data-tab="aging">5. Receivables & Aging</button>
        <button class="tab-btn ${activeTab === 'fieldops' ? 'active' : ''}" data-tab="fieldops">6. Job & Technicians</button>
        <button class="tab-btn ${activeTab === 'sla' ? 'active' : ''}" data-tab="sla">7. Service & SLA</button>
        <button class="tab-btn ${activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory">8. Stock Movement</button>
        <button class="tab-btn ${activeTab === 'amc' ? 'active' : ''}" data-tab="amc">9. AMC Expiry & Renewal</button>
        <button class="tab-btn ${activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger">10. Payouts & Ledgers</button>
      </div>

      <!-- Active Tab Content Area -->
      <div id="reportContentArea"></div>
    </div>
  `;

  // Render Page Period Header
  const pagePeriodContainer = document.getElementById('reportsPagePeriodContainer');
  renderPagePeriodHeader(pagePeriodContainer, 'reports', {
    hasSnapshotMetrics: activeTab === 'aging' || activeTab === 'inventory',
    dateBasisOptions: activeTab === 'pnl' ? [
      { key: 'orderDate', label: 'Order / Booking Date' },
      { key: 'handoverDate', label: 'Handover Date' }
    ] : null,
    currentDateBasis: projectDateBasis,
    onDateBasisChange: (newBasis) => {
      projectDateBasis = newBasis;
      renderReportContent();
    },
    onPeriodChange: () => {
      renderReportsHubModule(container);
    }
  });

  // Attach tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      renderReportsHubModule(container);
    });
  });

  // Render Tab Content
  await renderReportContent();

  // Attach global report export actions
  document.getElementById('exportActiveReportCsvBtn')?.addEventListener('click', () => {
    exportCurrentReportCSV(period, comparePeriod);
  });

  document.getElementById('printActiveReportBtn')?.addEventListener('click', () => {
    printCurrentReport(period);
  });
}

async function renderReportContent() {
  const contentArea = document.getElementById('reportContentArea');
  if (!contentArea) return;

  const period = periodStore.getPagePeriod('reports');
  const comparePeriod = (period.compare && period.compare !== 'none' && period.compareFrom && period.compareTo)
    ? { from: period.compareFrom, to: period.compareTo, preset: period.compare }
    : null;

  switch (activeTab) {
    case 'pnl':
      renderPnLReport(contentArea, period, comparePeriod);
      break;
    case 'sales':
      renderSalesReport(contentArea, period, comparePeriod);
      break;
    case 'quotations':
      renderQuotationRegisterReport(contentArea, period, comparePeriod);
      break;
    case 'gst':
      renderGstReport(contentArea, period, comparePeriod);
      break;
    case 'aging':
      renderAgingReport(contentArea, period, comparePeriod);
      break;
    case 'fieldops':
      renderFieldOpsReport(contentArea, period, comparePeriod);
      break;
    case 'sla':
      renderSlaReport(contentArea, period, comparePeriod);
      break;
    case 'inventory':
      renderInventoryReport(contentArea, period, comparePeriod);
      break;
    case 'amc':
      renderAmcReport(contentArea, period, comparePeriod);
      break;
    case 'ledger':
      await renderLedgerReport(contentArea, period, comparePeriod);
      break;
    default:
      renderPnLReport(contentArea, period, comparePeriod);
  }
}

// --------------------------------------------------------------------------
// 1. Project Profitability (P&L) Report
// --------------------------------------------------------------------------
function renderPnLReport(container, period, comparePeriod) {
  const data = selectors.projectFinancials(period);
  const cmpData = comparePeriod ? selectors.projectFinancials(comparePeriod) : null;

  const revDelta = cmpData ? calculateDelta(data.revenueBooked, cmpData.revenueBooked) : null;
  const profitDelta = cmpData ? calculateDelta(data.grossProfit, cmpData.grossProfit) : null;

  container.innerHTML = `
    <div class="report-section">
      <!-- KPI Row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card teal">
          <span class="kpi-label">Revenue Booked</span>
          <div class="kpi-value">₹${Math.round(data.revenueBooked).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">
            ${revDelta ? `<span class="${revDelta.colorClass}" style="font-weight: 700;">${revDelta.text} vs prev</span>` : `${data.projectCount} Projects`}
          </div>
        </div>
        <div class="kpi-card green">
          <span class="kpi-label">Gross Operating Profit</span>
          <div class="kpi-value" style="color: #34d399;">₹${Math.round(data.grossProfit).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">
            ${profitDelta ? `<span class="${profitDelta.colorClass}" style="font-weight: 700;">${profitDelta.text} vs prev</span>` : `Margin: ${data.marginPct.toFixed(1)}%`}
          </div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Hardware Cost</span>
          <div class="kpi-value">₹${Math.round(data.hwCost).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">${data.revenueBooked > 0 ? Math.round((data.hwCost / data.revenueBooked) * 100) : 0}% of Revenue</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Labour Cost (Payouts)</span>
          <div class="kpi-value">₹${Math.round(data.labCost).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">Reconciled Job Earnings</div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 14px; font-weight: 700;">Project-by-Project Costing & Margin Register</h3>
            <span style="font-size: 11.5px; color: var(--text-dim);">Showing ${data.projectCount} projects filtered by ${projectDateBasis}</span>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table" id="reportTablePnL">
            <thead>
              <tr>
                <th>Project ID & Client</th>
                <th>Booking Date</th>
                <th class="text-right">Quoted / Revenue (₹)</th>
                <th class="text-right">Hardware (₹)</th>
                <th class="text-right">Labour (₹)</th>
                <th class="text-right">Consumables (₹)</th>
                <th class="text-right">Gross Profit (₹)</th>
                <th class="text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${data.projects.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 28px; color: var(--text-dim);">No projects found within the selected period.</td></tr>
              ` : data.projects.map(p => {
                const totalC = (Number(p.hardwareCost) || 0) + (Number(p.labourCost) || 0) + (Number(p.consumablesCost) || 0);
                const gp = (Number(p.quoted) || 0) - totalC;
                const mgn = (Number(p.quoted) || 0) > 0 ? (gp / Number(p.quoted)) * 100 : 0;
                return `
                  <tr>
                    <td><strong>${p.id}</strong><div style="font-size: 11px; color: var(--text-muted);">${p.client}</div></td>
                    <td>${formatDisplayDate(p.orderDate)}</td>
                    <td class="text-right">₹${Number(p.quoted || 0).toLocaleString('en-IN')}</td>
                    <td class="text-right">₹${Number(p.hardwareCost || 0).toLocaleString('en-IN')}</td>
                    <td class="text-right">₹${Number(p.labourCost || 0).toLocaleString('en-IN')}</td>
                    <td class="text-right">₹${Number(p.consumablesCost || 0).toLocaleString('en-IN')}</td>
                    <td class="text-right" style="color: ${gp >= 0 ? '#34d399' : '#f87171'}; font-weight: 700;">₹${Math.round(gp).toLocaleString('en-IN')}</td>
                    <td class="text-right" style="font-weight: 700; color: ${mgn >= 30 ? '#34d399' : (mgn >= 15 ? '#fbbf24' : '#f87171')};">${mgn.toFixed(1)}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background: var(--bg-card-subtle); font-weight: 700;">
                <td colspan="2">TOTAL</td>
                <td class="text-right">₹${Math.round(data.revenueBooked).toLocaleString('en-IN')}</td>
                <td class="text-right">₹${Math.round(data.hwCost).toLocaleString('en-IN')}</td>
                <td class="text-right">₹${Math.round(data.labCost).toLocaleString('en-IN')}</td>
                <td class="text-right">₹${Math.round(data.consCost).toLocaleString('en-IN')}</td>
                <td class="text-right" style="color: #34d399;">₹${Math.round(data.grossProfit).toLocaleString('en-IN')}</td>
                <td class="text-right">${data.marginPct.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 2. Sales & Pipeline Report
// --------------------------------------------------------------------------
function renderSalesReport(container, period, comparePeriod) {
  const data = selectors.pipelineByStage(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card">
          <span class="kpi-label">Total Pipeline Quoted</span>
          <div class="kpi-value">₹${Math.round(data.totalQuoted).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">${data.totalLeads} Leads Created in Period</div>
        </div>
        <div class="kpi-card teal">
          <span class="kpi-label">Weighted Expected Revenue</span>
          <div class="kpi-value">₹${Math.round(data.totalWeighted).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">Factored by Win Probability</div>
        </div>
        <div class="kpi-card green">
          <span class="kpi-label">Conversion Rate %</span>
          <div class="kpi-value" style="color: #34d399;">${data.conversionPct.toFixed(1)}%</div>
          <div class="kpi-subtitle">Won vs Closed Deals</div>
        </div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 14px; font-weight: 700;">Pipeline Stage Breakdown & Deals in Period</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Stage Name</th>
                <th class="text-right">Leads Count</th>
                <th class="text-right">Total Quoted Value (₹)</th>
                <th class="text-right">% of Pipeline Value</th>
              </tr>
            </thead>
            <tbody>
              ${data.stages.map(st => {
                const count = data.countsByStage[st] || 0;
                const val = data.valueByStage[st] || 0;
                const pct = data.totalQuoted > 0 ? (val / data.totalQuoted) * 100 : 0;
                return `
                  <tr>
                    <td><strong>${st}</strong></td>
                    <td class="text-right">${count}</td>
                    <td class="text-right">₹${val.toLocaleString('en-IN')}</td>
                    <td class="text-right">${pct.toFixed(1)}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 3. Quotation Register Report
// --------------------------------------------------------------------------
function renderQuotationRegisterReport(container, period, comparePeriod) {
  const compId = db.getActiveCompanyId();
  const quotes = filterByPeriod(db.state.quotations || [], 'date', period, 'quotations')
    .filter(q => (q.companyId || 'comp-eliza') === compId);

  const totalTaxable = quotes.reduce((s, q) => s + (Number(q.taxableSubtotal) || 0), 0);
  const totalGst = quotes.reduce((s, q) => s + ((Number(q.cgst) || 0) + (Number(q.sgst) || 0) + (Number(q.igst) || 0)), 0);
  const totalGrand = quotes.reduce((s, q) => s + (Number(q.grandTotal) || 0), 0);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card"><span class="kpi-label">Quotations Generated</span><div class="kpi-value">${quotes.length}</div><div class="kpi-subtitle">In Period</div></div>
        <div class="kpi-card"><span class="kpi-label">Taxable Subtotal</span><div class="kpi-value">₹${Math.round(totalTaxable).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Before GST</div></div>
        <div class="kpi-card teal"><span class="kpi-label">GST Payable (18%)</span><div class="kpi-value">₹${Math.round(totalGst).toLocaleString('en-IN')}</div><div class="kpi-subtitle">CGST + SGST</div></div>
        <div class="kpi-card green"><span class="kpi-label">Grand Total Value</span><div class="kpi-value" style="color: #34d399;">₹${Math.round(totalGrand).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Total Quoted</div></div>
      </div>

      <div class="table-card">
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Client / Party</th>
                <th>Date</th>
                <th>Status</th>
                <th class="text-right">Taxable (₹)</th>
                <th class="text-right">CGST (₹)</th>
                <th class="text-right">SGST (₹)</th>
                <th class="text-right">Grand Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${quotes.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-dim);">No quotations generated within period.</td></tr>
              ` : quotes.map(q => `
                <tr>
                  <td><strong>${q.id}</strong></td>
                  <td>${q.clientName || 'Direct Client'}</td>
                  <td>${formatDisplayDate(q.date)}</td>
                  <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${q.status || 'Active'}</span></td>
                  <td class="text-right">₹${Number(q.taxableSubtotal || 0).toLocaleString('en-IN')}</td>
                  <td class="text-right">₹${Number(q.cgst || 0).toLocaleString('en-IN')}</td>
                  <td class="text-right">₹${Number(q.sgst || 0).toLocaleString('en-IN')}</td>
                  <td class="text-right" style="font-weight: 700;">₹${Number(q.grandTotal || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 4. GST Summary & GSTR-1 Preparation Report
// --------------------------------------------------------------------------
function renderGstReport(container, period, comparePeriod) {
  const data = selectors.gstSummary(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card"><span class="kpi-label">Taxable Value</span><div class="kpi-value">₹${Math.round(data.taxableValue).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Eligible for GSTR-1</div></div>
        <div class="kpi-card teal"><span class="kpi-label">CGST (9%)</span><div class="kpi-value">₹${Math.round(data.cgst).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Central Tax</div></div>
        <div class="kpi-card teal"><span class="kpi-label">SGST (9%)</span><div class="kpi-value">₹${Math.round(data.sgst).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Haryana State Tax</div></div>
        <div class="kpi-card green"><span class="kpi-label">Total GST Collected</span><div class="kpi-value" style="color: #34d399;">₹${Math.round(data.totalGst).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Output Tax Liability</div></div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 14px; font-weight: 700;">HSN-Wise Summary of Outward Supplies (GSTR-1 Table 12)</h3>
          <button id="downloadGstr1Btn" class="btn btn-secondary btn-sm" style="font-size: 11px;">
            Download GSTR-1 CSV
          </button>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>HSN Code</th>
                <th>Description</th>
                <th class="text-right">Total Qty</th>
                <th class="text-right">Total Taxable Value (₹)</th>
                <th class="text-right">Rate %</th>
                <th class="text-right">Total Tax Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${data.hsnList.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">No outward supplies in this tax period.</td></tr>
              ` : data.hsnList.map(h => `
                <tr>
                  <td><strong>${h.hsn}</strong></td>
                  <td>${h.description}</td>
                  <td class="text-right">${h.qty} Nos</td>
                  <td class="text-right">₹${Math.round(h.taxable).toLocaleString('en-IN')}</td>
                  <td class="text-right">${h.gstRate}%</td>
                  <td class="text-right" style="font-weight: 700;">₹${Math.round(h.taxAmount).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('downloadGstr1Btn')?.addEventListener('click', () => {
    downloadCSV({
      title: 'GSTR-1_HSN_Summary',
      period,
      headers: ['HSN Code', 'Description', 'Quantity', 'Taxable Value', 'Rate', 'Tax Amount'],
      rows: data.hsnList.map(h => [h.hsn, h.description, h.qty, h.taxable, `${h.gstRate}%`, h.taxAmount])
    });
  });
}

// --------------------------------------------------------------------------
// 5. Receivables & Aging Report
// --------------------------------------------------------------------------
function renderAgingReport(container, period, comparePeriod) {
  const data = selectors.receivablesAndAging(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card teal"><span class="kpi-label">Outstanding Receivables</span><div class="kpi-value">₹${Math.round(data.totalReceivables).toLocaleString('en-IN')}</div><div class="kpi-subtitle">As of ${formatDisplayDate(period.to)}</div></div>
        <div class="kpi-card"><span class="kpi-label">0–30 Days Aging</span><div class="kpi-value">₹${Math.round(data.agingBuckets.b0_30).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Current</div></div>
        <div class="kpi-card amber"><span class="kpi-label">31–60 Days Aging</span><div class="kpi-value" style="color: #fbbf24;">₹${Math.round(data.agingBuckets.b31_60).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Follow-up due</div></div>
        <div class="kpi-card red"><span class="kpi-label">61+ Days Aging</span><div class="kpi-value" style="color: #f87171;">₹${Math.round(data.agingBuckets.b61_90 + data.agingBuckets.b90_plus).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Overdue Action</div></div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 14px; font-weight: 700;">Client Invoices & Receivables Ledger (As of ${formatDisplayDate(period.to)})</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Client Name</th>
                <th>Order Date</th>
                <th class="text-right">Billed (₹)</th>
                <th class="text-right">Received (₹)</th>
                <th class="text-right">Outstanding (₹)</th>
                <th class="text-right">Aging Days</th>
              </tr>
            </thead>
            <tbody>
              ${data.clientList.map(c => `
                <tr>
                  <td><strong>${c.projectId}</strong></td>
                  <td>${c.client}</td>
                  <td>${formatDisplayDate(c.orderDate)}</td>
                  <td class="text-right">₹${c.billed.toLocaleString('en-IN')}</td>
                  <td class="text-right">₹${c.paid.toLocaleString('en-IN')}</td>
                  <td class="text-right" style="font-weight: 700; color: #f87171;">₹${c.outstanding.toLocaleString('en-IN')}</td>
                  <td class="text-right">${c.ageDays} days</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 6. Job & Technician Performance Report
// --------------------------------------------------------------------------
function renderFieldOpsReport(container, period, comparePeriod) {
  const data = selectors.jobsMetrics(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card"><span class="kpi-label">Jobs Scheduled / Active</span><div class="kpi-value">${data.totalJobs}</div><div class="kpi-subtitle">In Period</div></div>
        <div class="kpi-card green"><span class="kpi-label">Completed & Verified</span><div class="kpi-value" style="color: #34d399;">${data.completedOrVerified}</div><div class="kpi-subtitle">${data.pointsInstalled} Total Camera Points</div></div>
        <div class="kpi-card teal"><span class="kpi-label">On-Time Completion %</span><div class="kpi-value">${data.onTimeRate}%</div><div class="kpi-subtitle">Target &gt; 90%</div></div>
        <div class="kpi-card ${data.overdueCount > 0 ? 'red' : ''}"><span class="kpi-label">Overdue Jobs</span><div class="kpi-value">${data.overdueCount}</div><div class="kpi-subtitle">Breached Timeline</div></div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 14px; font-weight: 700;">Job Sheet Performance Register</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Job ID & Title</th>
                <th>Client / Site</th>
                <th>Scheduled Start</th>
                <th>Status</th>
                <th class="text-right">Cameras / Points</th>
                <th>Lead Assignee</th>
              </tr>
            </thead>
            <tbody>
              ${data.jobs.map(j => `
                <tr>
                  <td><strong>${j.id}</strong><div style="font-size: 11px; color: var(--text-muted);">${j.title}</div></td>
                  <td>${j.clientName || 'Site Client'}</td>
                  <td>${formatDisplayDate(j.scheduledStart)}</td>
                  <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${j.status}</span></td>
                  <td class="text-right">${j.pointsCount || j.camsCount || 0}</td>
                  <td>${(j.assignees && j.assignees[0]) ? j.assignees[0].employeeId : 'Unassigned'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 7. Service & SLA Report
// --------------------------------------------------------------------------
function renderSlaReport(container, period, comparePeriod) {
  const data = selectors.ticketsMetrics(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card"><span class="kpi-label">Tickets Logged</span><div class="kpi-value">${data.totalTickets}</div><div class="kpi-subtitle">In Period</div></div>
        <div class="kpi-card green"><span class="kpi-label">Tickets Resolved</span><div class="kpi-value" style="color: #34d399;">${data.resolvedCount}</div><div class="kpi-subtitle">Resolved</div></div>
        <div class="kpi-card teal"><span class="kpi-label">SLA Compliance %</span><div class="kpi-value">${data.slaCompliancePct}%</div><div class="kpi-subtitle">Met Response & Resolution</div></div>
        <div class="kpi-card ${data.breachedCount > 0 ? 'red' : ''}"><span class="kpi-label">SLA Breaches</span><div class="kpi-value">${data.breachedCount}</div><div class="kpi-subtitle">Critical Breaches</div></div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 14px; font-weight: 700;">Service Complaints & Escalation Register</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Client / Site</th>
                <th>Logged At</th>
                <th>Severity</th>
                <th>Status</th>
                <th>SLA State</th>
              </tr>
            </thead>
            <tbody>
              ${data.tickets.map(t => `
                <tr>
                  <td><strong>${t.id}</strong><div style="font-size: 11px; color: var(--text-muted);">${t.subject}</div></td>
                  <td>${t.clientName || 'Client'}</td>
                  <td>${formatDisplayDate(t.loggedAt)}</td>
                  <td><span class="badge" style="background: ${t.severity === 'Critical' ? '#ef4444' : '#eab308'}; color: #fff;">${t.severity}</span></td>
                  <td>${t.status}</td>
                  <td><span style="color: ${t.isBreached ? '#ef4444' : '#10b981'}; font-weight: 700;">${t.isBreached ? 'Breached' : 'Within SLA'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 8. Inventory Movement Report
// --------------------------------------------------------------------------
function renderInventoryReport(container, period, comparePeriod) {
  const data = selectors.inventoryMovement(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card green"><span class="kpi-label">Total Stock Valuation</span><div class="kpi-value" style="color: #34d399;">₹${Math.round(data.totalValuation).toLocaleString('en-IN')}</div><div class="kpi-subtitle">Cost Valuation</div></div>
        <div class="kpi-card"><span class="kpi-label">Tracked SKUs</span><div class="kpi-value">${data.skuReports.length}</div><div class="kpi-subtitle">In Inventory</div></div>
        <div class="kpi-card ${data.reorderAlertsCount > 0 ? 'red' : ''}"><span class="kpi-label">Reorder Triggers</span><div class="kpi-value">${data.reorderAlertsCount} SKUs</div><div class="kpi-subtitle">At or Below Min Reorder</div></div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 14px; font-weight: 700;">Inventory Movement Register (Opening &rarr; Issues &rarr; Closing)</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU Code & Description</th>
                <th>Category</th>
                <th class="text-right">Opening Stock</th>
                <th class="text-right">Issued to Jobs</th>
                <th class="text-right">Closing Stock</th>
                <th class="text-right">Unit Cost (₹)</th>
                <th class="text-right">Stock Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${data.skuReports.map(sku => `
                <tr>
                  <td><strong>${sku.id}</strong><div style="font-size: 11px; color: var(--text-muted);">${sku.name}</div></td>
                  <td>${sku.category}</td>
                  <td class="text-right">${sku.opening}</td>
                  <td class="text-right">${sku.issues}</td>
                  <td class="text-right" style="font-weight: 700;">${sku.closing}</td>
                  <td class="text-right">₹${sku.unitCost.toLocaleString('en-IN')}</td>
                  <td class="text-right" style="font-weight: 700; color: #34d399;">₹${sku.valuation.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 9. AMC Expiry & Renewal Report (Forward-Looking Capable)
// --------------------------------------------------------------------------
function renderAmcReport(container, period, comparePeriod) {
  const data = selectors.amcMetrics(period);

  container.innerHTML = `
    <div class="report-section">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card amber"><span class="kpi-label">Contracts Expiring in Period</span><div class="kpi-value" style="color: #fbbf24;">${data.expiringCount}</div><div class="kpi-subtitle">Renewal Targets</div></div>
        <div class="kpi-card teal"><span class="kpi-label">Renewal Rate %</span><div class="kpi-value">${data.renewalRatePct}%</div><div class="kpi-subtitle">Renewed vs Expiring</div></div>
        <div class="kpi-card green"><span class="kpi-label">Active AMC Contracts</span><div class="kpi-value" style="color: #34d399;">${data.activeAsOfToCount}</div><div class="kpi-subtitle">Annual Value: ₹${data.activeAnnualValue.toLocaleString('en-IN')}</div></div>
      </div>

      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 14px; font-weight: 700;">AMC Contracts Expiry & Renewal Schedule</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>Client Name</th>
                <th>Start Date</th>
                <th>Renewal / Expiry Date</th>
                <th class="text-right">Annual Fee (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.expiringAmc.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">No AMC renewals scheduled within this period window.</td></tr>
              ` : data.expiringAmc.map(a => `
                <tr>
                  <td><strong>${a.id}</strong></td>
                  <td>${a.client}</td>
                  <td>${formatDisplayDate(a.startDate)}</td>
                  <td>${formatDisplayDate(a.endDate)}</td>
                  <td class="text-right">₹${Number(a.annualFee || 0).toLocaleString('en-IN')}</td>
                  <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// 10. Payout Summary & Employee Ledgers (Double-Entry Balance Verification)
// --------------------------------------------------------------------------
async function renderLedgerReport(container, period, comparePeriod) {
  const compId = db.getActiveCompanyId();
  const employees = (db.state.employees || []).filter(e => (e.companyId || 'comp-eliza') === compId);

  // Fetch statement for selected employee
  const statement = await ledgerService.getEmployeeLedger(selectedEmployeeId, period.from, period.to);
  const employeeName = statement.employee ? statement.employee.name : 'Employee';

  // Assertion Check: opening + credits - debits = closing
  const mathSum = statement.openingBalance + statement.totalCredit - statement.totalDebit;
  const isIdentityVerified = Math.abs(mathSum - statement.closingBalance) < 0.01;

  container.innerHTML = `
    <div class="report-section">
      <!-- Employee Selector Bar -->
      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--text-main);">SELECT EMPLOYEE:</span>
          <select id="reportEmpSelect" style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); font-size: 12px; padding: 5px 10px; border-radius: 6px;">
            ${employees.map(e => `
              <option value="${e.id}" ${e.id === selectedEmployeeId ? 'selected' : ''}>${e.id} - ${e.name} (${e.role})</option>
            `).join('')}
          </select>
        </div>

        <!-- Identity Verification Pill -->
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; background: ${isIdentityVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isIdentityVerified ? '#34d399' : '#f87171'}; padding: 4px 10px; border-radius: 6px; font-weight: 700;">
          <span>${isIdentityVerified ? '✓ Identity Verified' : '⚠ Identity Mismatch'}</span>
          <span>(Opening + Credits &minus; Debits = Closing)</span>
        </div>
      </div>

      <!-- Balance Summary Row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div class="kpi-card">
          <span class="kpi-label">Opening Balance</span>
          <div class="kpi-value">₹${Math.round(statement.openingBalance).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">As of ${formatDisplayDate(period.from)} &minus; 1 day</div>
        </div>
        <div class="kpi-card green">
          <span class="kpi-label">Total Credits (Earned)</span>
          <div class="kpi-value" style="color: #34d399;">₹${Math.round(statement.totalCredit).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">Job Earnings, Bonus, Incentives</div>
        </div>
        <div class="kpi-card teal">
          <span class="kpi-label">Total Debits (Disbursed)</span>
          <div class="kpi-value">₹${Math.round(statement.totalDebit).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">Payments & Advances Recovered</div>
        </div>
        <div class="kpi-card ${statement.closingBalance >= 0 ? 'green' : 'red'}">
          <span class="kpi-label">Closing Balance (Net Due)</span>
          <div class="kpi-value" style="color: ${statement.closingBalance >= 0 ? '#34d399' : '#f87171'};">
            ₹${Math.round(statement.closingBalance).toLocaleString('en-IN')}
          </div>
          <div class="kpi-subtitle">As of ${formatDisplayDate(period.to)} (${statement.balanceType})</div>
        </div>
      </div>

      <!-- Ledger Entries Table -->
      <div class="table-card">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 14px; font-weight: 700;">Employee Statement of Account: ${employeeName}</h3>
            <span style="font-size: 11.5px; color: var(--text-dim);">Strict chronological continuous running balance</span>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher / Ref</th>
                <th>Narration</th>
                <th class="text-right">Credit (₹)</th>
                <th class="text-right">Debit (₹)</th>
                <th class="text-right">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              <!-- Opening Balance Row -->
              <tr style="background: rgba(56, 189, 248, 0.06); font-weight: 600;">
                <td>${formatDisplayDate(period.from)}</td>
                <td><strong>OPENING</strong></td>
                <td>Opening Balance Brought Forward from prior history</td>
                <td class="text-right">—</td>
                <td class="text-right">—</td>
                <td class="text-right" style="font-weight: 700;">₹${Math.round(statement.openingBalance).toLocaleString('en-IN')}</td>
              </tr>

              ${statement.entries.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-dim);">No transactions recorded in this period for this employee.</td></tr>
              ` : statement.entries.map(e => `
                <tr>
                  <td>${formatDisplayDate(e.date)}</td>
                  <td><strong>${e.refId || e.id}</strong></td>
                  <td>${e.narration}</td>
                  <td class="text-right" style="color: ${e.credit > 0 ? '#34d399' : 'inherit'};">${e.credit > 0 ? `₹${Number(e.credit).toLocaleString('en-IN')}` : '—'}</td>
                  <td class="text-right" style="color: ${e.debit > 0 ? '#f87171' : 'inherit'};">${e.debit > 0 ? `₹${Number(e.debit).toLocaleString('en-IN')}` : '—'}</td>
                  <td class="text-right" style="font-weight: 700;">₹${Math.round(e.balanceAfter).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}

              <!-- Closing Balance Row -->
              <tr style="background: rgba(16, 185, 129, 0.08); font-weight: 700;">
                <td>${formatDisplayDate(period.to)}</td>
                <td><strong>CLOSING</strong></td>
                <td>Closing Balance Carried Forward as of ${formatDisplayDate(period.to)}</td>
                <td class="text-right">₹${Math.round(statement.totalCredit).toLocaleString('en-IN')}</td>
                <td class="text-right">₹${Math.round(statement.totalDebit).toLocaleString('en-IN')}</td>
                <td class="text-right" style="color: #34d399;">₹${Math.round(statement.closingBalance).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('reportEmpSelect')?.addEventListener('change', (e) => {
    selectedEmployeeId = e.target.value;
    renderLedgerReport(container, period, comparePeriod);
  });
}

// --------------------------------------------------------------------------
// CSV & Print Export Dispatchers
// --------------------------------------------------------------------------
function exportCurrentReportCSV(period, comparePeriod) {
  const table = document.querySelector('#reportContentArea table');
  if (!table) return;

  const title = `Report_${activeTab.toUpperCase()}`;
  const rows = [];
  const headers = [];

  table.querySelectorAll('thead th').forEach(th => headers.push(th.innerText.trim()));
  table.querySelectorAll('tbody tr').forEach(tr => {
    const row = [];
    tr.querySelectorAll('td').forEach(td => row.push(td.innerText.trim().replace(/\n/g, ' ')));
    if (row.length) rows.push(row);
  });

  downloadCSV({
    title,
    period,
    comparePeriod,
    headers,
    rows
  });
}

function printCurrentReport(period) {
  const table = document.querySelector('#reportContentArea .table-card');
  if (!table) return;

  printReport({
    title: `EXECUTIVE REPORT: ${activeTab.toUpperCase()}`,
    period,
    tableHtml: table.innerHTML
  });
}
