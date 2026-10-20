// AMC & SLA Service Desk Module
import { store } from '../services/store.js';
import { periodStore } from '../store/periodStore.js';
import { inRange } from '../services/periodService.js';
import { renderPagePeriodHeader } from '../components/PeriodPicker/PeriodPicker.js';

export function renderAmcModule(container) {
  let amcDateBasis = 'endDate';

  function updateView() {
    const allAmc = store.state.amc || [];
    const tickets = store.state.tickets || [];
    const period = periodStore.getPagePeriod('amc');
    const now = new Date();

    const amcList = allAmc.filter(a => {
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const rawDate = a[amcDateBasis] || a.endDate || a.startDate;
        if (!rawDate) return false;
        const dateStr = String(rawDate).slice(0, 10);
        if (!inRange(dateStr, period)) return false;
      }
      return true;
    });

    const totalAmcRevenue = amcList.reduce((s, a) => s + (Number(a.annualFee) || 0), 0);
    const totalCamsCovered = amcList.reduce((s, a) => s + (Number(a.cams) || 0), 0);

    const urgentCount = amcList.filter(a => {
      const diff = Math.ceil((new Date(a.endDate) - now) / (1000 * 60 * 60 * 24));
      return diff <= 30 && diff > 0;
    }).length;

    container.innerHTML = `
      <div class="amc-module-view">
        <!-- Top Page Period Header -->
        <div id="amcPagePeriodContainer"></div>

        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(245, 158, 11, 0.25); color: #fbbf24; margin-bottom: 6px;">
                ● PREVENTIVE MAINTENANCE & SLA DESK
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                ANNUAL MAINTENANCE CONTRACTS (AMC) & SLA COMPLAINT REGISTER
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Automated expiration alerts, quarterly routine visit tracker & breakdown SLA compliance.
              </p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="newAmcContractBtn" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Register New AMC
              </button>
              <button id="newSlaTicketBtn" class="btn btn-secondary btn-sm" style="color: var(--red-accent);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                Log SLA Complaint
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card teal">
            <span class="kpi-label">Recurring Annual Fee</span>
            <div class="kpi-value" style="color: #2dd4bf;">₹${totalAmcRevenue.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">10 Regional Accounts</div>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Active AMC Cams</span>
            <div class="kpi-value" style="color: #38bdf8;">${totalCamsCovered} Cameras</div>
            <div class="kpi-subtitle">Comprehensive & Labour</div>
          </div>
          <div class="kpi-card amber">
            <span class="kpi-label">Urgent Expirations</span>
            <div class="kpi-value" style="color: #fbbf24;">${urgentCount} Contracts</div>
            <div class="kpi-subtitle">&le; 30 Days Remaining</div>
          </div>
          <div class="kpi-card green">
            <span class="kpi-label">SLA Compliance Rate</span>
            <div class="kpi-value" style="color: #34d399;">100.0%</div>
            <div class="kpi-subtitle">8 Resolved Tickets</div>
          </div>
        </div>

        <!-- Section A: AMC Contracts Table -->
        <div class="table-card" style="margin-bottom: 24px;">
          <div class="table-header-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div class="table-title-group">
              <h3>SECTION A: AMC CONTRACTS, EXPIRATION ENGINE & PREVENTIVE SCHEDULE</h3>
              <p>Dynamic expiration countdown calculating live remaining contract days</p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted);">
                Showing <strong>${amcList.length}</strong> of ${allAmc.length} contracts in period
              </span>
              ${(amcList.length < allAmc.length && period?.preset !== 'all_time') ? `
                <button id="clearAmcDateFilterBtn" class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 10.5px;">Clear / All Time</button>
              ` : ''}
            </div>
          </div>

          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>Contract ID</th>
                  <th>Client Organization</th>
                  <th>Contact Phone</th>
                  <th class="text-center">Cams</th>
                  <th class="text-center">Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th class="text-right">Annual Fee (₹)</th>
                  <th class="text-center">Status</th>
                  <th>Next Service</th>
                  <th class="text-center">Days to Expiry</th>
                  <th class="text-center">Alert Status</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                ${amcList.map(a => {
                  const end = new Date(a.endDate);
                  const daysToExpiry = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                  let alertBadge = '<span class="status-pill status-instock">OK</span>';
                  if (daysToExpiry <= 0) {
                    alertBadge = '<span class="status-pill status-reorder">EXPIRED</span>';
                  } else if (daysToExpiry <= 30) {
                    alertBadge = '<span class="status-pill status-pending">URGENT RENEWAL</span>';
                  }

                  return `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${a.id}</td>
                      <td style="font-weight: 600;">${a.client}</td>
                      <td style="font-family: monospace; font-size: 11.5px;">${a.phone}</td>
                      <td class="text-center" style="font-weight: 700;">${a.cams}</td>
                      <td class="text-center"><span class="status-pill status-progress" style="font-size: 11px;">${a.type}</span></td>
                      <td style="font-size: 12px;">${a.startDate}</td>
                      <td style="font-size: 12px; font-weight: 600;">${a.endDate}</td>
                      <td class="text-right" style="font-weight: 700; color: #38bdf8;">₹${Number(a.annualFee).toLocaleString('en-IN')}</td>
                      <td class="text-center"><span class="status-pill ${a.status === 'Active' ? 'status-instock' : (a.status === 'Expired' ? 'status-reorder' : 'status-pending')}">${a.status}</span></td>
                      <td style="font-size: 12px; color: #fbbf24;">${a.nextService}</td>
                      <td class="text-center" style="font-weight: 700; font-family: monospace; color: ${daysToExpiry <= 30 ? '#f87171' : '#34d399'};">
                        ${daysToExpiry > 0 ? daysToExpiry + ' Days' : '0 Days'}
                      </td>
                      <td class="text-center">${alertBadge}</td>
                      <td class="text-center" style="white-space: nowrap;">
                        <button class="btn btn-secondary btn-sm renew-amc-btn" data-amc-id="${a.id}" style="padding: 3px 6px; font-size: 11px;" title="Renew +1 Year">
                          +1Yr
                        </button>
                        <button class="btn btn-secondary btn-sm edit-amc-btn" data-amc-id="${a.id}" style="padding: 3px 6px; font-size: 11px;" title="Edit Contract">
                          Edit
                        </button>
                        <button class="btn btn-secondary btn-sm delete-amc-btn" data-amc-id="${a.id}" style="padding: 3px 6px; font-size: 11px; color: var(--red-accent);" title="Delete AMC Contract">
                          &times;
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-right" style="font-weight: 700;">TOTAL RECURRING ANNUAL AMC REVENUE:</td>
                  <td class="text-center" style="font-weight: 800; color: #38bdf8;">${totalCamsCovered} Cams</td>
                  <td colspan="3"></td>
                  <td class="text-right" style="font-size: 15px; font-weight: 800; color: #34d399;">₹${totalAmcRevenue.toLocaleString('en-IN')}</td>
                  <td colspan="5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Section B: SLA Complaint Register -->
        <div class="table-card">
          <div class="table-header-bar">
            <div class="table-title-group">
              <h3>SECTION B: COMPLAINT & SLA SERVICE TICKET REGISTER</h3>
              <p>Turnaround time tracking against critical response benchmarks</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Date Logged</th>
                  <th>Client Organization</th>
                  <th>Reported Breakdown Issue</th>
                  <th class="text-center">Severity</th>
                  <th>Assigned Tech</th>
                  <th>Visit Date</th>
                  <th>Field Action & Resolution</th>
                  <th class="text-right">Turnaround (Hrs)</th>
                  <th class="text-center">SLA Compliance</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${tickets.map(t => `
                  <tr>
                    <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${t.ticketId || t.id}</td>
                    <td style="font-size: 12px;">${t.loggedDate}</td>
                    <td style="font-weight: 600;">${t.client}</td>
                    <td>${t.issue}</td>
                    <td class="text-center">
                      <span class="status-pill ${t.severity === 'Critical' ? 'status-reorder' : (t.severity === 'High' ? 'status-pending' : 'status-progress')}" style="font-size: 11px;">
                        ${t.severity}
                      </span>
                    </td>
                    <td style="font-weight: 500;">${t.assignedTech}</td>
                    <td style="font-size: 12px;">${t.visitDate || '-'}</td>
                    <td style="font-size: 12px; color: var(--text-dim);">${t.resolution}</td>
                    <td class="text-right" style="font-family: monospace; font-weight: 700;">${t.turnaroundHrs} hrs</td>
                    <td class="text-center"><span class="status-pill status-instock">${t.slaStatus}</span></td>
                    <td class="text-center" style="white-space: nowrap;">
                      ${t.status !== 'Resolved' ? `
                        <button class="btn btn-secondary btn-sm resolve-ticket-btn" data-tkt-id="${t.ticketId || t.id}" style="padding: 3px 6px; font-size: 11px; color: #34d399;" title="Quick Resolve">Resolve</button>
                      ` : `
                        <span style="font-size: 11px; color: #34d399; font-weight: 600; margin-right: 2px;">Closed</span>
                      `}
                      <button class="btn btn-secondary btn-sm edit-ticket-btn" data-tkt-id="${t.ticketId || t.id}" style="padding: 3px 6px; font-size: 11px;" title="Edit Ticket">
                        Edit
                      </button>
                      <button class="btn btn-secondary btn-sm delete-ticket-btn" data-tkt-id="${t.ticketId || t.id}" style="padding: 3px 6px; font-size: 11px; color: var(--red-accent);" title="Delete Ticket">
                        &times;
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const headerContainer = document.getElementById('amcPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'amc', {
      dateBasisOptions: [
        { key: 'endDate', label: 'Contract Expiry / Renewal Date' },
        { key: 'startDate', label: 'Contract Start Date' }
      ],
      currentDateBasis: amcDateBasis,
      onDateBasisChange: (newBasis) => {
        amcDateBasis = newBasis;
        updateView();
      },
      onPeriodChange: () => {
        updateView();
      }
    });

    document.getElementById('clearAmcDateFilterBtn')?.addEventListener('click', () => {
      periodStore.setPagePeriod('amc', { preset: 'all_time' });
      updateView();
    });

    // Renew handlers
    container.querySelectorAll('.renew-amc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-amc-id');
        if (confirm(`Extend AMC contract ${id} for 1 additional year?`)) {
          store.renewAmcContract(id, 1);
          updateView();
        }
      });
    });

    // Edit AMC handlers
    container.querySelectorAll('.edit-amc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-amc-id');
        const contract = store.state.amc.find(a => a.id === id);
        if (contract) openAmcModal(contract, () => updateView());
      });
    });

    // Delete AMC handlers
    container.querySelectorAll('.delete-amc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-amc-id');
        const contract = store.state.amc.find(a => a.id === id);
        if (contract && confirm(`Are you sure you want to delete AMC contract ${id} for ${contract.client}?`)) {
          store.deleteAmcContract(id);
          updateView();
        }
      });
    });

    // Top action buttons
    document.getElementById('newAmcContractBtn')?.addEventListener('click', () => {
      openAmcModal(null, () => updateView());
    });

    document.getElementById('newSlaTicketBtn')?.addEventListener('click', () => {
      openTicketModal(null, () => updateView());
    });

    // Edit SLA Ticket handlers
    container.querySelectorAll('.edit-ticket-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tkt-id');
        const ticket = store.state.tickets.find(t => t.id === id || t.ticketId === id);
        if (ticket) openTicketModal(ticket, () => updateView());
      });
    });

    // Delete SLA Ticket handlers
    container.querySelectorAll('.delete-ticket-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tkt-id');
        const ticket = store.state.tickets.find(t => t.id === id || t.ticketId === id);
        if (ticket && confirm(`Are you sure you want to delete SLA ticket ${id}?`)) {
          store.deleteTicket(id);
          updateView();
        }
      });
    });

    // Resolve ticket handler
    container.querySelectorAll('.resolve-ticket-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tkt-id');
        const res = prompt('Enter resolution summary & field action taken:');
        if (res) {
          const hrs = prompt('Turnaround hours:', '3.0');
          store.resolveTicket(id, res, Number(hrs) || 3.0);
          updateView();
        }
      });
    });
  }

  updateView();
}

function openAmcModal(contractToEdit = null, onSaved) {
  const isEdit = !!contractToEdit;
  const today = new Date().toISOString().split('T')[0];

  const defaultEnd = () => {
    const s = new Date();
    s.setFullYear(s.getFullYear() + 1);
    return s.toISOString().split('T')[0];
  };

  const modalHtml = `
    <div id="amcModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit AMC Contract ' + contractToEdit.id : 'Register New Annual Maintenance Contract'}</h3>
          <button id="closeAmcModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="amcModalForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Client Organization</label>
              <input type="text" id="amcClient" class="form-control" value="${isEdit ? contractToEdit.client : ''}" placeholder="e.g. Haryana State Mandi Board" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Contact Phone</label>
                <input type="text" id="amcPhone" class="form-control" value="${isEdit ? contractToEdit.phone : '+91 '}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Cameras Covered</label>
                <input type="number" id="amcCams" class="form-control" value="${isEdit ? contractToEdit.cams : 10}" min="1" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Contract Type</label>
                <select id="amcType" class="form-control">
                  <option value="Comprehensive" ${isEdit && contractToEdit.type === 'Comprehensive' ? 'selected' : ''}>Comprehensive (Parts & Labour)</option>
                  <option value="Non-Comprehensive" ${isEdit && contractToEdit.type === 'Non-Comprehensive' ? 'selected' : ''}>Non-Comprehensive (Labour Only)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Annual Fee (₹)</label>
                <input type="number" id="amcFee" class="form-control" value="${isEdit ? contractToEdit.annualFee : 25000}" step="500" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" id="amcStart" class="form-control" value="${isEdit ? contractToEdit.startDate : today}" required>
              </div>
              <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="date" id="amcEnd" class="form-control" value="${isEdit ? contractToEdit.endDate : defaultEnd()}" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Contract Status</label>
                <select id="amcStatus" class="form-control">
                  <option value="Active" ${isEdit && contractToEdit.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Under Renewal" ${isEdit && contractToEdit.status === 'Under Renewal' ? 'selected' : ''}>Under Renewal</option>
                  <option value="Expired" ${isEdit && contractToEdit.status === 'Expired' ? 'selected' : ''}>Expired</option>
                  <option value="Terminated" ${isEdit && contractToEdit.status === 'Terminated' ? 'selected' : ''}>Terminated</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Next Scheduled Service</label>
                <input type="date" id="amcNextService" class="form-control" value="${isEdit ? contractToEdit.nextService : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" id="deleteAmcInModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                Delete Contract
              </button>
            ` : ''}
            <button type="button" id="cancelAmcBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Contract'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('amcModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeAmcModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelAmcBtn')?.addEventListener('click', close);

  if (isEdit) {
    document.getElementById('deleteAmcInModalBtn')?.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete contract ${contractToEdit.id} for ${contractToEdit.client}?`)) {
        store.deleteAmcContract(contractToEdit.id);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  document.getElementById('amcModalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      client: document.getElementById('amcClient').value.trim(),
      phone: document.getElementById('amcPhone').value.trim(),
      cams: Number(document.getElementById('amcCams').value) || 1,
      type: document.getElementById('amcType').value,
      annualFee: Number(document.getElementById('amcFee').value) || 0,
      startDate: document.getElementById('amcStart').value,
      endDate: document.getElementById('amcEnd').value,
      status: document.getElementById('amcStatus').value,
      nextService: document.getElementById('amcNextService').value
    };

    if (isEdit) {
      store.updateAmcContract(contractToEdit.id, data);
    } else {
      data.lastService = data.startDate;
      store.addAmcContract(data);
    }

    close();
    if (onSaved) onSaved();
  });
}

