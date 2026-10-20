// Project Costing & Real-Time P&L Module
import { store } from '../services/store.js';
import { db } from '../store/db.js';
import { openJobDrawer } from './jobs/JobSheetsModule.js';
import { periodStore } from '../store/periodStore.js';
import { inRange } from '../services/periodService.js';
import { renderPagePeriodHeader } from '../components/PeriodPicker/PeriodPicker.js';

export function renderProjectsModule(container) {
  let projectDateBasis = 'startDate';

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.erp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'erp-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#34d399' : '#38bdf8'}" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function updateView() {
    db._reconcileProjectLabour();
    const allProjects = store.state.projects || [];
    const period = periodStore.getPagePeriod('projects');

    const projects = allProjects.filter(p => {
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const rawDate = p[projectDateBasis] || p.startDate || p.createdAt;
        if (!rawDate) return false;
        const dateStr = String(rawDate).slice(0, 10);
        if (!inRange(dateStr, period)) return false;
      }
      return true;
    });

    const totalQuoted = projects.reduce((s, p) => s + (Number(p.quoted) || 0), 0);
    const totalHw = projects.reduce((s, p) => s + (Number(p.hardwareCost) || 0), 0);
    const totalLab = projects.reduce((s, p) => s + (Number(p.labourCost) || 0), 0);
    const totalCons = projects.reduce((s, p) => s + (Number(p.consumablesCost) || 0), 0);
    const totalCost = totalHw + totalLab + totalCons;
    const totalProfit = totalQuoted - totalCost;
    const overallMargin = totalQuoted > 0 ? (totalProfit / totalQuoted) * 100 : 0;

    container.innerHTML = `
      <div class="projects-module-view">
        <!-- Top Page Period Header -->
        <div id="projectsPagePeriodContainer"></div>

        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(16, 185, 129, 0.25); color: #34d399; margin-bottom: 6px;">
                ● JOB COSTING & PROFITABILITY LEDGER • FULL CRUD
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                COMMERCIAL PROJECT COSTING, LABOUR PAYOUTS & REAL-TIME P&L
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Direct project accounting across materials, labour terminations, consumables & net margins.
              </p>
            </div>
            <button id="addNewProjectBtn" class="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Create New Project
            </button>
          </div>
        </div>

        <!-- Profitability KPI Cards Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card teal">
            <span class="kpi-label">Total Booked Revenue</span>
            <div class="kpi-value" style="color: #2dd4bf;">₹${Math.round(totalQuoted).toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">${projects.length} Regional Projects</div>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Total Hardware Cost</span>
            <div class="kpi-value" style="color: #94a3b8;">₹${Math.round(totalHw).toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Cams, Recorders & Storage</div>
          </div>
          <div class="kpi-card amber">
            <span class="kpi-label">Labour & Consumables</span>
            <div class="kpi-value" style="color: #fbbf24;">₹${Math.round(totalLab + totalCons).toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Labour: ₹${Math.round(totalLab).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card green">
            <span class="kpi-label">Gross Operating Profit</span>
            <div class="kpi-value" style="color: #34d399;">₹${Math.round(totalProfit).toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Net Realized Margin</div>
          </div>
          <div class="kpi-card ${overallMargin >= 30 ? 'green' : 'amber'}">
            <span class="kpi-label">Portfolio Gross Margin %</span>
            <div class="kpi-value" style="color: ${overallMargin >= 30 ? '#34d399' : '#fbbf24'};">${overallMargin.toFixed(1)}%</div>
            <div class="kpi-subtitle">Target: &gt; 30.0%</div>
          </div>
        </div>

        <!-- Main Ledger Table -->
        <div class="table-card">
          <div class="table-header-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div class="table-title-group">
              <h3>Regional Installation Sites Ledger (Dossier Verified)</h3>
              <p>Panipat, Sonipat & Karnal Government and Commercial accounts</p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted);">
                Showing <strong>${projects.length}</strong> of ${allProjects.length} projects in period
              </span>
              ${(projects.length < allProjects.length && period?.preset !== 'all_time') ? `
                <button id="clearPrjDateFilterBtn" class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 10.5px;">Clear / All Time</button>
              ` : ''}
            </div>
          </div>

          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Client Organization</th>
                  <th>Industry Sector</th>
                  <th>Scope</th>
                  <th class="text-center">Cams</th>
                  <th class="text-right">Quoted Value (₹)</th>
                  <th class="text-right">Hardware (₹)</th>
                  <th class="text-right">Labour (₹)</th>
                  <th class="text-right">Consumables (₹)</th>
                  <th class="text-right">Total Cost (₹)</th>
                  <th class="text-right">Gross Profit (₹)</th>
                  <th class="text-right">Margin %</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                ${projects.map(p => {
                  const jobCost = (Number(p.hardwareCost) || 0) + (Number(p.labourCost) || 0) + (Number(p.consumablesCost) || 0);
                  const profit = (Number(p.quoted) || 0) - jobCost;
                  const margin = p.quoted > 0 ? (profit / p.quoted) * 100 : 0;
                  return `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${p.id}</td>
                      <td style="font-weight: 600;">${p.client}</td>
                      <td style="font-size: 12px; color: var(--text-dim);">${p.sector}</td>
                      <td>${p.scope}</td>
                      <td class="text-center" style="font-weight: 700;">${p.cams}</td>
                      <td class="text-right" style="font-weight: 700; color: #38bdf8;">₹${Number(p.quoted).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right" style="color: var(--text-muted);">₹${Number(p.hardwareCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right" style="color: var(--text-muted);">₹${Number(p.labourCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right" style="color: var(--text-muted);">₹${Number(p.consumablesCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right" style="font-weight: 600;">₹${jobCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right" style="font-weight: 700; color: #34d399;">₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right" style="font-weight: 800; color: ${margin >= 30 ? '#34d399' : '#fbbf24'};">${margin.toFixed(1)}%</td>
                      <td class="text-center"><span class="status-pill status-completed">${p.status}</span></td>
                      <td class="text-center">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                          <button class="btn btn-secondary btn-sm create-job-for-prj-btn" data-project-id="${p.id}" data-client="${p.client}" style="padding: 3px 8px; font-size: 11.5px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" title="Create Field Job Sheet">+ Job</button>
                          <button class="btn btn-secondary btn-sm edit-project-btn" data-project-id="${p.id}" style="padding: 3px 8px; font-size: 11.5px;">Edit</button>
                          <button class="btn btn-secondary btn-sm delete-project-row-btn" data-project-id="${p.id}" style="padding: 3px 8px; font-size: 11.5px; color: var(--red-accent);" title="Delete Job">&times;</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" class="text-right" style="font-weight: 700;">PORTFOLIO AGGREGATE TOTALS:</td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #38bdf8;">₹${totalQuoted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">₹${totalHw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">₹${totalLab.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">₹${totalCons.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right" style="font-weight: 800;">₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #34d399;">₹${totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #34d399;">${overallMargin.toFixed(1)}%</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    const headerContainer = document.getElementById('projectsPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'projects', {
      dateBasisOptions: [
        { key: 'startDate', label: 'Order / Booking Date' },
        { key: 'endDate', label: 'Handover Date' }
      ],
      currentDateBasis: projectDateBasis,
      onDateBasisChange: (newBasis) => {
        projectDateBasis = newBasis;
        updateView();
      },
      onPeriodChange: () => {
        updateView();
      }
    });

    document.getElementById('clearPrjDateFilterBtn')?.addEventListener('click', () => {
      periodStore.setPagePeriod('projects', { preset: 'all_time' });
      updateView();
    });

    document.getElementById('addNewProjectBtn')?.addEventListener('click', () => {
      openProjectModal(null, () => updateView());
    });

    container.querySelectorAll('.create-job-for-prj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-project-id');
        const prj = store.state.projects.find(p => p.id === id);
        if (prj) {
          openJobDrawer({
            isPrefill: true,
            projectId: prj.id,
            clientName: prj.client,
            title: `${prj.scope} - ${prj.client}`,
            camsCount: prj.cams || 4,
            pointsCount: prj.cams || 4
          }, () => updateView());
        }
      });
    });

    container.querySelectorAll('.edit-project-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-project-id');
        const project = store.state.projects.find(p => p.id === id);
        if (project) openProjectModal(project, () => updateView());
      });
    });

    container.querySelectorAll('.delete-project-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-project-id');
        if (confirm(`Are you sure you want to delete project ${id}?`)) {
          store.deleteProject(id);
          showToast(`Deleted project ${id}`, 'info');
          updateView();
        }
      });
    });
  }

  updateView();
}

