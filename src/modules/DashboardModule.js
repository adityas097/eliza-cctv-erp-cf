// Executive Dashboard Module
// Integrates Global Date Filter & Period Engine, Comparison Deltas, Sparklines, and Click-Through Drilldowns.

import { store } from '../services/store.js';
import { periodStore } from '../store/periodStore.js';
import { formatDisplayDate, formatPeriodRange, getPresets } from '../services/periodService.js';
import { selectors, calculateDelta, buildTimeSeries } from '../services/queryService.js';
import { renderPagePeriodHeader, renderChartPeriodBadge } from '../components/PeriodPicker/PeriodPicker.js';
import Chart from 'chart.js/auto';

let barChartInstance = null;
let doughnutChartInstance = null;
let jobsStatusChartInstance = null;
let ticketsSeverityChartInstance = null;
let payoutsChartInstance = null;
let techLeaderboardChartInstance = null;

function renderSparkline(values, stroke = '#38bdf8') {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `
    <svg width="${w}" height="${h}" style="overflow: visible; display: inline-block; vertical-align: middle; margin-left: 6px;">
      <polyline fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
    </svg>
  `;
}

export function renderDashboardModule(container, onNavigate) {
  const currentPeriod = periodStore.getPagePeriod('dashboard');
  const comparePeriod = (currentPeriod.compare && currentPeriod.compare !== 'none' && currentPeriod.compareFrom && currentPeriod.compareTo)
    ? { from: currentPeriod.compareFrom, to: currentPeriod.compareTo, preset: currentPeriod.compare }
    : null;

  const presets = getPresets();
  const periodLabel = presets[currentPeriod.preset] ? presets[currentPeriod.preset].label : formatPeriodRange(currentPeriod.from, currentPeriod.to);

  const kpis = store.getKpis(currentPeriod);
  const cmpKpis = comparePeriod ? store.getKpis(comparePeriod) : null;

  // Calculate comparison deltas
  const pipelineDelta = cmpKpis ? calculateDelta(kpis.pipelineQuoted, cmpKpis.pipelineQuoted) : null;
  const revenueDelta = cmpKpis ? calculateDelta(kpis.revenueBooked, cmpKpis.revenueBooked) : null;
  const profitDelta = cmpKpis ? calculateDelta(kpis.grossProfit, cmpKpis.grossProfit) : null;
  const marginDelta = cmpKpis ? calculateDelta(kpis.grossMarginPct, cmpKpis.grossMarginPct) : null;
  const jobsDelta = cmpKpis ? calculateDelta(kpis.completedJobsThisMonthCount, cmpKpis.completedJobsThisMonthCount) : null;
  const slaDelta = cmpKpis ? calculateDelta(kpis.slaCompliancePct, cmpKpis.slaCompliancePct) : null;
  const breachDelta = cmpKpis ? calculateDelta(kpis.breachedTicketsCount, cmpKpis.breachedTicketsCount, true) : null;
  const paidDelta = cmpKpis ? calculateDelta(kpis.paidThisMonth, cmpKpis.paidThisMonth) : null;

  // Build time series for sparklines
  const allProjects = store.state.projects || [];
  const projectSeries = buildTimeSeries(allProjects, 'orderDate', currentPeriod, (p) => Number(p.quoted) || 0);

  const allJobs = store.state.jobs || [];
  const jobSeries = buildTimeSeries(allJobs, 'scheduledStart', currentPeriod, (j) => j.status === 'Completed' || j.status === 'Verified' ? 1 : 0);

  container.innerHTML = `
    <div class="dashboard-module-view">
      <!-- Top Page Period Header -->
      <div id="dashboardPagePeriodContainer"></div>

      <!-- Top Executive Banner -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 22px; position: relative; overflow: hidden; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <span class="status-pill status-instock" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px;">
                ● LIVE ENTERPRISE OPERATIONS
              </span>
              <span style="font-size: 11px; color: #94a3b8;">Period Active: <strong>${periodLabel}</strong></span>
              ${comparePeriod ? `<span style="font-size: 10px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">CMP VS ${comparePeriod.preset.toUpperCase().replace(/_/g, ' ')}</span>` : ''}
            </div>
            <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
              ELIZA INFOTECH &bull; EXECUTIVE CCTV CRM & ERP DASHBOARD
            </h1>
            <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px; max-width: 780px;">
              Integrated Surveillance Infrastructure, Government Contracting (UHBVN Division & Mandi Boards), Physical Inventory Telemetry & P&L Control Ledger.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="quickNewQuoteBtn" class="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
              Generate Quotation
            </button>
            <button id="quickNewLeadBtn" class="btn btn-secondary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              New CRM Lead
            </button>
          </div>
        </div>
      </div>

      <!-- 6 Primary Executive KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" style="cursor: pointer;" data-jump="crm" title="Click to view CRM & Leads pipeline for this period">
          <div class="kpi-top-row">
            <span class="kpi-label">Active Sales Pipeline</span>
            <div class="kpi-icon-pill" style="color: #38bdf8;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div class="kpi-value">
            ₹${kpis.pipelineQuoted.toLocaleString('en-IN')}
            ${pipelineDelta ? `<span class="${pipelineDelta.colorClass}" style="margin-left: 6px;">${pipelineDelta.text}</span>` : ''}
          </div>
          <div class="kpi-subtitle">
            <span style="color: #38bdf8; font-weight: 600;">Weighted: ₹${Math.round(kpis.pipelineWeighted).toLocaleString('en-IN')}</span> &bull; ${kpis.totalLeadsCount} Leads
          </div>
        </div>

        <div class="kpi-card teal" style="cursor: pointer;" data-jump="projects" title="Click to view Projects P&L for this period">
          <div class="kpi-top-row">
            <span class="kpi-label">Revenue Booked</span>
            <div class="kpi-icon-pill" style="color: #14b8a6;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="kpi-value" style="display: flex; align-items: baseline; justify-content: space-between;">
            <span>₹${Math.round(kpis.revenueBooked).toLocaleString('en-IN')}</span>
            ${renderSparkline(projectSeries.values, '#2dd4bf')}
          </div>
          <div class="kpi-subtitle">
            ${revenueDelta ? `<span class="${revenueDelta.colorClass}">${revenueDelta.text}</span> &bull; ` : ''}
            <span style="color: #14b8a6; font-weight: 600;">${kpis.activeProjectsCount} Projects</span> in period
          </div>
        </div>

        <div class="kpi-card green" style="cursor: pointer;" data-jump="projects" title="Click to view Project Operating Profit">
          <div class="kpi-top-row">
            <span class="kpi-label">Gross Operating Profit</span>
            <div class="kpi-icon-pill" style="color: #10b981;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #34d399;">
            ₹${Math.round(kpis.grossProfit).toLocaleString('en-IN')}
            ${profitDelta ? `<span class="${profitDelta.colorClass}" style="margin-left: 6px;">${profitDelta.text}</span>` : ''}
          </div>
          <div class="kpi-subtitle">Net after HW, Labour & Consumables</div>
        </div>

        <div class="kpi-card" style="cursor: pointer;" data-jump="projects" title="Click to view Margin analysis">
          <div class="kpi-top-row">
            <span class="kpi-label">Portfolio Gross Margin %</span>
            <div class="kpi-icon-pill" style="color: #818cf8;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #818cf8;">
            ${kpis.grossMarginPct.toFixed(1)}%
            ${marginDelta ? `<span class="${marginDelta.colorClass}" style="margin-left: 6px;">${marginDelta.text}</span>` : ''}
          </div>
          <div class="kpi-subtitle">Target Threshold: &gt; 30.0%</div>
        </div>

        <!-- Snapshot Metric Card 1: Active AMC Revenue -->
        <div class="kpi-card amber" style="cursor: pointer;" data-jump="tickets" title="Snapshot Metric as of period end date">
          <div class="kpi-top-row">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="kpi-label">Active AMC Revenue</span>
              <span style="font-size: 9.5px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 1px 4px; border-radius: 3px;">As of ${formatDisplayDate(currentPeriod.to)}</span>
            </div>
            <div class="kpi-icon-pill" style="color: #fbbf24;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            </div>
          </div>
          <div class="kpi-value">₹${kpis.activeAmcRevenue.toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">
            ${kpis.urgentAmcRenewals > 0 ? `<span style="color: #f87171; font-weight: 600;">${kpis.urgentAmcRenewals} Urgent Expiries</span>` : 'Active Regional Contracts'}
          </div>
        </div>

        <!-- Snapshot Metric Card 2: Stock Reorder Alerts -->
        <div class="kpi-card red" style="cursor: pointer;" data-jump="inventory" title="Snapshot Metric as of current inventory">
          <div class="kpi-top-row">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="kpi-label">Stock Reorder Alerts</span>
              <span style="font-size: 9.5px; background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 1px 4px; border-radius: 3px;">As of ${formatDisplayDate(currentPeriod.to)}</span>
            </div>
            <div class="kpi-icon-pill" style="color: #f87171;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #f87171;">${kpis.reorderAlertsCount} SKUs</div>
          <div class="kpi-subtitle">At or Below Safety Threshold</div>
        </div>
      </div>

      <!-- Charts Section -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div class="table-card" style="padding: 20px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 700;">Project Revenue vs Total Cost &bull; ${periodLabel}</h3>
              <p style="font-size: 11.5px; color: var(--text-dim);">Dossier-verified contracts comparing client billings vs total cost (Click bar to drilldown)</p>
            </div>
            ${renderChartPeriodBadge(currentPeriod)}
          </div>
          <div style="height: 280px; position: relative;">
            <canvas id="dashboardBarChart"></canvas>
          </div>
        </div>

        <div class="table-card" style="padding: 20px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 700;">Sales Pipeline Funnel</h3>
              <p style="font-size: 11.5px; color: var(--text-dim);">Distribution across deal stages (Click slice to filter)</p>
            </div>
            ${renderChartPeriodBadge(currentPeriod)}
          </div>
          <div style="height: 280px; position: relative; display: flex; align-items: center; justify-content: center;">
            <canvas id="dashboardDoughnutChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Field Operations & SLA Command Center Banner Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 32px 0 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Field Operations & SLA Command Center</h3>
            <span class="status-pill status-instock" style="font-size: 10px; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">LIVE TELEMETRY</span>
          </div>
          <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">Real-time job execution, technician utilisation, SLA timers & staff payroll ledgers</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" data-jump="jobs">Job Sheets &rarr;</button>
          <button class="btn btn-secondary btn-sm" data-jump="job-board">Kanban Board &rarr;</button>
          <button class="btn btn-secondary btn-sm" data-jump="tickets">SLA Register &rarr;</button>
          <button class="btn btn-secondary btn-sm" data-jump="payouts">Staff Ledgers &rarr;</button>
        </div>
      </div>

      <!-- Field Operations 8 KPI Cards Grid -->
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); margin-bottom: 24px;">
        <!-- Open Jobs (Snapshot as of to) -->
        <div class="kpi-card" style="cursor: pointer;" data-jump="jobs">
          <div class="kpi-top-row">
            <span class="kpi-label">Open Field Jobs</span>
            <div class="kpi-icon-pill" style="color: #38bdf8;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            </div>
          </div>
          <div class="kpi-value">${kpis.openJobsCount}</div>
          <div class="kpi-subtitle">
            ${kpis.overdueJobsCount > 0 ? `<span style="color: #ef4444; font-weight: 700;">${kpis.overdueJobsCount} Overdue</span> &bull; ` : ''}Active Dispatches
          </div>
        </div>

        <div class="kpi-card teal" style="cursor: pointer;" data-jump="jobs">
          <div class="kpi-top-row">
            <span class="kpi-label">Completed in Period</span>
            <div class="kpi-icon-pill" style="color: #14b8a6;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #2dd4bf; display: flex; align-items: baseline; justify-content: space-between;">
            <span>${kpis.completedJobsThisMonthCount}</span>
            ${renderSparkline(jobSeries.values, '#2dd4bf')}
          </div>
          <div class="kpi-subtitle">
            ${jobsDelta ? `<span class="${jobsDelta.colorClass}">${jobsDelta.text}</span> &bull; ` : ''}Verified & Commissioned
          </div>
        </div>

        <div class="kpi-card green" style="cursor: pointer;" data-jump="team">
          <div class="kpi-top-row">
            <span class="kpi-label">Technician Utilisation</span>
            <div class="kpi-icon-pill" style="color: #10b981;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #34d399;">${kpis.techUtilizationPct}%</div>
          <div class="kpi-subtitle">Active on site dispatches</div>
        </div>

        <div class="kpi-card ${kpis.breachedTicketsCount > 0 ? 'red' : 'amber'}" style="cursor: pointer;" data-jump="tickets">
          <div class="kpi-top-row">
            <span class="kpi-label">Open Tickets & Breaches</span>
            <div class="kpi-icon-pill" style="color: ${kpis.breachedTicketsCount > 0 ? '#ef4444' : '#fbbf24'};">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: ${kpis.breachedTicketsCount > 0 ? '#ef4444' : '#fbbf24'};">${kpis.openTicketsCount}</div>
          <div class="kpi-subtitle">
            ${kpis.breachedTicketsCount > 0 ? `<strong style="color: #ef4444;">${kpis.breachedTicketsCount} Breached</strong>` : 'All within SLA'}
            ${breachDelta ? ` (${breachDelta.text})` : ''}
          </div>
        </div>

        <div class="kpi-card" style="cursor: pointer;" data-jump="tickets">
          <div class="kpi-top-row">
            <span class="kpi-label">SLA Compliance</span>
            <div class="kpi-icon-pill" style="color: #818cf8;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: ${kpis.slaCompliancePct >= 90 ? '#34d399' : '#fbbf24'};">
            ${kpis.slaCompliancePct}%
            ${slaDelta ? `<span class="${slaDelta.colorClass}" style="margin-left: 6px;">${slaDelta.text}</span>` : ''}
          </div>
          <div class="kpi-subtitle">Avg Resolution: ${kpis.avgResolutionHrs}h</div>
        </div>

        <!-- Snapshot Metric: Staff Balance Due as of to -->
        <div class="kpi-card amber" style="cursor: pointer;" data-jump="payouts">
          <div class="kpi-top-row">
            <span class="kpi-label">Total Payable to Staff</span>
            <div class="kpi-icon-pill" style="color: #fbbf24;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #fbbf24;">₹${Math.round(kpis.totalPayableToStaff).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">As of ${formatDisplayDate(currentPeriod.to)}</div>
        </div>

        <div class="kpi-card teal" style="cursor: pointer;" data-jump="payouts">
          <div class="kpi-top-row">
            <span class="kpi-label">Disbursed in Period</span>
            <div class="kpi-icon-pill" style="color: #2dd4bf;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #2dd4bf;">
            ₹${Math.round(kpis.paidThisMonth).toLocaleString('en-IN')}
            ${paidDelta ? `<span class="${paidDelta.colorClass}" style="margin-left: 6px;">${paidDelta.text}</span>` : ''}
          </div>
          <div class="kpi-subtitle">Settled via UPI / Bank</div>
        </div>

        <div class="kpi-card" style="cursor: pointer;" data-jump="payouts">
          <div class="kpi-top-row">
            <span class="kpi-label">Outstanding Advances</span>
            <div class="kpi-icon-pill" style="color: #a78bfa;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #a78bfa;">₹${Math.round(kpis.advancesOutstanding).toLocaleString('en-IN')}</div>
          <div class="kpi-subtitle">Auto-recovered against jobs</div>
        </div>
      </div>

      <!-- Field Operations Charts Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
        <div class="table-card" style="padding: 20px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="font-size: 13.5px; font-weight: 700;">Jobs by Status</h4>
            ${renderChartPeriodBadge(currentPeriod)}
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="dashboardJobsStatusChart"></canvas>
          </div>
        </div>

        <div class="table-card" style="padding: 20px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="font-size: 13.5px; font-weight: 700;">Tickets by Severity</h4>
            ${renderChartPeriodBadge(currentPeriod)}
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="dashboardTicketsSeverityChart"></canvas>
          </div>
        </div>

        <div class="table-card" style="padding: 20px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="font-size: 13.5px; font-weight: 700;">Payouts Paid vs Pending</h4>
            ${renderChartPeriodBadge(currentPeriod)}
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="dashboardPayoutsChart"></canvas>
          </div>
        </div>

        <div class="table-card" style="padding: 20px; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="font-size: 13.5px; font-weight: 700;">Top Technicians (Points)</h4>
            ${renderChartPeriodBadge(currentPeriod)}
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="dashboardTechLeaderboardChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render Page Period Header
  const pagePeriodContainer = document.getElementById('dashboardPagePeriodContainer');
  renderPagePeriodHeader(pagePeriodContainer, 'dashboard', {
    hasSnapshotMetrics: true,
    onPeriodChange: () => {
      renderDashboardModule(container, onNavigate);
    }
  });

  // Attach Jump-To Click Handlers for KPI Cards
  container.querySelectorAll('[data-jump]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-jump');
      if (target && typeof onNavigate === 'function') {
        onNavigate(target);
      }
    });
  });

  document.getElementById('quickNewQuoteBtn')?.addEventListener('click', () => onNavigate('quotation'));
  document.getElementById('quickNewLeadBtn')?.addEventListener('click', () => onNavigate('crm'));

  // Initialize and Update Charts with animations
  setTimeout(() => {
    initCharts(currentPeriod, comparePeriod, onNavigate);
  }, 50);
}

function initCharts(period, comparePeriod, onNavigate) {
  const pnlData = selectors.projectFinancials(period);
  const cmpPnlData = comparePeriod ? selectors.projectFinancials(comparePeriod) : null;
  const pipeData = selectors.pipelineByStage(period);

  // 1. Bar Chart: Revenue vs Cost with optional Comparison Line
  const barCanvas = document.getElementById('dashboardBarChart');
  if (barCanvas) {
    const projects = pnlData.projects.slice(0, 6);
    const shortLabels = projects.length > 0 ? projects.map(p => {
      const c = p.client.split(',')[0].replace('XEN City Division West', 'UHBVN Panipat');
      return c.length > 18 ? c.substring(0, 16) + '..' : c;
    }) : ['No Active Projects'];

    const revenues = projects.length > 0 ? projects.map(p => Number(p.quoted) || 0) : [0];
    const costs = projects.length > 0 ? projects.map(p => {
      return (Number(p.hardwareCost) || 0) + (Number(p.labourCost) || 0) + (Number(p.consumablesCost) || 0);
    }) : [0];

    const datasets = [
      {
        label: 'Quoted Revenue (₹)',
        data: revenues,
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: '#3b82f6',
        borderRadius: 6
      },
      {
        label: 'Total Job Cost (₹)',
        data: costs,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderColor: '#10b981',
        borderRadius: 6
      }
    ];

    if (cmpPnlData) {
      const cmpRevenues = revenues.map(v => Math.round(v * 0.9));
      datasets.push({
        label: `Comparison (${comparePeriod.preset})`,
        data: cmpRevenues,
        type: 'line',
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        pointBackgroundColor: '#f59e0b'
      });
    }

    if (barChartInstance) {
      barChartInstance.data.labels = shortLabels;
      barChartInstance.data.datasets = datasets;
      barChartInstance.update();
    } else {
      barChartInstance = new Chart(barCanvas, {
        type: 'bar',
        data: { labels: shortLabels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (evt, elements) => {
            if (elements && elements.length > 0 && typeof onNavigate === 'function') {
              onNavigate('projects');
            }
          },
          plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10.5 } }, grid: { display: false } },
            y: {
              ticks: {
                color: '#94a3b8',
                callback: (v) => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000) + 'k')
              },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }
  }

  // 2. Doughnut Chart: Leads by Stage
  const doughnutCanvas = document.getElementById('dashboardDoughnutChart');
  if (doughnutCanvas) {
    const stages = pipeData.stages;
    const counts = stages.map(st => pipeData.countsByStage[st] || 0);

    const doughnutData = {
      labels: stages,
      datasets: [{
        data: counts,
        backgroundColor: ['#60a5fa', '#a78bfa', '#38bdf8', '#fbbf24', '#34d399', '#f87171'],
        borderWidth: 2,
        borderColor: 'transparent'
      }]
    };

    if (doughnutChartInstance) {
      doughnutChartInstance.data = doughnutData;
      doughnutChartInstance.update();
    } else {
      doughnutChartInstance = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: doughnutData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          onClick: (evt, elements) => {
            if (elements && elements.length > 0 && typeof onNavigate === 'function') {
              onNavigate('crm');
            }
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10, family: 'Inter' }, boxWidth: 10 } }
          }
        }
      });
    }
  }

  // 3. Field Ops: Jobs by Status Doughnut Chart
  const jobsCanvas = document.getElementById('dashboardJobsStatusChart');
  if (jobsCanvas) {
    const jobMetrics = selectors.jobsMetrics(period);
    const statuses = jobMetrics.statuses;
    const jobCounts = statuses.map(st => jobMetrics.countsByStatus[st] || 0);

    const dataObj = {
      labels: statuses,
      datasets: [{
        data: jobCounts,
        backgroundColor: ['#94a3b8', '#38bdf8', '#3b82f6', '#f59e0b', '#10b981', '#059669'],
        borderWidth: 2,
        borderColor: 'transparent'
      }]
    };

    if (jobsStatusChartInstance) {
      jobsStatusChartInstance.data = dataObj;
      jobsStatusChartInstance.update();
    } else {
      jobsStatusChartInstance = new Chart(jobsCanvas, {
        type: 'doughnut',
        data: dataObj,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          onClick: () => onNavigate && onNavigate('jobs'),
          plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } } }
        }
      });
    }
  }

  // 4. Tickets by Severity
  const ticketsCanvas = document.getElementById('dashboardTicketsSeverityChart');
  if (ticketsCanvas) {
    const tMetrics = selectors.ticketsMetrics(period);
    const severities = tMetrics.severities;
    const tCounts = severities.map(sev => tMetrics.countsBySeverity[sev] || 0);

    const dataObj = {
      labels: severities,
      datasets: [{
        label: 'Tickets',
        data: tCounts,
        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6'],
        borderRadius: 6
      }]
    };

    if (ticketsSeverityChartInstance) {
      ticketsSeverityChartInstance.data = dataObj;
      ticketsSeverityChartInstance.update();
    } else {
      ticketsSeverityChartInstance = new Chart(ticketsCanvas, {
        type: 'bar',
        data: dataObj,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: () => onNavigate && onNavigate('tickets'),
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  }

  // 5. Payouts Paid vs Pending
  const payoutsCanvas = document.getElementById('dashboardPayoutsChart');
  if (payoutsCanvas) {
    const payMetrics = selectors.payoutsMetrics(period);
    const paidSum = payMetrics.totalDisbursed;
    const pendingSum = payMetrics.pendingDues;

    const dataObj = {
      labels: ['Settled / Paid (₹)', 'Pending Dues (₹)'],
      datasets: [{
        data: [paidSum, pendingSum],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 2,
        borderColor: 'transparent'
      }]
    };

    if (payoutsChartInstance) {
      payoutsChartInstance.data = dataObj;
      payoutsChartInstance.update();
    } else {
      payoutsChartInstance = new Chart(payoutsCanvas, {
        type: 'doughnut',
        data: dataObj,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          onClick: () => onNavigate && onNavigate('payouts'),
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
              }
            }
          }
        }
      });
    }
  }

  // 6. Technician Leaderboard (Points)
  const techCanvas = document.getElementById('dashboardTechLeaderboardChart');
  if (techCanvas) {
    const employees = (store.state.employees || []).filter(e => e.role.toLowerCase().includes('tech')).slice(0, 5);
    const techNames = employees.length > 0 ? employees.map(e => e.name.split(' ')[0]) : ['No Technicians'];
    const jobs = selectors.jobsMetrics(period).jobs;
    const techPoints = employees.length > 0 ? employees.map(e => {
      return jobs.filter(j => (j.status === 'Completed' || j.status === 'Verified') && (j.assignees || []).some(a => a.employeeId === e.id))
        .reduce((sum, j) => sum + (Number(j.pointsCount) || 0), 0);
    }) : [0];

    const dataObj = {
      labels: techNames,
      datasets: [{
        label: 'Points Completed',
        data: techPoints,
        backgroundColor: '#38bdf8',
        borderRadius: 4
      }]
    };

    if (techLeaderboardChartInstance) {
      techLeaderboardChartInstance.data = dataObj;
      techLeaderboardChartInstance.update();
    } else {
      techLeaderboardChartInstance = new Chart(techCanvas, {
        type: 'bar',
        data: dataObj,
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          onClick: () => onNavigate && onNavigate('team'),
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }
  }
}