function openTicketModal(ticketToEdit = null, onSaved) {
  const isEdit = !!ticketToEdit;
  const today = new Date().toISOString().split('T')[0];

  const modalHtml = `
    <div id="ticketModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit SLA Ticket ' + (ticketToEdit.ticketId || ticketToEdit.id) : 'Log SLA Breakdown Complaint Ticket'}</h3>
          <button id="closeTktModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="ticketModalForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Client Organization</label>
              <input type="text" id="tktClient" class="form-control" value="${isEdit ? ticketToEdit.client : ''}" placeholder="e.g. XEN City Division West, UHBVN" required>
            </div>
            <div class="form-group">
              <label class="form-label">Reported Breakdown Issue</label>
              <input type="text" id="tktIssue" class="form-control" value="${isEdit ? ticketToEdit.issue : ''}" placeholder="e.g. Substation yard camera feed distorted or offline" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Severity Level</label>
                <select id="tktSeverity" class="form-control">
                  <option value="Critical" ${isEdit && ticketToEdit.severity === 'Critical' ? 'selected' : ''}>Critical (4h Response SLA)</option>
                  <option value="High" ${isEdit && ticketToEdit.severity === 'High' ? 'selected' : ''}>High (12h Response SLA)</option>
                  <option value="Medium" ${isEdit && ticketToEdit.severity === 'Medium' ? 'selected' : ''}>Medium (24h Response SLA)</option>
                  <option value="Low" ${isEdit && ticketToEdit.severity === 'Low' ? 'selected' : ''}>Low (48h Response SLA)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Assign Technician</label>
                <select id="tktTech" class="form-control">
                  <option value="Amit Sharma" ${isEdit && ticketToEdit.assignedTech === 'Amit Sharma' ? 'selected' : ''}>Amit Sharma</option>
                  <option value="Sunil Verma" ${isEdit && ticketToEdit.assignedTech === 'Sunil Verma' ? 'selected' : ''}>Sunil Verma</option>
                  <option value="Deepak Saini" ${isEdit && ticketToEdit.assignedTech === 'Deepak Saini' ? 'selected' : ''}>Deepak Saini</option>
                  <option value="Manoj Kumar" ${isEdit && ticketToEdit.assignedTech === 'Manoj Kumar' ? 'selected' : ''}>Manoj Kumar</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Ticket Status</label>
                <select id="tktStatus" class="form-control">
                  <option value="Open" ${isEdit && ticketToEdit.status === 'Open' ? 'selected' : ''}>Open</option>
                  <option value="In Progress" ${isEdit && ticketToEdit.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Resolved" ${isEdit && ticketToEdit.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                  <option value="Closed" ${isEdit && ticketToEdit.status === 'Closed' ? 'selected' : ''}>Closed</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">SLA Compliance</label>
                <select id="tktSlaStatus" class="form-control">
                  <option value="Within SLA" ${isEdit && ticketToEdit.slaStatus === 'Within SLA' ? 'selected' : ''}>Within SLA</option>
                  <option value="SLA Violated" ${isEdit && ticketToEdit.slaStatus === 'SLA Violated' ? 'selected' : ''}>SLA Violated</option>
                  <option value="Escalated" ${isEdit && ticketToEdit.slaStatus === 'Escalated' ? 'selected' : ''}>Escalated</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Visit Date</label>
                <input type="date" id="tktVisitDate" class="form-control" value="${isEdit ? (ticketToEdit.visitDate || today) : today}">
              </div>
              <div class="form-group">
                <label class="form-label">Turnaround Hours</label>
                <input type="number" id="tktTurnaround" class="form-control" value="${isEdit ? (ticketToEdit.turnaroundHrs || 0) : 0}" step="0.5" min="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Field Action & Resolution Note</label>
              <textarea id="tktResolution" class="form-control" rows="2" placeholder="e.g. Re-terminated RJ45 connector on pole #4; video stream restored">${isEdit ? (ticketToEdit.resolution || '') : ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" id="deleteTktInModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                Delete Ticket
              </button>
            ` : ''}
            <button type="button" id="cancelTktBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Dispatch SLA Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('ticketModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeTktModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelTktBtn')?.addEventListener('click', close);

  if (isEdit) {
    document.getElementById('deleteTktInModalBtn')?.addEventListener('click', () => {
      const tId = ticketToEdit.ticketId || ticketToEdit.id;
      if (confirm(`Are you sure you want to delete ticket ${tId}?`)) {
        store.deleteTicket(tId);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  document.getElementById('ticketModalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      client: document.getElementById('tktClient').value.trim(),
      issue: document.getElementById('tktIssue').value.trim(),
      severity: document.getElementById('tktSeverity').value,
      assignedTech: document.getElementById('tktTech').value,
      status: document.getElementById('tktStatus').value,
      slaStatus: document.getElementById('tktSlaStatus').value,
      visitDate: document.getElementById('tktVisitDate').value,
      turnaroundHrs: Number(document.getElementById('tktTurnaround').value) || 0,
      resolution: document.getElementById('tktResolution').value.trim() || 'Inspection in progress'
    };

    if (isEdit) {
      store.updateTicket(ticketToEdit.ticketId || ticketToEdit.id, data);
    } else {
      store.addTicket(data);
    }

    close();
    if (onSaved) onSaved();
  });
}