function openProjectModal(projectToEdit, onSaved) {
  const isEdit = !!projectToEdit;

  const modalHtml = `
    <div id="projectModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Project Costing ' + projectToEdit.id : 'Create New Commercial Project Costing'}</h3>
          <button id="closePrjModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="projectModalForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Client Organization</label>
              <input type="text" id="prjClient" class="form-control" value="${isEdit ? projectToEdit.client : ''}" placeholder="e.g. Haryana Warehousing Corp" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Industry Sector</label>
                <input type="text" id="prjSector" class="form-control" value="${isEdit ? projectToEdit.sector : 'Government / Institutional'}" required>
              </div>
              <div class="form-group">
                <label class="form-label">System Scope</label>
                <input type="text" id="prjScope" class="form-control" value="${isEdit ? projectToEdit.scope : '16-Camera Setup'}" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Camera Count</label>
                <input type="number" id="prjCams" class="form-control" value="${isEdit ? projectToEdit.cams : 10}" min="1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Client Quoted Billed (₹)</label>
                <input type="number" id="prjQuoted" class="form-control" value="${isEdit ? projectToEdit.quoted : 130000}" step="0.01" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Hardware Cost (₹)</label>
                <input type="number" id="prjHw" class="form-control" value="${isEdit ? projectToEdit.hardwareCost : 80000}" step="0.01" required>
              </div>
              <div class="form-group">
                <label class="form-label" style="display: flex; justify-content: space-between;">
                  <span>Labour Payout (₹)</span>
                  <span style="font-size: 10px; color: #fbbf24;">(Auto-Reconciled)</span>
                </label>
                <input type="number" id="prjLab" class="form-control" value="${isEdit ? (projectToEdit.labourCost || 0) : 0}" step="0.01" readonly style="background: var(--bg-card-subtle); color: #fbbf24; cursor: not-allowed;" title="Auto-computed from verified Field Operations Job payouts">
              </div>
              <div class="form-group">
                <label class="form-label">Consumables (₹)</label>
                <input type="number" id="prjCons" class="form-control" value="${isEdit ? projectToEdit.consumablesCost : 3000}" step="0.01" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Project Status</label>
                <select id="prjStatus" class="form-control">
                  <option value="Completed & Certified" ${isEdit && projectToEdit.status === 'Completed & Certified' ? 'selected' : ''}>Completed & Certified</option>
                  <option value="In Progress" ${isEdit && projectToEdit.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Testing & Sign-off" ${isEdit && projectToEdit.status === 'Testing & Sign-off' ? 'selected' : ''}>Testing & Sign-off</option>
                  <option value="Commissioned" ${isEdit && projectToEdit.status === 'Commissioned' ? 'selected' : ''}>Commissioned</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Handover Date</label>
                <input type="date" id="prjDate" class="form-control" value="${isEdit ? projectToEdit.handoverDate : new Date().toISOString().split('T')[0]}" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" id="deletePrjBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                Delete Project
              </button>
            ` : ''}
            <button type="button" id="cancelPrjBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('projectModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closePrjModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelPrjBtn')?.addEventListener('click', close);

  if (isEdit) {
    document.getElementById('deletePrjBtn')?.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete project ${projectToEdit.id}?`)) {
        store.deleteProject(projectToEdit.id);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  document.getElementById('projectModalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      client: document.getElementById('prjClient').value,
      sector: document.getElementById('prjSector').value,
      scope: document.getElementById('prjScope').value,
      cams: Number(document.getElementById('prjCams').value) || 1,
      quoted: Number(document.getElementById('prjQuoted').value) || 0,
      hardwareCost: Number(document.getElementById('prjHw').value) || 0,
      labourCost: Number(document.getElementById('prjLab').value) || 0,
      consumablesCost: Number(document.getElementById('prjCons').value) || 0,
      status: document.getElementById('prjStatus').value,
      handoverDate: document.getElementById('prjDate').value
    };

    if (isEdit) {
      store.updateProject(projectToEdit.id, data);
    } else {
      store.addProject(data);
    }

    close();
    if (onSaved) onSaved();
  });
}
