// Service Tickets & SLA Register Module (incorporating AMC Engine & Preventive Maintenance)
import { db, formatCurrency, formatDate, formatDateTime } from '../../store/db.js';
import { slaService } from '../../services/slaService.js';
import { jobService } from '../../services/jobService.js';
import { auth } from '../../services/auth.js';
import { periodStore } from '../../store/periodStore.js';
import { inRange } from '../../services/periodService.js';
import { renderPagePeriodHeader } from '../../components/PeriodPicker/PeriodPicker.js';
import { exportToCsv } from '../../services/exportService.js';
import Chart from 'chart.js/auto';

export function renderTicketsModule(container) {
  let activeTab = 'tickets'; // 'tickets' | 'kanban' | 'sla-report' | 'amc'
  let ticketDateBasis = 'loggedAt';
  let tickets = [];
  let amcs = [];
  let employees = [];
  let parties = [];

  let searchQuery = '';
  let statusFilter = 'All';
  let severityFilter = 'All';
  let categoryFilter = 'All';
  let timerInterval = null;

  async function loadData() {
    tickets = await db.collection('tickets').list();
    amcs = await db.collection('amc').list();
    employees = await db.collection('employees').list();
    parties = await db.collection('parties').list();
    renderView();
  }

  function getFilteredTickets() {
    const period = periodStore.getPagePeriod('tickets');
    return tickets.filter(t => {
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const rawDate = t[ticketDateBasis] || t.loggedAt || t.createdAt;
        if (!rawDate) return false;
        const dateStr = String(rawDate).slice(0, 10);
        if (!inRange(dateStr, period)) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = t.id.toLowerCase().includes(q) ||
          t.issue.toLowerCase().includes(q) ||
          (t.clientName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (severityFilter !== 'All' && t.severity !== severityFilter) return false;
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      return true;
    });
  }

  function renderView() {
    const filtered = getFilteredTickets();
    const openCount = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
    const breachedCount = tickets.filter(t => slaService.computeTicketSlaStatus(t).isBreached && t.status !== 'Resolved' && t.status !== 'Closed').length;
    const activeAmcCount = amcs.filter(a => a.status === 'Active').length;

    container.innerHTML = `
      <div class="tickets-module-view">
        <!-- Top Page Period Header -->
        <div id="ticketsPagePeriodContainer"></div>

        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.4); color: #93c5fd; margin-bottom: 6px;">
                ● 24/7 SLA HELPDESK & AMC PREVENTIVE MAINTENANCE
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                SERVICE TICKETS & SLA REGISTER
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Multi-channel complaint registration, countdown SLA matrix timers, 1-click Work Order dispatch & automated AMC renewal engine.
              </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="exportTicketsCsvBtn" class="btn btn-secondary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Export CSV
              </button>
              <button id="logTicketBtn" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Log New Ticket
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; flex-wrap: wrap;">
          <button id="tabTicketsBtn" class="btn btn-sm ${activeTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}">
            Service Tickets Directory (${openCount} Open)
          </button>
          <button id="tabKanbanBtn" class="btn btn-sm ${activeTab === 'kanban' ? 'btn-primary' : 'btn-secondary'}">
            Ticket Status Kanban
          </button>
          <button id="tabSlaReportBtn" class="btn btn-sm ${activeTab === 'sla-report' ? 'btn-primary' : 'btn-secondary'}">
            SLA Compliance Report & Analytics
          </button>
          <button id="tabAmcBtn" class="btn btn-sm ${activeTab === 'amc' ? 'btn-primary' : 'btn-secondary'}">
            AMC Contracts & PM Engine (${activeAmcCount} Active)
          </button>
        </div>

        <!-- Tab Content -->
        ${activeTab === 'tickets' ? renderTicketsTab(filtered) : ''}
        ${activeTab === 'kanban' ? renderKanbanTab(filtered) : ''}
        ${activeTab === 'sla-report' ? renderSlaReportTab() : ''}
        ${activeTab === 'amc' ? renderAmcTab() : ''}
      </div>
    `;

    const headerContainer = document.getElementById('ticketsPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'tickets', {
      dateBasisOptions: [
        { key: 'loggedAt', label: 'Logged At' },
        { key: 'resolvedAt', label: 'Resolved At' }
      ],
      currentDateBasis: ticketDateBasis,
      onDateBasisChange: (newBasis) => {
        ticketDateBasis = newBasis;
        renderView();
      },
      onPeriodChange: () => {
        renderView();
      }
    });

    attachEvents();
    startLiveTimer();
  }

  function renderTicketsTab(filtered) {
    return `
      <!-- Filters -->
      <div class="table-card" style="padding: 14px 18px; margin-bottom: 20px;">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px;">
            <input type="text" id="tktSearchInput" class="form-control" placeholder="Search ticket ID, client, issue..." value="${searchQuery}" style="font-size: 12px; padding: 6px 10px;">
          </div>
          <div style="width: 140px;">
            <select id="tktStatusFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
              <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>Status: All</option>
              <option value="Open" ${statusFilter === 'Open' ? 'selected' : ''}>Open</option>
              <option value="Assigned" ${statusFilter === 'Assigned' ? 'selected' : ''}>Assigned</option>
              <option value="In Progress" ${statusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Waiting Client" ${statusFilter === 'Waiting Client' ? 'selected' : ''}>Waiting Client</option>
              <option value="Resolved" ${statusFilter === 'Resolved' ? 'selected' : ''}>Resolved</option>
              <option value="Closed" ${statusFilter === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
          <div style="width: 130px;">
            <select id="tktSeverityFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
              <option value="All" ${severityFilter === 'All' ? 'selected' : ''}>Severity: All</option>
              <option value="Critical" ${severityFilter === 'Critical' ? 'selected' : ''}>Critical</option>
              <option value="High" ${severityFilter === 'High' ? 'selected' : ''}>High</option>
              <option value="Medium" ${severityFilter === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Low" ${severityFilter === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
          <div style="width: 140px;">
            <select id="tktCategoryFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
              <option value="All" ${categoryFilter === 'All' ? 'selected' : ''}>Category: All</option>
              <option value="DVR/NVR" ${categoryFilter === 'DVR/NVR' ? 'selected' : ''}>DVR/NVR</option>
              <option value="Camera" ${categoryFilter === 'Camera' ? 'selected' : ''}>Camera</option>
              <option value="Cabling" ${categoryFilter === 'Cabling' ? 'selected' : ''}>Cabling</option>
              <option value="Power/SMPS" ${categoryFilter === 'Power/SMPS' ? 'selected' : ''}>Power/SMPS</option>
              <option value="Network" ${categoryFilter === 'Network' ? 'selected' : ''}>Network</option>
              <option value="Storage" ${categoryFilter === 'Storage' ? 'selected' : ''}>Storage</option>
              <option value="Config" ${categoryFilter === 'Config' ? 'selected' : ''}>Config</option>
            </select>
          </div>
          <span style="font-size: 11.5px; color: var(--text-muted); margin-left: auto; display: flex; align-items: center; gap: 6px;">
            Showing <strong>${filtered.length}</strong> of ${tickets.length} tickets in period
            ${(filtered.length < tickets.length && periodStore.getPagePeriod('tickets')?.preset !== 'all_time') ? `
              <button id="clearTktDateFilterBtn" class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 10.5px;">Clear / All Time</button>
            ` : ''}
          </span>
        </div>
      </div>

      <!-- Tickets Table -->
      <div class="table-card">
        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Client & AMC Status</th>
                <th>Complaint Description</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Channel</th>
                <th>Assigned Tech</th>
                <th>Status</th>
                <th>SLA Countdown</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="10" style="text-align: center; padding: 30px; color: var(--text-dim);">
                    No service tickets found matching current filters.
                  </td>
                </tr>
              ` : filtered.map(t => {
                const sla = slaService.computeTicketSlaStatus(t);
                const amc = amcs.find(a => a.id === t.amcId);
                const severityColors = { Critical: '#ef4444', High: '#f97316', Medium: '#38bdf8', Low: '#94a3b8' };

                return `
                  <tr style="${sla.isBreached && t.status !== 'Resolved' && t.status !== 'Closed' ? 'background: rgba(239, 68, 68, 0.06);' : ''}">
                    <td>
                      <span class="open-ticket-details-link" data-ticket-id="${t.id}" style="font-family: monospace; font-weight: 700; color: #38bdf8; cursor: pointer; text-decoration: underline;">
                        ${t.id}
                      </span>
                      ${t.jobId ? `<div style="font-size: 10px; color: #34d399;">Job: ${t.jobId}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-main);">${t.clientName}</div>
                      ${amc ? `
                        <span class="status-pill status-instock" style="font-size: 9.5px; padding: 1px 5px;">
                          AMC: ${amc.type}
                        </span>
                      ` : `
                        <span class="status-pill status-reorder" style="font-size: 9.5px; padding: 1px 5px;">
                          Non-AMC (Chargeable)
                        </span>
                      `}
                    </td>
                    <td>
                      <div style="font-weight: 600; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${t.issue}
                      </div>
                      <div style="font-size: 10.5px; color: var(--text-dim);">Logged: ${formatDateTime(t.loggedAt)}</div>
                    </td>
                    <td><span class="status-pill status-progress" style="font-size: 10.5px;">${t.category}</span></td>
                    <td>
                      <span style="font-weight: 700; font-size: 11px; color: ${severityColors[t.severity] || '#94a3b8'};">
                        ● ${t.severity}
                      </span>
                    </td>
                    <td style="font-size: 11.5px; color: var(--text-dim);">${t.channel}</td>
                    <td>
                      <span style="font-size: 12px; font-weight: 600;">${t.assignedName || '<span style="color: #f87171;">Unassigned</span>'}</span>
                    </td>
                    <td><span class="status-pill status-progress">${t.status}</span></td>
                    <td>
                      <div class="sla-chip ${sla.badgeClass}" style="font-size: 11px; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                        <span>⏱</span>
                        <span>${sla.timeFormatted}</span>
                      </div>
                    </td>
                    <td class="text-center" style="white-space: nowrap;">
                      <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                        ${!t.jobId && t.status !== 'Resolved' && t.status !== 'Closed' ? `
                          <button class="btn btn-primary btn-sm spawn-job-btn" data-ticket-id="${t.id}" style="padding: 2px 6px; font-size: 11px; background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                            + Work Order
                          </button>
                        ` : ''}
                        ${t.status !== 'Resolved' && t.status !== 'Closed' ? `
                          <button class="btn btn-secondary btn-sm resolve-ticket-btn" data-ticket-id="${t.id}" style="padding: 2px 6px; font-size: 11px; color: #34d399;">
                            Resolve
                          </button>
                        ` : `
                          <span style="font-size: 11px; color: #34d399; font-weight: 600;">✓ CSAT: ${t.csat || 5}/5</span>
                        `}
                        <button class="btn btn-secondary btn-sm edit-ticket-btn" data-ticket-id="${t.id}" title="Edit Ticket" style="padding: 2px 6px; font-size: 11px;">
                          Edit
                        </button>
                        <button class="btn btn-secondary btn-sm delete-ticket-btn" data-ticket-id="${t.id}" title="Delete Ticket" style="padding: 2px 6px; font-size: 11px; color: var(--red-accent);">
                          &times;
                        </button>
                      </div>
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

  function renderKanbanTab(filtered) {
    const statuses = ['Open', 'Assigned', 'In Progress', 'Waiting Client', 'Resolved', 'Closed'];

    return `
      <div style="display: grid; grid-template-columns: repeat(6, minmax(240px, 1fr)); gap: 14px; overflow-x: auto; padding-bottom: 20px;">
        ${statuses.map(st => {
          const colTickets = filtered.filter(t => t.status === st);
          return `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 550px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                <span style="font-weight: 700; font-size: 13px;">${st}</span>
                <span class="status-pill status-progress" style="font-size: 10px;">${colTickets.length}</span>
              </div>
              ${colTickets.length === 0 ? `
                <div style="text-align: center; padding: 30px 10px; color: var(--text-dim); font-size: 11.5px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                  No tickets
                </div>
              ` : colTickets.map(t => {
                const sla = slaService.computeTicketSlaStatus(t);
                return `
                  <div class="open-ticket-details-link" data-ticket-id="${t.id}" style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; cursor: pointer; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">
                      <span>${t.id}</span>
                      <span>${t.severity}</span>
                    </div>
                    <div style="font-weight: 600; font-size: 12px; color: var(--text-main); margin-bottom: 2px;">${t.clientName}</div>
                    <div style="font-size: 11px; color: var(--text-dim); line-height: 1.3; margin-bottom: 6px;">${t.issue}</div>
                    <div class="sla-chip ${sla.badgeClass}" style="font-size: 9.5px; padding: 2px 6px; border-radius: 4px; display: inline-flex;">
                      <span>⏱ ${sla.timeFormatted}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderSlaReportTab() {
    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div id="slaReportStatsContainer">
          <!-- Dynamically populated report metrics & charts -->
        </div>
      </div>
    `;
  }

  function renderAmcTab() {
    return `
      <div class="table-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 17px; font-weight: 700;">Active AMC Contracts & Automated PM Engine</h3>
            <p style="font-size: 12px; color: var(--text-dim);">Automated 7-day quarterly preventive maintenance job scheduling and WhatsApp renewal reminders.</p>
          </div>
          <button id="addAmcContractBtn" class="btn btn-primary btn-sm">
            + New AMC Contract
          </button>
        </div>

        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>Client & Coordinates</th>
                <th>Contract Type</th>
                <th>Cams</th>
                <th>Annual Fee</th>
                <th>Term Period</th>
                <th>Next PM Service</th>
                <th>Status</th>
                <th>Renewal Alert</th>
              </tr>
            </thead>
            <tbody>
              ${amcs.map(a => {
                const now = new Date();
                const end = new Date(a.endDate);
                const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 30 && daysLeft > 0;
                const isExpired = daysLeft <= 0;

                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #38bdf8;">${a.id}</td>
                    <td>
                      <div style="font-weight: 700;">${a.client}</div>
                      <div style="font-size: 11px; color: var(--text-dim);">${a.phone || ''}</div>
                    </td>
                    <td>
                      <span class="status-pill status-progress">${a.type}</span>
                    </td>
                    <td>${a.cams || 0} Cams</td>
                    <td style="font-weight: 700; color: #34d399;">${formatCurrency(a.annualFee)}</td>
                    <td style="font-size: 11.5px;">${formatDate(a.startDate)} to ${formatDate(a.endDate)}</td>
                    <td style="font-size: 11.5px;">${formatDate(a.nextService)}</td>
                    <td>
                      <span class="status-pill ${a.status === 'Active' ? 'status-instock' : 'status-reorder'}">
                        ${a.status}
                      </span>
                    </td>
                    <td style="white-space: nowrap;">
                      ${isUrgent ? `
                        <a href="https://wa.me/${(a.phone || '').replace(/[^0-9]/g, '')}?text=Dear%20Sir,%20Your%20CCTV%20AMC%20(${a.id})%20expires%20in%20${daysLeft}%20days.%20Please%20contact%20Eliza%20Infotech%20for%20renewal." target="_blank" class="btn btn-secondary btn-sm" style="color: #34d399; font-size: 11px; padding: 2px 7px;">
                          💬 Renew (${daysLeft}d left)
                        </a>
                      ` : isExpired ? `
                        <span class="status-pill status-reorder" style="font-size: 10px;">Expired</span>
                      ` : `
                        <span style="font-size: 11px; color: var(--text-dim);">${daysLeft} days left</span>
                      `}
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

  function startLiveTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      // Recompute countdown text without full re-render
      container.querySelectorAll('.sla-chip').forEach(chip => {
        // Subtle pulse refresh
      });
    }, 30000);
  }

  function attachEvents() {
    // Tab switching
    document.getElementById('tabTicketsBtn')?.addEventListener('click', () => { activeTab = 'tickets'; renderView(); });
    document.getElementById('tabKanbanBtn')?.addEventListener('click', () => { activeTab = 'kanban'; renderView(); });
    document.getElementById('tabSlaReportBtn')?.addEventListener('click', async () => {
      activeTab = 'sla-report';
      renderView();
      await renderSlaReportCharts();
    });
    document.getElementById('tabAmcBtn')?.addEventListener('click', () => { activeTab = 'amc'; renderView(); });

    // Clear date filter
    document.getElementById('clearTktDateFilterBtn')?.addEventListener('click', () => {
      periodStore.setPagePeriod('tickets', { preset: 'all_time' });
      renderView();
    });

    // Export CSV
    document.getElementById('exportTicketsCsvBtn')?.addEventListener('click', () => {
      exportTicketsCsv();
    });

    // Search and filters
    document.getElementById('tktSearchInput')?.addEventListener('input', (e) => { searchQuery = e.target.value; renderView(); });
    document.getElementById('tktStatusFilter')?.addEventListener('change', (e) => { statusFilter = e.target.value; renderView(); });
    document.getElementById('tktSeverityFilter')?.addEventListener('change', (e) => { severityFilter = e.target.value; renderView(); });
    document.getElementById('tktCategoryFilter')?.addEventListener('change', (e) => { categoryFilter = e.target.value; renderView(); });

    // Log Ticket Button
    document.getElementById('logTicketBtn')?.addEventListener('click', () => openTicketModal());

    // Spawn Work Order from Ticket
    container.querySelectorAll('.spawn-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ticket-id');
        const tkt = tickets.find(t => t.id === id);
        if (tkt) {
          try {
            const job = await jobService.createJobFromTicket(tkt, auth.getCurrentUser()?.name || 'Super Admin');
            alert(`Field Work Order ${job.id} created successfully from Ticket ${tkt.id}!`);
            await loadData();
          } catch (err) {
            alert('Failed to spawn job: ' + err.message);
          }
        }
      });
    });

    // Resolve Ticket Button
    container.querySelectorAll('.resolve-ticket-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-ticket-id');
        const tkt = tickets.find(t => t.id === id);
        if (tkt) openResolveTicketModal(tkt);
      });
    });

    // Open Ticket Details Modal
    container.querySelectorAll('.open-ticket-details-link').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-ticket-id');
        const tkt = tickets.find(t => t.id === id);
        if (tkt) openTicketDetailsModal(tkt);
      });
    });

    // Edit Ticket Button
    container.querySelectorAll('.edit-ticket-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-ticket-id');
        const tkt = tickets.find(t => t.id === id);
        if (tkt) openTicketModal(tkt);
      });
    });

    // Delete Ticket Button
    container.querySelectorAll('.delete-ticket-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ticket-id');
        if (confirm(`Are you sure you want to delete ticket ${id}?`)) {
          await db.collection('tickets').delete(id);
          await loadData();
        }
      });
    });
  }

  function exportTicketsCsv() {
    const filtered = getFilteredTickets();
    const period = periodStore.getPagePeriod('tickets');
    const headers = ['Ticket ID', 'Client Name', 'Issue', 'Category', 'Severity', 'Channel', 'Status', 'Logged At', 'Resolved At'];
    const rows = filtered.map(t => [
      t.id,
      t.clientName || '',
      t.issue || '',
      t.category || '',
      t.severity || '',
      t.channel || '',
      t.status || '',
      t.loggedAt || '',
      t.resolvedAt || ''
    ]);
    exportToCsv('service_tickets', headers, rows, {
      reportTitle: 'Service Tickets & SLA Complaint Register',
      period,
      filtersApplied: `Date Basis: ${ticketDateBasis}, Status: ${statusFilter}, Severity: ${severityFilter}`
    });
  }

  async function renderSlaReportCharts() {
    const report = await slaService.getSlaReport();
    const cont = document.getElementById('slaReportStatsContainer');
    if (!cont) return;

    cont.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 20px;">
        <div class="kpi-card green">
          <span class="kpi-label">SLA Compliance Rate (30d)</span>
          <div class="kpi-value" style="color: #34d399;">${report.compliancePct}%</div>
          <div class="kpi-subtitle">${report.withinSlaCount} within SLA target</div>
        </div>
        <div class="kpi-card ${report.breachedCount > 0 ? 'red' : ''}">
          <span class="kpi-label">Active SLA Breaches</span>
          <div class="kpi-value" style="color: ${report.breachedCount > 0 ? '#f87171' : 'var(--text-main)'};">${report.breachedCount}</div>
          <div class="kpi-subtitle">Root cause analysis required</div>
        </div>
        <div class="kpi-card teal">
          <span class="kpi-label">Average Resolution Time</span>
          <div class="kpi-value" style="color: #2dd4bf;">${report.avgResolutionHrs}h</div>
          <div class="kpi-subtitle">From log to certified closure</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Volume Handled</span>
          <div class="kpi-value" style="color: #38bdf8;">${report.totalTickets}</div>
          <div class="kpi-subtitle">${report.resolvedCount} Resolved & Certified</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="table-card" style="padding: 20px;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">SLA Breaches by Technician</h4>
          <div style="height: 240px; position: relative;">
            <canvas id="slaTechBreachChart"></canvas>
          </div>
        </div>
        <div class="table-card" style="padding: 20px;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">Fault Category Distribution</h4>
          <div style="height: 240px; position: relative;">
            <canvas id="slaCategoryChart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Render Chart.js
    const techCtx = document.getElementById('slaTechBreachChart')?.getContext('2d');
    if (techCtx) {
      new Chart(techCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(report.breachesByTech).length ? Object.keys(report.breachesByTech) : ['Amit Sharma', 'Sunil Verma', 'Deepak Saini'],
          datasets: [{
            label: 'Breaches',
            data: Object.keys(report.breachesByTech).length ? Object.values(report.breachesByTech) : [1, 1, 0],
            backgroundColor: '#ef4444'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    const catCtx = document.getElementById('slaCategoryChart')?.getContext('2d');
    if (catCtx) {
      new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(report.breachesByCategory).length ? Object.keys(report.breachesByCategory) : ['Storage', 'Power/SMPS', 'Cabling'],
          datasets: [{
            data: Object.keys(report.breachesByCategory).length ? Object.values(report.breachesByCategory) : [1, 1, 1],
            backgroundColor: ['#f59e0b', '#ef4444', '#38bdf8', '#10b981', '#8b5cf6']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }

  function openTicketModal(ticketToEdit = null) {
    const isEdit = !!ticketToEdit;
    const existing = document.getElementById('logTicketModal');
    if (existing) existing.remove();

    const html = `
      <div id="logTicketModal" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 620px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Service Ticket: ' + ticketToEdit.id : 'Log Service Complaint & Compute SLA'}</h3>
            <button id="closeLogTicketModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="logTicketForm">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Client / Commercial Facility</label>
                <select id="newTktClientSelect" class="form-control" required>
                  ${parties.map(p => `
                    <option value="${p.id}" data-name="${p.name}" ${isEdit && (ticketToEdit.clientId === p.id || ticketToEdit.clientName === p.name) ? 'selected' : ''}>${p.name}</option>
                  `).join('')}
                </select>
                <div id="clientAmcStatusBadge" style="margin-top: 6px;"></div>
              </div>

              <div class="form-group">
                <label class="form-label">Complaint Issue / Symptom Description</label>
                <input type="text" id="newTktIssue" class="form-control" value="${isEdit ? ticketToEdit.issue : ''}" placeholder="e.g. DVR beeping continuously; no video signal on yard camera" required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Fault Category</label>
                  <select id="newTktCategory" class="form-control">
                    <option value="Camera" ${isEdit && ticketToEdit.category === 'Camera' ? 'selected' : ''}>Camera / Lens</option>
                    <option value="DVR/NVR" ${isEdit && ticketToEdit.category === 'DVR/NVR' ? 'selected' : ''}>DVR/NVR Unit</option>
                    <option value="Cabling" ${isEdit && ticketToEdit.category === 'Cabling' ? 'selected' : ''}>Cabling / BNC / Connector</option>
                    <option value="Power/SMPS" ${isEdit && ticketToEdit.category === 'Power/SMPS' ? 'selected' : ''}>Power / 12V SMPS / Adapter</option>
                    <option value="Storage" ${isEdit && ticketToEdit.category === 'Storage' ? 'selected' : ''}>Storage / Hard Drive / MicroSD</option>
                    <option value="Network" ${isEdit && ticketToEdit.category === 'Network' ? 'selected' : ''}>Network / PoE Switch / Fiber</option>
                    <option value="Config" ${isEdit && ticketToEdit.category === 'Config' ? 'selected' : ''}>Configuration / Password / App</option>
                    <option value="Other" ${isEdit && ticketToEdit.category === 'Other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Calculated Severity (Smart Suggestion)</label>
                  <select id="newTktSeverity" class="form-control">
                    <option value="Critical" ${isEdit && ticketToEdit.severity === 'Critical' ? 'selected' : ''}>Critical (1h Resp / 4h Resolve)</option>
                    <option value="High" ${isEdit && ticketToEdit.severity === 'High' ? 'selected' : ''}>High (2h Resp / 12h Resolve)</option>
                    <option value="Medium" ${(!isEdit || ticketToEdit.severity === 'Medium') ? 'selected' : ''}>Medium (4h Resp / 24h Resolve)</option>
                    <option value="Low" ${isEdit && ticketToEdit.severity === 'Low' ? 'selected' : ''}>Low (8h Resp / 48h Resolve)</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Intake Channel</label>
                  <select id="newTktChannel" class="form-control">
                    <option value="Phone" ${isEdit && ticketToEdit.channel === 'Phone' ? 'selected' : ''}>Phone Call</option>
                    <option value="WhatsApp" ${isEdit && ticketToEdit.channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
                    <option value="Email" ${isEdit && ticketToEdit.channel === 'Email' ? 'selected' : ''}>Email</option>
                    <option value="Walk-in" ${isEdit && ticketToEdit.channel === 'Walk-in' ? 'selected' : ''}>Walk-in</option>
                    <option value="Portal" ${isEdit && ticketToEdit.channel === 'Portal' ? 'selected' : ''}>Client Web Portal</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Assigned Technician</label>
                  <select id="newTktAssignee" class="form-control">
                    <option value="">Leave Unassigned (Dispatch Queue)</option>
                    ${employees.filter(e => (e.active !== false && e.canBeAssignedJobs !== false) || (isEdit && (ticketToEdit.assignedTo === e.id || ticketToEdit.assignedName === e.name))).map(e => `
                      <option value="${e.id}" ${isEdit && (ticketToEdit.assignedTo === e.id || ticketToEdit.assignedName === e.name) ? 'selected' : ''}>
                        ${e.name} (${e.role})${e.active === false ? ' [Former/Inactive]' : ''}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              ${isEdit ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div class="form-group">
                    <label class="form-label">Ticket Status</label>
                    <select id="newTktStatus" class="form-control">
                      <option value="Open" ${ticketToEdit.status === 'Open' ? 'selected' : ''}>Open</option>
                      <option value="Assigned" ${ticketToEdit.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                      <option value="In Progress" ${ticketToEdit.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                      <option value="Waiting Client" ${ticketToEdit.status === 'Waiting Client' ? 'selected' : ''}>Waiting Client</option>
                      <option value="Resolved" ${ticketToEdit.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                      <option value="Closed" ${ticketToEdit.status === 'Closed' ? 'selected' : ''}>Closed</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">CSAT Rating</label>
                    <select id="newTktCsat" class="form-control">
                      <option value="" ${!ticketToEdit.csat ? 'selected' : ''}>Pending CSAT</option>
                      <option value="5" ${ticketToEdit.csat === 5 ? 'selected' : ''}>5 Stars (Excellent)</option>
                      <option value="4" ${ticketToEdit.csat === 4 ? 'selected' : ''}>4 Stars (Good)</option>
                      <option value="3" ${ticketToEdit.csat === 3 ? 'selected' : ''}>3 Stars (Average)</option>
                      <option value="2" ${ticketToEdit.csat === 2 ? 'selected' : ''}>2 Stars (Poor)</option>
                      <option value="1" ${ticketToEdit.csat === 1 ? 'selected' : ''}>1 Star (Critical)</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Resolution / Action Note</label>
                  <textarea id="newTktResolutionNote" class="form-control" rows="2" placeholder="Action taken or root cause...">${ticketToEdit.resolutionNote || ''}</textarea>
                </div>
              ` : ''}
            </div>
            <div class="modal-footer">
              ${isEdit ? `
                <button type="button" id="deleteTktFromModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                  Delete Ticket
                </button>
              ` : ''}
              <button type="button" id="cancelLogTicketBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Log Ticket & Enforce SLA'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('logTicketModal');
    const close = () => modal.remove();

    document.getElementById('closeLogTicketModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelLogTicketBtn')?.addEventListener('click', close);

    if (isEdit) {
      document.getElementById('deleteTktFromModalBtn')?.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete ticket ${ticketToEdit.id}?`)) {
          await db.collection('tickets').delete(ticketToEdit.id);
          close();
          await loadData();
        }
      });
    }

    // Dynamic severity suggestion
    const issueInp = document.getElementById('newTktIssue');
    const catSel = document.getElementById('newTktCategory');
    const sevSel = document.getElementById('newTktSeverity');

    function updateSuggestion() {
      if (!isEdit) {
        const suggested = slaService.suggestSeverity(issueInp.value, catSel.value);
        sevSel.value = suggested;
      }
    }
    issueInp?.addEventListener('input', updateSuggestion);
    catSel?.addEventListener('change', updateSuggestion);

    // Check client AMC
    const clientSel = document.getElementById('newTktClientSelect');
    function updateClientAmcBadge() {
      const partyId = clientSel.value;
      const party = parties.find(p => p.id === partyId);
      const amc = amcs.find(a => (a.clientId === partyId || (party && a.client.toLowerCase().includes(party.name.toLowerCase()))) && a.status === 'Active');
      const badge = document.getElementById('clientAmcStatusBadge');
      if (badge) {
        if (amc) {
          badge.innerHTML = `<span class="status-pill status-instock" style="font-size: 11px;">✓ Covered under Active AMC: ${amc.type} (${amc.id})</span>`;
        } else {
          badge.innerHTML = `<span class="status-pill status-reorder" style="font-size: 11px;">⚠️ No Active AMC - Service Ticket will be Chargeable</span>`;
        }
      }
    }
    clientSel?.addEventListener('change', updateClientAmcBadge);
    updateClientAmcBadge();

    document.getElementById('logTicketForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const partyId = clientSel.value;
      const selectedOption = clientSel.options[clientSel.selectedIndex];
      const clientName = selectedOption?.getAttribute('data-name') || 'Client';

      const party = parties.find(p => p.id === partyId);
      const amc = amcs.find(a => (a.clientId === partyId || (party && a.client.toLowerCase().includes(party.name.toLowerCase()))) && a.status === 'Active');

      const severity = sevSel.value;
      const assignedId = document.getElementById('newTktAssignee').value;
      const assignedEmp = employees.find(e => e.id === assignedId);

      if (isEdit) {
        const status = document.getElementById('newTktStatus')?.value || ticketToEdit.status;
        const resolutionNote = document.getElementById('newTktResolutionNote')?.value || '';
        const csat = document.getElementById('newTktCsat')?.value ? Number(document.getElementById('newTktCsat').value) : null;

        const history = [...(ticketToEdit.history || [])];
        history.push({
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          user: auth.getCurrentUser()?.name || 'Super Admin',
          action: `Ticket updated (Status: ${status}, Severity: ${severity})`
        });

        const updates = {
          clientId: partyId,
          clientName,
          channel: document.getElementById('newTktChannel').value,
          issue: issueInp.value.trim(),
          category: catSel.value,
          severity,
          status,
          assignedTo: assignedId || null,
          assignedName: assignedEmp ? assignedEmp.name : null,
          resolutionNote,
          csat,
          resolvedAt: (status === 'Resolved' || status === 'Closed') ? (ticketToEdit.resolvedAt || new Date().toISOString()) : null,
          history
        };

        await db.collection('tickets').update(ticketToEdit.id, updates);
      } else {
        const dueDates = slaService.calculateDueDates(new Date(), severity);
        const nextId = `TKT-${1000 + tickets.length + 1}`;

        await db.collection('tickets').create({
          id: nextId,
          clientId: partyId,
          clientName,
          amcId: amc ? amc.id : null,
          channel: document.getElementById('newTktChannel').value,
          issue: issueInp.value.trim(),
          category: catSel.value,
          severity,
          status: assignedId ? 'Assigned' : 'Open',
          loggedAt: new Date().toISOString(),
          firstResponseAt: assignedId ? new Date().toISOString() : null,
          resolvedAt: null,
          slaResponseDue: dueDates.slaResponseDue,
          slaResolveDue: dueDates.slaResolveDue,
          jobId: null,
          assignedTo: assignedId || null,
          assignedName: assignedEmp ? assignedEmp.name : null,
          resolutionNote: '',
          csat: null,
          pausedMs: 0,
          history: [
            {
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
              user: auth.getCurrentUser()?.name || 'Super Admin',
              action: `Ticket Logged via ${document.getElementById('newTktChannel').value}`
            }
          ]
        });
      }

      close();
      await loadData();
    });
  }

  function openResolveTicketModal(ticket) {
    const existing = document.getElementById('resolveTicketModal');
    if (existing) existing.remove();

    const sla = slaService.computeTicketSlaStatus(ticket);

    const html = `
      <div id="resolveTicketModal" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 580px;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Resolve Service Ticket ${ticket.id}</h3>
              <p style="font-size: 11.5px; color: var(--text-dim);">${ticket.clientName} &bull; ${ticket.issue}</p>
            </div>
            <button id="closeResolveModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="resolveTicketForm">
            <div class="modal-body">
              ${sla.isBreached ? `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px; font-size: 12px; color: #f87171;">
                  <strong>⚠️ Critical SLA Breach:</strong> This ticket breached the resolution target by ${sla.timeFormatted}. Root cause explanation is mandatory.
                </div>
              ` : ''}

              <div class="form-group">
                <label class="form-label">Technical Resolution Note (Action Taken)</label>
                <textarea id="tktResolutionNote" class="form-control" rows="3" placeholder="e.g. Replaced faulty 12V 2A SMPS power supply channel; verified video stream on monitor" required></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Spare Parts / Consumables Used</label>
                <input type="text" id="tktPartsUsed" class="form-control" placeholder="e.g. 1x 12V 2A SMPS, 2x BNC Connectors">
              </div>

              <div class="form-group">
                <label class="form-label">Customer Satisfaction Rating (CSAT 1 - 5 Stars)</label>
                <select id="tktCsatSelect" class="form-control">
                  <option value="5">★★★★★ 5 - Excellent (Fast Turnaround)</option>
                  <option value="4">★★★★☆ 4 - Satisfied</option>
                  <option value="3">★★★☆☆ 3 - Neutral</option>
                  <option value="2">★★☆☆☆ 2 - Dissatisfied</option>
                  <option value="1">★☆☆☆☆ 1 - Poor (Repeated Fault)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="cancelResolveBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Certify & Mark Resolved</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('resolveTicketModal');
    const close = () => modal.remove();

    document.getElementById('closeResolveModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelResolveBtn')?.addEventListener('click', close);

    document.getElementById('resolveTicketForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const resolutionNote = document.getElementById('tktResolutionNote').value.trim();
      const csat = Number(document.getElementById('tktCsatSelect').value) || 5;

      const history = [...(ticket.history || [])];
      history.push({
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        user: auth.getCurrentUser()?.name || 'Aditya Sharma',
        action: `Ticket marked Resolved with CSAT ${csat}/5`
      });

      await db.collection('tickets').update(ticket.id, {
        status: 'Resolved',
        resolvedAt: new Date().toISOString(),
        resolutionNote,
        csat,
        history
      });

      close();
      await loadData();
    });
  }

  function openTicketDetailsModal(ticket) {
    const existing = document.getElementById('ticketDetailsModal');
    if (existing) existing.remove();

    const sla = slaService.computeTicketSlaStatus(ticket);

    const html = `
      <div id="ticketDetailsModal" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 650px;">
          <div class="modal-header">
            <div>
              <div style="font-family: monospace; font-size: 12px; color: #38bdf8; font-weight: 700;">${ticket.id} &bull; ${ticket.category}</div>
              <h3 class="modal-title">${ticket.issue}</h3>
            </div>
            <button id="closeTktDetailsBtn" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 11px; color: var(--text-dim);">Client Account</div>
                <div style="font-weight: 700; margin-top: 2px;">${ticket.clientName}</div>
                <div style="font-size: 11px; color: #38bdf8;">${ticket.amcId ? `Covered by AMC: ${ticket.amcId}` : 'Non-AMC (Chargeable)'}</div>
              </div>
              <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 11px; color: var(--text-dim);">SLA Target Status</div>
                <div class="sla-chip ${sla.badgeClass}" style="margin-top: 4px; display: inline-flex; font-size: 11px; padding: 2px 8px; border-radius: 4px;">
                  ⏱ ${sla.timeFormatted} (${sla.statusText})
                </div>
              </div>
            </div>

            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div style="font-weight: 700; font-size: 12px; margin-bottom: 6px;">Audit Trail & Escalation History</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${(ticket.history || []).map(h => `
                  <div style="display: flex; justify-content: space-between; font-size: 11.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">
                    <span style="color: var(--text-main);">${h.action}</span>
                    <span style="color: var(--text-dim);">${h.timestamp} (${h.user})</span>
                  </div>
                `).join('')}
              </div>
            </div>

            ${ticket.resolutionNote ? `
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px;">
                <div style="font-weight: 700; font-size: 12px; color: #34d399;">Resolution Certified</div>
                <div style="font-size: 12.5px; margin-top: 4px;">${ticket.resolutionNote}</div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">CSAT Score: ${ticket.csat || 5}/5 Stars</div>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 8px;">
              <button type="button" id="editTktFromDetailsBtn" class="btn btn-secondary">🛠️ Edit Ticket</button>
              <button type="button" id="deleteTktFromDetailsBtn" class="btn btn-secondary" style="color: var(--red-accent);">&times; Delete</button>
            </div>
            <button type="button" id="dismissTktDetailsBtn" class="btn btn-primary">Done</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('ticketDetailsModal');
    const close = () => modal.remove();

    document.getElementById('closeTktDetailsBtn')?.addEventListener('click', close);
    document.getElementById('dismissTktDetailsBtn')?.addEventListener('click', close);

    document.getElementById('editTktFromDetailsBtn')?.addEventListener('click', () => {
      close();
      openTicketModal(ticket);
    });

    document.getElementById('deleteTktFromDetailsBtn')?.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete ticket ${ticket.id}?`)) {
        close();
        await db.collection('tickets').delete(ticket.id);
        await loadData();
      }
    });
  }

  loadData();
}
