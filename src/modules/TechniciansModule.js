// Technician Installation Logs & Labour Payout Ledger Module
import { store } from '../services/store.js';

export function renderTechniciansModule(container) {
  function updateView() {
    const techLogs = store.state.techLogs;

    const totalCams = techLogs.reduce((s, t) => s + (Number(t.cams) || 0), 0);
    const totalPoints = techLogs.reduce((s, t) => s + (Number(t.points) || 0), 0);
    const totalGross = techLogs.reduce((s, t) => s + ((Number(t.points) || 0) * (Number(t.rate) || 600)), 0);
    const totalAdvance = techLogs.reduce((s, t) => s + (Number(t.advance) || 0), 0);
    const totalBalance = totalGross - totalAdvance;

    container.innerHTML = `
      <div class="technicians-module-view">
        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(139, 92, 246, 0.25); color: #c084fc; margin-bottom: 6px;">
                ● FIELD LABOUR & COMMISSIONING LEDGER
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                TECHNICIAN INSTALLATION SITE LOGS & LABOUR PAYOUT LEDGER
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Panipat & Sonipat Site logs, point terminations (@ ₹600/pt standard), advance disbursements & balance dues.
              </p>
            </div>
            <button id="addSiteLogBtn" class="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Record Installation Log
            </button>
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card">
            <span class="kpi-label">Points Terminated</span>
            <div class="kpi-value" style="color: #38bdf8;">${totalPoints} Points</div>
            <div class="kpi-subtitle">Across ${totalCams} Mounted Cameras</div>
          </div>
          <div class="kpi-card teal">
            <span class="kpi-label">Gross Labour Payout</span>
            <div class="kpi-value" style="color: #2dd4bf;">₹${totalGross.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Standard Rate: ₹600 / Point</div>
          </div>
          <div class="kpi-card green">
            <span class="kpi-label">Advance Paid</span>
            <div class="kpi-value" style="color: #34d399;">₹${totalAdvance.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Disbursed on Site</div>
          </div>
          <div class="kpi-card amber">
            <span class="kpi-label">Balance Payable</span>
            <div class="kpi-value" style="color: #fbbf24;">₹${totalBalance.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Outstanding Labour Dues</div>
          </div>
        </div>

        <!-- Site Logs Table -->
        <div class="table-card">
          <div class="table-header-bar">
            <div class="table-title-group">
              <h3>Panipat & Sonipat Installation Sites Register</h3>
              <p>Certified field installation logs across government & industrial complexes</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Job Date</th>
                  <th>Technician Name</th>
                  <th>Client Site Name (Panipat / Sonipat)</th>
                  <th class="text-center">Cams</th>
                  <th class="text-center">Points</th>
                  <th class="text-right">Rate / Pt (₹)</th>
                  <th class="text-right">Gross Payout (₹)</th>
                  <th class="text-right">Advance Paid (₹)</th>
                  <th class="text-right">Balance Due (₹)</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                ${techLogs.map(l => {
                  const gross = (Number(l.points) || 0) * (Number(l.rate) || 600);
                  const bal = gross - (Number(l.advance) || 0);
                  return `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${l.id}</td>
                      <td style="font-size: 12px;">${l.date}</td>
                      <td style="font-weight: 600;">${l.techName}</td>
                      <td>${l.site}</td>
                      <td class="text-center" style="font-weight: 700;">${l.cams}</td>
                      <td class="text-center" style="font-weight: 700; color: #38bdf8;">${l.points}</td>
                      <td class="text-right">₹${Number(l.rate).toLocaleString('en-IN')}</td>
                      <td class="text-right" style="font-weight: 700;">₹${gross.toLocaleString('en-IN')}</td>
                      <td class="text-right" style="color: #34d399;">₹${Number(l.advance).toLocaleString('en-IN')}</td>
                      <td class="text-right" style="font-weight: 700; color: ${bal > 0 ? '#fbbf24' : '#34d399'};">
                        ₹${bal.toLocaleString('en-IN')}
                      </td>
                      <td class="text-center"><span class="status-pill status-completed">${l.status}</span></td>
                      <td class="text-center" style="white-space: nowrap;">
                        <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                          ${bal > 0 ? `
                            <button class="btn btn-secondary btn-sm pay-tech-advance-btn" data-log-id="${l.id}" title="Disburse Advance / Settle Balance" style="padding: 2px 7px; font-size: 11px; color: #34d399;">
                              Advance
                            </button>
                          ` : `
                            <span style="font-size: 11px; color: #34d399; font-weight: 600;">Settled</span>
                          `}
                          <button class="btn btn-secondary btn-sm edit-site-log-btn" data-log-id="${l.id}" title="Edit Site Log" style="padding: 2px 7px; font-size: 11px;">
                            Edit
                          </button>
                          <button class="btn btn-secondary btn-sm delete-site-log-btn" data-log-id="${l.id}" title="Delete Site Log" style="padding: 2px 7px; font-size: 11px; color: var(--red-accent);">
                            &times;
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="text-right" style="font-weight: 700;">INSTALLATION TOTALS & LABOUR PAYOUTS:</td>
                  <td class="text-center" style="font-weight: 800; color: #38bdf8;">${totalCams}</td>
                  <td class="text-center" style="font-weight: 800; color: #38bdf8;">${totalPoints}</td>
                  <td></td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #2dd4bf;">₹${totalGross.toLocaleString('en-IN')}</td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #34d399;">₹${totalAdvance.toLocaleString('en-IN')}</td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #fbbf24;">₹${totalBalance.toLocaleString('en-IN')}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    // Add site log
    document.getElementById('addSiteLogBtn')?.addEventListener('click', () => {
      openSiteLogModal(null, () => updateView());
    });

    // Edit site log
    container.querySelectorAll('.edit-site-log-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-log-id');
        const log = techLogs.find(t => t.id === id);
        if (log) openSiteLogModal(log, () => updateView());
      });
    });

    // Delete site log
    container.querySelectorAll('.delete-site-log-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-log-id');
        if (confirm(`Are you sure you want to delete technician log ${id}?`)) {
          store.deleteTechLog(id);
          updateView();
        }
      });
    });

    // Pay advance
    container.querySelectorAll('.pay-tech-advance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-log-id');
        const log = techLogs.find(t => t.id === id);
        if (log) {
          const gross = (Number(log.points) || 0) * (Number(log.rate) || 600);
          const bal = gross - (Number(log.advance) || 0);
          const amtStr = prompt(`Enter advance / settlement amount for ${log.techName} (Balance due: ₹${bal}):`, bal);
          if (amtStr !== null) {
            const amt = parseFloat(amtStr);
            if (!isNaN(amt) && amt > 0) {
              store.recordTechAdvance(id, amt);
              updateView();
            }
          }
        }
      });
    });
  }

  updateView();
}

function openSiteLogModal(logToEdit, onSaved) {
  const isEdit = !!logToEdit;

  const modalHtml = `
    <div id="siteLogModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Installation Log ' + logToEdit.id : 'Record Technician Installation Site Log'}</h3>
          <button id="closeSiteLogModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="siteLogForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Client Site Name (Panipat / Sonipat)</label>
              <input type="text" id="logSite" class="form-control" value="${isEdit ? logToEdit.site : ''}" placeholder="e.g. Model Town Textile Processing Unit" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Technician Name</label>
                <select id="logTechName" class="form-control">
                  <option value="Amit Sharma" ${isEdit && logToEdit.techName === 'Amit Sharma' ? 'selected' : ''}>Amit Sharma</option>
                  <option value="Sunil Verma" ${isEdit && logToEdit.techName === 'Sunil Verma' ? 'selected' : ''}>Sunil Verma</option>
                  <option value="Deepak Saini" ${isEdit && logToEdit.techName === 'Deepak Saini' ? 'selected' : ''}>Deepak Saini</option>
                  <option value="Manoj Kumar" ${isEdit && logToEdit.techName === 'Manoj Kumar' ? 'selected' : ''}>Manoj Kumar</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Job Date</label>
                <input type="date" id="logDate" class="form-control" value="${isEdit ? logToEdit.date : new Date().toISOString().split('T')[0]}" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Cams Mounted</label>
                <input type="number" id="logCams" class="form-control" value="${isEdit ? logToEdit.cams : 8}" min="1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Points Terminated</label>
                <input type="number" id="logPoints" class="form-control" value="${isEdit ? logToEdit.points : 8}" min="1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Rate / Point (₹)</label>
                <input type="number" id="logRate" class="form-control" value="${isEdit ? logToEdit.rate : 600}" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Advance Paid on Site (₹)</label>
                <input type="number" id="logAdvance" class="form-control" value="${isEdit ? logToEdit.advance : 2000}" step="500">
              </div>
              <div class="form-group">
                <label class="form-label">Installation Status</label>
                <select id="logStatus" class="form-control">
                  <option value="Completed & Certified" ${isEdit && logToEdit.status === 'Completed & Certified' ? 'selected' : ''}>Completed & Certified</option>
                  <option value="In Progress" ${isEdit && logToEdit.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Testing & Alignment" ${isEdit && logToEdit.status === 'Testing & Alignment' ? 'selected' : ''}>Testing & Alignment</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" id="deleteLogModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                Delete Log
              </button>
            ` : ''}
            <button type="button" id="cancelSiteLogBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Save Site Log'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('siteLogModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeSiteLogModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelSiteLogBtn')?.addEventListener('click', close);

  if (isEdit) {
    document.getElementById('deleteLogModalBtn')?.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete installation log ${logToEdit.id}?`)) {
        store.deleteTechLog(logToEdit.id);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  document.getElementById('siteLogForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      site: document.getElementById('logSite').value.trim(),
      techName: document.getElementById('logTechName').value,
      date: document.getElementById('logDate').value,
      cams: Number(document.getElementById('logCams').value) || 1,
      points: Number(document.getElementById('logPoints').value) || 1,
      rate: Number(document.getElementById('logRate').value) || 600,
      advance: Number(document.getElementById('logAdvance').value) || 0,
      status: document.getElementById('logStatus').value
    };

    if (isEdit) {
      store.updateTechLog(logToEdit.id, data);
    } else {
      store.addTechLog(data);
    }

    close();
    if (onSaved) onSaved();
  });
}
