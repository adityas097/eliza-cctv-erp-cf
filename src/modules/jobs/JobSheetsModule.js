// Job Sheets Module - List, Search, Filter & Comprehensive Create/Edit Drawer
import { db, formatCurrency, formatDate, formatDateTime } from '../../store/db.js';
import { jobService } from '../../services/jobService.js';
import { auth } from '../../services/auth.js';
import { periodStore } from '../../store/periodStore.js';
import { inRange } from '../../services/periodService.js';
import { renderPagePeriodHeader } from '../../components/PeriodPicker/PeriodPicker.js';
import { exportToCsv } from '../../services/exportService.js';

export function renderJobSheetsModule(container, initialJobId = null) {
  let jobs = [];
  let employees = [];
  let inventory = [];
  let parties = [];
  let projects = [];

  let jobDateBasis = 'scheduledStart';
  let searchQuery = '';
  let statusFilter = 'All';
  let assigneeFilter = 'All';
  let priorityFilter = 'All';
  let typeFilter = 'All';
  let overdueOnly = false;
  let sortField = 'id';
  let sortAsc = false;
  let selectedJobIds = new Set();

  async function loadData() {
    jobs = await db.collection('jobs').list();
    employees = await db.collection('employees').list();
    inventory = await db.collection('inventory').list();
    parties = await db.collection('parties').list();
    projects = await db.collection('projects').list();
    renderView();

    if (initialJobId) {
      const target = jobs.find(j => j.id === initialJobId);
      if (target) openJobDrawer(target, () => loadData());
    }
  }

  function getFilteredJobs() {
    const now = new Date();
    const period = periodStore.getPagePeriod('jobs');

    return jobs.filter(j => {
      // 1. Period filter
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const rawDate = j[jobDateBasis] || j.scheduledStart || j.createdAt;
        if (!rawDate) return false;
        const dateStr = String(rawDate).slice(0, 10);
        if (!inRange(dateStr, period)) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = j.id.toLowerCase().includes(q) ||
          j.title.toLowerCase().includes(q) ||
          (j.clientName || '').toLowerCase().includes(q) ||
          (j.siteAddress || '').toLowerCase().includes(q) ||
          (j.type || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== 'All' && j.status !== statusFilter) return false;
      if (assigneeFilter !== 'All') {
        const has = (j.assignees || []).some(a => a.employeeId === assigneeFilter);
        if (!has) return false;
      }
      if (priorityFilter !== 'All' && j.priority !== priorityFilter) return false;
      if (typeFilter !== 'All' && j.type !== typeFilter) return false;
      if (overdueOnly) {
        if (j.status === 'Completed' || j.status === 'Verified' || j.status === 'Cancelled') return false;
        if (!j.scheduledEnd || new Date(j.scheduledEnd) >= now) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'scheduledStart' || sortField === 'createdAt') {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  function renderView() {
    const filtered = getFilteredJobs();
    const now = new Date();

    // Summary counts
    const activeCount = jobs.filter(j => j.status === 'In Progress' || j.status === 'Scheduled').length;
    const completedCount = jobs.filter(j => j.status === 'Completed').length;
    const verifiedCount = jobs.filter(j => j.status === 'Verified').length;
    const overdueCount = jobs.filter(j => {
      if (j.status === 'Completed' || j.status === 'Verified' || j.status === 'Cancelled') return false;
      return j.scheduledEnd && new Date(j.scheduledEnd) < now;
    }).length;

    const allSelected = filtered.length > 0 && filtered.every(j => selectedJobIds.has(j.id));
    const someSelected = filtered.some(j => selectedJobIds.has(j.id));

    container.innerHTML = `
      <div class="jobs-module-view">
        <!-- Top Page Period Header -->
        <div id="jobsPagePeriodContainer"></div>

        <!-- Top Executive Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.4); color: #93c5fd; margin-bottom: 6px;">
                ● FIELD OPERATIONS DISPATCH & QUALITY SUITE
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                FIELD JOB SHEETS & WORK ORDERS
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Dispatch technician teams, verify digital completion checklists, auto-generate payouts & log material consumptions.
              </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="exportJobsCsvBtn" class="btn btn-secondary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Export CSV
              </button>
              <button id="createJobBtn" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Create Job Sheet (<kbd class="shortcut-key" style="background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.4); color: #fff;">Alt+N</kbd>)
              </button>
            </div>
          </div>
        </div>

        <!-- Metrics Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 20px;">
          <div class="kpi-card teal">
            <span class="kpi-label">Active / Scheduled Jobs</span>
            <div class="kpi-value" style="color: #2dd4bf;">${activeCount}</div>
            <div class="kpi-subtitle">Field Teams Dispatched</div>
          </div>
          <div class="kpi-card green">
            <span class="kpi-label">Completed & Verified</span>
            <div class="kpi-value" style="color: #34d399;">${verifiedCount}</div>
            <div class="kpi-subtitle">Ledger Payouts Approved</div>
          </div>
          <div class="kpi-card amber">
            <span class="kpi-label">Awaiting Verification</span>
            <div class="kpi-value" style="color: #fbbf24;">${completedCount}</div>
            <div class="kpi-subtitle">Supervisor Sign-Off Required</div>
          </div>
          <div class="kpi-card ${overdueCount > 0 ? 'red' : ''}">
            <span class="kpi-label">Overdue Dispatch Window</span>
            <div class="kpi-value" style="color: ${overdueCount > 0 ? '#f87171' : 'var(--text-main)'};">${overdueCount}</div>
            <div class="kpi-subtitle">At-Risk Target Delivery</div>
          </div>
        </div>

        <!-- Filters & Search Bar -->
        <div class="table-card" style="padding: 16px; margin-bottom: 20px;">
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 240px; position: relative;">
              <input type="text" id="jobSearchInput" class="form-control" placeholder="Search by Job ID, Client, Address, Scope..." value="${searchQuery}">
            </div>
            <div style="width: 150px;">
              <select id="jobStatusFilter" class="form-control">
                <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>Status: All</option>
                <option value="Backlog" ${statusFilter === 'Backlog' ? 'selected' : ''}>Backlog</option>
                <option value="Scheduled" ${statusFilter === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                <option value="In Progress" ${statusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="On Hold" ${statusFilter === 'On Hold' ? 'selected' : ''}>On Hold</option>
                <option value="Completed" ${statusFilter === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Verified" ${statusFilter === 'Verified' ? 'selected' : ''}>Verified</option>
              </select>
            </div>
            <div style="width: 160px;">
              <select id="jobAssigneeFilter" class="form-control">
                <option value="All">Assignee: All</option>
                ${employees.map(e => `
                  <option value="${e.id}" ${assigneeFilter === e.id ? 'selected' : ''}>${e.name}</option>
                `).join('')}
              </select>
            </div>
            <div style="width: 140px;">
              <select id="jobPriorityFilter" class="form-control">
                <option value="All" ${priorityFilter === 'All' ? 'selected' : ''}>Priority: All</option>
                <option value="Critical" ${priorityFilter === 'Critical' ? 'selected' : ''}>Critical</option>
                <option value="High" ${priorityFilter === 'High' ? 'selected' : ''}>High</option>
                <option value="Medium" ${priorityFilter === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Low" ${priorityFilter === 'Low' ? 'selected' : ''}>Low</option>
              </select>
            </div>
            <div style="width: 150px;">
              <select id="jobTypeFilter" class="form-control">
                <option value="All" ${typeFilter === 'All' ? 'selected' : ''}>Type: All</option>
                <option value="New Install" ${typeFilter === 'New Install' ? 'selected' : ''}>New Install</option>
                <option value="Upgrade" ${typeFilter === 'Upgrade' ? 'selected' : ''}>Upgrade</option>
                <option value="AMC Visit" ${typeFilter === 'AMC Visit' ? 'selected' : ''}>AMC Visit</option>
                <option value="Complaint Repair" ${typeFilter === 'Complaint Repair' ? 'selected' : ''}>Complaint</option>
                <option value="Survey" ${typeFilter === 'Survey' ? 'selected' : ''}>Survey</option>
                <option value="Re-routing" ${typeFilter === 'Re-routing' ? 'selected' : ''}>Re-routing</option>
              </select>
            </div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="overdueCheckbox" ${overdueOnly ? 'checked' : ''}>
              <span style="color: ${overdueOnly ? '#f87171' : 'var(--text-dim)'}; font-weight: 600;">Overdue Only</span>
            </label>
            <span style="font-size: 11.5px; color: var(--text-muted); margin-left: auto; display: flex; align-items: center; gap: 6px;">
              Showing <strong>${filtered.length}</strong> of ${jobs.length} jobs in period
              ${(filtered.length < jobs.length && periodStore.getPagePeriod('jobs')?.preset !== 'all_time') ? `
                <button id="clearJobDateFilterBtn" class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 10.5px;">Clear / All Time</button>
              ` : ''}
            </span>
          </div>

          <!-- Bulk Actions Bar -->
          <div id="bulkActionsBar" style="display: ${selectedJobIds.size > 0 ? 'flex' : 'none'}; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <span style="font-size: 12.5px; font-weight: 600; color: #38bdf8;">
              ${selectedJobIds.size} Job(s) Selected
            </span>
            <div style="display: flex; gap: 8px;">
              <button id="bulkMarkVerifiedBtn" class="btn btn-primary btn-sm">
                Verify Selected (Post Labour)
              </button>
              <button id="bulkDeleteJobsBtn" class="btn btn-secondary btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
                🗑 Delete Selected
              </button>
              <button id="bulkCancelBtn" class="btn btn-secondary btn-sm">
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th style="width: 36px; text-align: center;">
                    <input type="checkbox" id="selectAllJobsCheckbox" ${allSelected ? 'checked' : ''}>
                  </th>
                  <th>Job ID</th>
                  <th>Client & Site Address</th>
                  <th>Type & Scope</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Team</th>
                  <th>Schedule / Due</th>
                  <th class="text-center">Checklist</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-dim);">
                      <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
                      <div style="font-weight: 600;">No job sheets matched the current filters.</div>
                      <div style="font-size: 11.5px; margin-top: 4px;">Try adjusting your query or create a new job sheet.</div>
                    </td>
                  </tr>
                ` : filtered.map(j => {
                  const isOverdue = (j.status !== 'Completed' && j.status !== 'Verified' && j.status !== 'Cancelled') &&
                    j.scheduledEnd && new Date(j.scheduledEnd) < now;

                  const checklistTotal = (j.checklist || []).length;
                  const checklistDone = (j.checklist || []).filter(c => c.done).length;
                  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

                  const priorityColors = {
                    Critical: '#ef4444',
                    High: '#f97316',
                    Medium: '#38bdf8',
                    Low: '#94a3b8'
                  };

                  const statusClasses = {
                    Backlog: 'status-reorder',
                    Scheduled: 'status-progress',
                    'In Progress': 'status-progress',
                    'On Hold': 'status-reorder',
                    Completed: 'status-instock',
                    Verified: 'status-instock',
                    Cancelled: 'status-reorder'
                  };

                  return `
                    <tr style="${isOverdue ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                      <td style="text-align: center;">
                        <input type="checkbox" class="job-select-checkbox" data-job-id="${j.id}" ${selectedJobIds.has(j.id) ? 'checked' : ''}>
                      </td>
                      <td>
                        <span class="open-job-drawer-link" data-job-id="${j.id}" style="font-family: monospace; font-weight: 700; color: var(--blue-accent); cursor: pointer; text-decoration: underline;">
                          ${j.id}
                        </span>
                        ${j.ticketId ? `<div style="font-size: 10px; color: #fbbf24;">Linked: ${j.ticketId}</div>` : ''}
                      </td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-main);">${j.clientName}</div>
                        <div style="font-size: 11px; color: var(--text-dim); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${j.siteAddress}
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 600;">${j.type}</div>
                        <div style="font-size: 11px; color: var(--text-dim); max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${j.title}
                        </div>
                      </td>
                      <td>
                        <span style="font-size: 11px; font-weight: 700; color: ${priorityColors[j.priority] || '#94a3b8'};">
                          ● ${j.priority}
                        </span>
                      </td>
                      <td>
                        <span class="status-pill ${statusClasses[j.status] || 'status-progress'}">
                          ${j.status}
                        </span>
                      </td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                          ${(j.assignees && j.assignees.length) ? j.assignees.map(a => {
                            const emp = employees.find(e => e.id === a.employeeId);
                            const name = emp ? emp.name.split(' ')[0] : a.employeeId;
                            return `
                              <span class="status-pill" style="font-size: 10px; background: rgba(59, 130, 246, 0.15); color: #93c5fd; padding: 1px 6px;">
                                ${name} (${a.role})
                              </span>
                            `;
                          }).join('') : '<span style="font-size: 11px; color: #f87171;">Unassigned</span>'}
                        </div>
                      </td>
                      <td>
                        <div style="font-size: 12px; font-weight: 500;">
                          ${formatDate(j.scheduledStart)}
                        </div>
                        ${isOverdue ? `
                          <span style="font-size: 10px; color: #ef4444; font-weight: 700;">OVERDUE</span>
                        ` : ''}
                      </td>
                      <td class="text-center">
                        <div style="font-size: 11px; font-weight: 600;">${checklistDone}/${checklistTotal}</div>
                        <div style="width: 50px; height: 4px; background: var(--bg-card-subtle); border-radius: 2px; margin: 3px auto; overflow: hidden;">
                          <div style="width: ${checklistPct}%; height: 100%; background: ${checklistPct === 100 ? '#34d399' : '#38bdf8'};"></div>
                        </div>
                      </td>
                      <td class="text-center" style="white-space: nowrap;">
                        <button class="btn btn-secondary btn-sm print-job-card-btn" data-job-id="${j.id}" title="Print A4 Work Order / Job Card" style="padding: 2px 6px; font-size: 11px;">
                          🖨 Card
                        </button>
                        <button class="btn btn-primary btn-sm open-job-drawer-btn" data-job-id="${j.id}" style="padding: 2px 7px; font-size: 11px;">
                          View
                        </button>
                        <button class="btn btn-secondary btn-sm delete-job-btn" data-job-id="${j.id}" title="Delete Job Sheet" style="padding: 2px 7px; font-size: 11px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                          🗑
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const headerContainer = document.getElementById('jobsPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'jobs', {
      dateBasisOptions: [
        { key: 'scheduledStart', label: 'Scheduled Start' },
        { key: 'actualEnd', label: 'Actual End' },
        { key: 'verifiedDate', label: 'Verified Date' }
      ],
      currentDateBasis: jobDateBasis,
      onDateBasisChange: (newBasis) => {
        jobDateBasis = newBasis;
        renderView();
      },
      onPeriodChange: () => {
        renderView();
      }
    });

    attachEvents();
  }

  function attachEvents() {
    // Clear date filter
    document.getElementById('clearJobDateFilterBtn')?.addEventListener('click', () => {
      periodStore.setPagePeriod('jobs', { preset: 'all_time' });
      renderView();
    });

    // Search
    document.getElementById('jobSearchInput')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderView();
    });

    // Filters
    document.getElementById('jobStatusFilter')?.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      renderView();
    });

    document.getElementById('jobAssigneeFilter')?.addEventListener('change', (e) => {
      assigneeFilter = e.target.value;
      renderView();
    });

    document.getElementById('jobPriorityFilter')?.addEventListener('change', (e) => {
      priorityFilter = e.target.value;
      renderView();
    });

    document.getElementById('jobTypeFilter')?.addEventListener('change', (e) => {
      typeFilter = e.target.value;
      renderView();
    });

    document.getElementById('overdueCheckbox')?.addEventListener('change', (e) => {
      overdueOnly = e.target.checked;
      renderView();
    });

    // Create Job Button
    document.getElementById('createJobBtn')?.addEventListener('click', () => {
      openJobDrawer(null, () => loadData());
    });

    // Export CSV
    document.getElementById('exportJobsCsvBtn')?.addEventListener('click', () => {
      exportJobsCsv();
    });

    // Select all
    const selectAllCb = document.getElementById('selectAllJobsCheckbox');
    if (selectAllCb) {
      const currentFiltered = getFilteredJobs();
      const allSelected = currentFiltered.length > 0 && currentFiltered.every(j => selectedJobIds.has(j.id));
      const someSelected = currentFiltered.some(j => selectedJobIds.has(j.id));
      selectAllCb.indeterminate = !allSelected && someSelected;
      selectAllCb.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
          currentFiltered.forEach(j => selectedJobIds.add(j.id));
        } else {
          currentFiltered.forEach(j => selectedJobIds.delete(j.id));
        }
        renderView();
      });
    }

    // Individual checkboxes
    container.querySelectorAll('.job-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-job-id');
        if (e.target.checked) selectedJobIds.add(id);
        else selectedJobIds.delete(id);
        renderView();
      });
    });

    // Bulk actions
    document.getElementById('bulkMarkVerifiedBtn')?.addEventListener('click', async () => {
      if (confirm(`Verify and approve payouts for ${selectedJobIds.size} selected job(s)?`)) {
        for (const id of selectedJobIds) {
          try {
            await jobService.updateJobStatus(id, 'Verified', auth.getCurrentUser()?.name || 'Super Admin', 'Bulk verification');
          } catch (err) {
            console.warn(err);
          }
        }
        selectedJobIds.clear();
        await loadData();
      }
    });

    document.getElementById('bulkDeleteJobsBtn')?.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to permanently delete ${selectedJobIds.size} selected job sheet(s)? This action cannot be undone.`)) {
        for (const id of selectedJobIds) {
          try {
            await jobService.deleteJob(id, auth.getCurrentUser()?.name || 'Super Admin');
          } catch (err) {
            console.warn('Failed to delete job', id, err);
          }
        }
        selectedJobIds.clear();
        await loadData();
      }
    });

    document.getElementById('bulkCancelBtn')?.addEventListener('click', () => {
      selectedJobIds.clear();
      renderView();
    });

    // Delete Single Job Button (in row)
    container.querySelectorAll('.delete-job-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-job-id');
        const target = jobs.find(j => j.id === id);
        if (confirm(`Are you sure you want to permanently delete Job Sheet ${id} (${target?.title || 'Untitled'})? This cannot be undone.`)) {
          try {
            await jobService.deleteJob(id, auth.getCurrentUser()?.name || 'Super Admin');
            selectedJobIds.delete(id);
            await loadData();
          } catch (err) {
            alert('Failed to delete job: ' + err.message);
          }
        }
      });
    });

    // Print Job Card
    container.querySelectorAll('.print-job-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-job-id');
        const job = jobs.find(j => j.id === id);
        if (job) {
          const html = jobService.generatePrintableJobCard(job);
          const win = window.open('', '_blank');
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 250);
        }
      });
    });

    // Open Job Drawer (Buttons and Links)
    container.querySelectorAll('.open-job-drawer-btn, .open-job-drawer-link').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-job-id');
        const job = jobs.find(j => j.id === id);
        if (job) openJobDrawer(job, () => loadData());
      });
    });
  }

  function exportJobsCsv() {
    const filtered = getFilteredJobs();
    const period = periodStore.getPagePeriod('jobs');
    const headers = ['Job ID', 'Client', 'Site Address', 'Type', 'Priority', 'Status', 'Points', 'Scheduled Start', 'Scheduled End', 'Assignees'];
    const rows = filtered.map(j => {
      const assignees = (j.assignees || []).map(a => a.employeeName || a.employeeId).join('; ');
      return [
        j.id,
        j.clientName || '',
        j.siteAddress || '',
        j.type,
        j.priority,
        j.status,
        j.pointsCount || 0,
        j.scheduledStart || '',
        j.scheduledEnd || '',
        assignees
      ];
    });

    exportToCsv('job_sheets', headers, rows, {
      reportTitle: 'Field Operations Job Sheets & Work Orders Register',
      period,
      filtersApplied: `Date Basis: ${jobDateBasis}, Status: ${statusFilter}, Priority: ${priorityFilter}`
    });
  }

  loadData();
}

/**
 * Detailed Job Drawer / Modal for View, Edit, Verification, and Conversion from CRM/Quotation/Project
 */
export async function openJobDrawer(job = null, onSaved = null) {
  const existingDrawer = document.getElementById('jobDrawerOverlay');
  if (existingDrawer) existingDrawer.remove();

  const employees = await db.collection('employees').list();
  const inventory = await db.collection('inventory').list();
  const parties = await db.collection('parties').list();
  const projects = await db.collection('projects').list();

  const isNew = !job || !job.createdAt;
  const templates = db.state.settings?.checklistTemplates || {};
  const defaultChecklist = (templates[job?.type || 'New Install'] || []).map(text => ({ text, done: false }));

  const formData = {
    id: (job && job.id && !job.isPrefill) ? job.id : await jobService.getNextJobId(),
    title: job?.title || '',
    type: job?.type || 'New Install',
    clientId: job?.clientId || parties[0]?.id || 'PRT-01',
    clientName: job?.clientName || parties[0]?.name || 'Government Utility',
    siteAddress: job?.siteAddress || parties[0]?.address || 'Panipat Complex',
    mapLink: job?.mapLink || '',
    projectId: job?.projectId || '',
    ticketId: job?.ticketId || '',
    amcId: job?.amcId || '',
    priority: job?.priority || 'Medium',
    status: job?.status || 'Scheduled',
    assignees: job?.assignees ? JSON.parse(JSON.stringify(job.assignees)) : [],
    scheduledStart: job?.scheduledStart || new Date().toISOString().slice(0, 16),
    scheduledEnd: job?.scheduledEnd || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16),
    camsCount: job?.camsCount || 4,
    pointsCount: job?.pointsCount || 4,
    checklist: (job?.checklist && job.checklist.length) ? JSON.parse(JSON.stringify(job.checklist)) : defaultChecklist,
    materials: job?.materials ? JSON.parse(JSON.stringify(job.materials)) : [],
    notes: job?.notes || '',
    attachments: job?.attachments || [],
    customerSignature: job?.customerSignature || null
  };

  const drawerHtml = `
    <div id="jobDrawerOverlay" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 820px; max-height: 92vh;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="brand-logo-icon" style="width: 32px; height: 32px; font-size: 13px;">🛠</div>
              <div>
                <h3 class="modal-title">${isNew ? 'Create New Field Work Order' : `Job Sheet: ${formData.id}`}</h3>
                <p style="font-size: 11.5px; color: var(--text-dim);">${formData.title || 'Technical Service & Installation'}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${!isNew ? `
                <button id="drawerPrintCardBtn" class="btn btn-secondary btn-sm" style="font-size: 11px;">
                  🖨 Print Work Order
                </button>
              ` : ''}
              <button id="closeJobDrawerBtn" class="modal-close-btn">&times;</button>
            </div>
          </div>

          <form id="jobDrawerForm">
            <div class="modal-body" style="padding: 20px 24px;">
              <!-- Job Header Bar -->
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                <div class="form-group">
                  <label class="form-label">Job Title / Scope Name</label>
                  <input type="text" id="drawerJobTitle" class="form-control" value="${formData.title}" placeholder="e.g. 10-Point STQC IP Camera Setup" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Job Classification</label>
                  <select id="drawerJobType" class="form-control">
                    <option value="New Install" ${formData.type === 'New Install' ? 'selected' : ''}>New Install</option>
                    <option value="Upgrade" ${formData.type === 'Upgrade' ? 'selected' : ''}>Upgrade</option>
                    <option value="AMC Visit" ${formData.type === 'AMC Visit' ? 'selected' : ''}>AMC Visit</option>
                    <option value="Complaint Repair" ${formData.type === 'Complaint Repair' ? 'selected' : ''}>Complaint Repair</option>
                    <option value="Survey" ${formData.type === 'Survey' ? 'selected' : ''}>Survey</option>
                    <option value="Re-routing" ${formData.type === 'Re-routing' ? 'selected' : ''}>Re-routing</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Priority</label>
                  <select id="drawerJobPriority" class="form-control">
                    <option value="Critical" ${formData.priority === 'Critical' ? 'selected' : ''}>Critical</option>
                    <option value="High" ${formData.priority === 'High' ? 'selected' : ''}>High</option>
                    <option value="Medium" ${formData.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                    <option value="Low" ${formData.priority === 'Low' ? 'selected' : ''}>Low</option>
                  </select>
                </div>
              </div>

              <!-- Client, Location & Maps -->
              <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 14px; margin-bottom: 16px;">
                <div class="form-group">
                  <label class="form-label">Client / Party</label>
                  <select id="drawerJobClient" class="form-control">
                    ${parties.map(p => `
                      <option value="${p.id}" data-name="${p.name}" data-address="${p.address || ''}" ${formData.clientId === p.id ? 'selected' : ''}>
                        ${p.name}
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Site Address & Location</label>
                  <input type="text" id="drawerJobAddress" class="form-control" value="${formData.siteAddress}" required>
                </div>
              </div>

              <!-- Schedule & Links -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                <div class="form-group">
                  <label class="form-label">Scheduled Start</label>
                  <input type="datetime-local" id="drawerJobStart" class="form-control" value="${formData.scheduledStart ? formData.scheduledStart.slice(0, 16) : ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Scheduled End (Target)</label>
                  <input type="datetime-local" id="drawerJobEnd" class="form-control" value="${formData.scheduledEnd ? formData.scheduledEnd.slice(0, 16) : ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Current Pipeline Status</label>
                  <select id="drawerJobStatus" class="form-control">
                    <option value="Backlog" ${formData.status === 'Backlog' ? 'selected' : ''}>Backlog</option>
                    <option value="Scheduled" ${formData.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="In Progress" ${formData.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="On Hold" ${formData.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                    <option value="Completed" ${formData.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="Verified" ${formData.status === 'Verified' ? 'selected' : ''}>Verified (MD/CEO Approval)</option>
                  </select>
                </div>
              </div>

              <!-- Points & Camera Count -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px; background: var(--bg-card-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Points Count</label>
                  <input type="number" id="drawerJobPoints" class="form-control" value="${formData.pointsCount || 0}" min="0">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Cameras Count</label>
                  <input type="number" id="drawerJobCams" class="form-control" value="${formData.camsCount || 0}" min="0">
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Linked Project P&L</label>
                  <select id="drawerJobProject" class="form-control">
                    <option value="">No Project (Standalone)</option>
                    ${projects.map(prj => `
                      <option value="${prj.id}" ${formData.projectId === prj.id ? 'selected' : ''}>
                        ${prj.id} - ${prj.client}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Technician Assignment Section -->
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <label class="form-label" style="margin: 0; font-size: 13px; font-weight: 700;">
                    👥 Assigned Technicians & Estimated Labour Cost
                  </label>
                  <button type="button" id="addAssigneeBtn" class="btn btn-secondary btn-sm" style="font-size: 11px;">
                    + Assign Employee
                  </button>
                </div>
                <div id="assigneesContainer" style="display: flex; flex-direction: column; gap: 8px;">
                  <!-- Dynamically populated assignees -->
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 10px; font-size: 12.5px; font-weight: 700; color: #38bdf8;">
                  <span>Estimated Total Labour: <span id="estLabourCostLabel">₹0</span></span>
                </div>
              </div>

              <!-- Quality Checklist Section -->
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <label class="form-label" style="margin: 0; font-size: 13px; font-weight: 700;">
                    ✓ Quality Checklist (<span id="checklistCounter">0/0</span>)
                  </label>
                  <button type="button" id="loadChecklistTemplateBtn" class="btn btn-secondary btn-sm" style="font-size: 11px;">
                    Reload Template
                  </button>
                </div>
                <div id="checklistItemsContainer" style="display: flex; flex-direction: column; gap: 6px;">
                  <!-- Dynamically populated checklist -->
                </div>
              </div>

              <!-- Materials / Hardware Section -->
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <label class="form-label" style="margin: 0; font-size: 13px; font-weight: 700;">
                    📦 Materials & Hardware Dispatched
                  </label>
                  <button type="button" id="addJobMaterialBtn" class="btn btn-secondary btn-sm" style="font-size: 11px;">
                    + Add SKU
                  </button>
                </div>
                <div id="jobMaterialsContainer" style="display: flex; flex-direction: column; gap: 8px;">
                  <!-- Dynamically populated materials -->
                </div>
              </div>

              <!-- Customer Signature & Notes -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Field Notes & Site Access Remarks</label>
                  <textarea id="drawerJobNotes" class="form-control" rows="4" placeholder="Enter special instructions or handover observations...">${formData.notes || ''}</textarea>
                </div>
                <div>
                  <label class="form-label">Client Digital Signature Pad</label>
                  <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); background: #0f172a; position: relative;">
                    <canvas id="signatureCanvas" width="340" height="90" style="width: 100%; height: 90px; cursor: crosshair; display: block;"></canvas>
                    <button type="button" id="clearSignatureBtn" class="btn btn-secondary btn-sm" style="position: absolute; bottom: 6px; right: 6px; font-size: 10px; padding: 2px 6px;">
                      Clear
                    </button>
                  </div>
                  <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 4px;">Sign on screen for customer acknowledgment</div>
                </div>
              </div>
            </div>

            <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 8px; align-items: center;">
                ${(!isNew) ? `
                  <button type="button" id="deleteJobFromDrawerBtn" class="btn btn-secondary" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
                    🗑 Delete Job
                  </button>
                ` : ''}
                ${(!isNew && formData.status === 'Completed') ? `
                  <button type="button" id="verifyJobNowBtn" class="btn btn-primary" style="background: linear-gradient(135deg, #059669, #10b981);">
                    ✓ Verify Job & Approve Payouts
                  </button>
                ` : ''}
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" id="cancelJobDrawerBtn" class="btn btn-secondary">Close</button>
                <button type="submit" class="btn btn-primary">${isNew ? 'Create Job Sheet' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHtml);
    const overlay = document.getElementById('jobDrawerOverlay');
    const close = () => overlay.remove();

    document.getElementById('closeJobDrawerBtn')?.addEventListener('click', close);
    document.getElementById('cancelJobDrawerBtn')?.addEventListener('click', close);

    // Canvas Signature pad setup
    const canvas = document.getElementById('signatureCanvas');
    let ctx = canvas?.getContext('2d');
    let isDrawing = false;

    if (canvas && ctx) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      // Load existing signature if present
      if (formData.customerSignature) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = formData.customerSignature;
      }

      canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
      });
      canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
      });
      canvas.addEventListener('mouseup', () => isDrawing = false);
      canvas.addEventListener('mouseleave', () => isDrawing = false);

      document.getElementById('clearSignatureBtn')?.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    // Assignees Render & Event Handlers
    let currentAssignees = [...(formData.assignees || [])];
    function renderAssignees() {
      const containerEl = document.getElementById('assigneesContainer');
      if (!containerEl) return;

      if (currentAssignees.length === 0) {
        containerEl.innerHTML = `
          <div style="font-size: 11.5px; color: #f87171; font-style: italic;">
            ⚠️ No technicians assigned yet. Jobs cannot transition to 'In Progress' without an assignee.
          </div>
        `;
        document.getElementById('estLabourCostLabel').textContent = '₹0';
        return;
      }

      let totalEst = 0;
      containerEl.innerHTML = currentAssignees.map((a, idx) => {
        const emp = employees.find(e => e.id === a.employeeId);
        let rowEst = 0;
        if (a.payBasis === 'PerPoint') rowEst = (Number(a.units) || Number(formData.pointsCount) || 1) * (Number(a.rate) || 600);
        else if (a.payBasis === 'PerJob') rowEst = Number(a.rate) || 1500;
        else if (a.payBasis === 'Daily') rowEst = (Number(a.units) || 1) * (Number(a.rate) || 500);
        totalEst += rowEst;

        return `
          <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-card); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="flex: 2;">
              <select class="form-control assignee-emp-select" data-idx="${idx}" style="font-size: 12px; padding: 4px 8px;">
                ${employees.filter(e => (e.active !== false && e.canBeAssignedJobs !== false) || a.employeeId === e.id).map(e => `
                  <option value="${e.id}" ${a.employeeId === e.id ? 'selected' : ''}>
                    ${e.name} (${e.role})${e.active === false ? ' [Former/Inactive]' : ''}
                  </option>
                `).join('')}
              </select>
            </div>
            <div style="width: 100px;">
              <select class="form-control assignee-role-select" data-idx="${idx}" style="font-size: 12px; padding: 4px 8px;">
                <option value="Lead" ${a.role === 'Lead' ? 'selected' : ''}>Lead</option>
                <option value="Support" ${a.role === 'Support' ? 'selected' : ''}>Support</option>
              </select>
            </div>
            <div style="width: 120px;">
              <select class="form-control assignee-basis-select" data-idx="${idx}" style="font-size: 12px; padding: 4px 8px;">
                <option value="PerPoint" ${a.payBasis === 'PerPoint' ? 'selected' : ''}>Per Point</option>
                <option value="PerJob" ${a.payBasis === 'PerJob' ? 'selected' : ''}>Per Job</option>
                <option value="Daily" ${a.payBasis === 'Daily' ? 'selected' : ''}>Daily</option>
              </select>
            </div>
            <div style="width: 90px;">
              <input type="number" class="form-control assignee-rate-input" data-idx="${idx}" value="${a.rate || 600}" placeholder="Rate ₹" style="font-size: 12px; padding: 4px 8px;">
            </div>
            <div style="width: 70px;">
              <input type="number" class="form-control assignee-units-input" data-idx="${idx}" value="${a.units || formData.pointsCount || 1}" placeholder="Units" style="font-size: 12px; padding: 4px 8px;">
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #34d399; width: 70px; text-align: right;">
              ₹${rowEst}
            </div>
            <button type="button" class="btn btn-secondary btn-sm remove-assignee-btn" data-idx="${idx}" style="color: var(--red-accent); padding: 2px 6px;">
              &times;
            </button>
          </div>
        `;
      }).join('');

      document.getElementById('estLabourCostLabel').textContent = formatCurrency(totalEst);

      // Attach assignee input listeners
      containerEl.querySelectorAll('.assignee-emp-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = Number(sel.getAttribute('data-idx'));
          const empId = e.target.value;
          const emp = employees.find(x => x.id === empId);
          if (emp) {
            currentAssignees[idx].employeeId = emp.id;
            currentAssignees[idx].payBasis = emp.payType || 'PerPoint';
            currentAssignees[idx].rate = emp.defaultRate || 600;
            renderAssignees();
          }
        });
      });

      containerEl.querySelectorAll('.assignee-role-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = Number(sel.getAttribute('data-idx'));
          currentAssignees[idx].role = e.target.value;
        });
      });

      containerEl.querySelectorAll('.assignee-basis-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = Number(sel.getAttribute('data-idx'));
          currentAssignees[idx].payBasis = e.target.value;
          renderAssignees();
        });
      });

      containerEl.querySelectorAll('.assignee-rate-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = Number(inp.getAttribute('data-idx'));
          currentAssignees[idx].rate = Number(e.target.value) || 0;
          renderAssignees();
        });
      });

      containerEl.querySelectorAll('.assignee-units-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = Number(inp.getAttribute('data-idx'));
          currentAssignees[idx].units = Number(e.target.value) || 1;
          renderAssignees();
        });
      });

      containerEl.querySelectorAll('.remove-assignee-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-idx'));
          currentAssignees.splice(idx, 1);
          renderAssignees();
        });
      });
    }

    document.getElementById('addAssigneeBtn')?.addEventListener('click', () => {
      const defaultEmp = employees[0];
      currentAssignees.push({
        employeeId: defaultEmp?.id || 'EMP-001',
        role: currentAssignees.length === 0 ? 'Lead' : 'Support',
        payBasis: defaultEmp?.payType || 'PerPoint',
        rate: defaultEmp?.defaultRate || 600,
        units: Number(document.getElementById('drawerJobPoints')?.value) || 4
      });
      renderAssignees();
    });

    renderAssignees();

    // Checklist Render & Event Handlers
    let currentChecklist = [...(formData.checklist || [])];
    function renderChecklist() {
      const chContainer = document.getElementById('checklistItemsContainer');
      const counterEl = document.getElementById('checklistCounter');
      if (!chContainer) return;

      const doneCount = currentChecklist.filter(c => c.done).length;
      if (counterEl) counterEl.textContent = `${doneCount}/${currentChecklist.length}`;

      chContainer.innerHTML = currentChecklist.map((c, idx) => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; background: var(--bg-card); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;">
          <input type="checkbox" class="checklist-item-checkbox" data-idx="${idx}" ${c.done ? 'checked' : ''}>
          <span style="color: ${c.done ? '#34d399' : 'var(--text-main)'}; text-decoration: ${c.done ? 'line-through' : 'none'}; flex: 1;">
            ${c.text}
          </span>
        </label>
      `).join('');

      chContainer.querySelectorAll('.checklist-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const idx = Number(cb.getAttribute('data-idx'));
          currentChecklist[idx].done = e.target.checked;
          renderChecklist();
        });
      });
    }

    document.getElementById('loadChecklistTemplateBtn')?.addEventListener('click', () => {
      const type = document.getElementById('drawerJobType').value;
      const tmpl = templates[type] || templates['New Install'] || [];
      currentChecklist = tmpl.map(text => ({ text, done: false }));
      renderChecklist();
    });

    renderChecklist();

    // Materials Render & Event Handlers
    let currentMaterials = [...(formData.materials || [])];
    function renderMaterials() {
      const matContainer = document.getElementById('jobMaterialsContainer');
      if (!matContainer) return;

      if (currentMaterials.length === 0) {
        matContainer.innerHTML = `<div style="font-size: 11.5px; color: var(--text-dim); font-style: italic;">No specific hardware SKUs attached. Click '+ Add SKU' to dispatch parts.</div>`;
        return;
      }

      matContainer.innerHTML = currentMaterials.map((m, idx) => {
        const invItem = inventory.find(i => i.id === m.skuId || i.sku === m.skuId);
        const stock = invItem ? invItem.currentStock : 0;
        const isShort = m.qty > stock;

        return `
          <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-card); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="flex: 2;">
              <select class="form-control mat-sku-select" data-idx="${idx}" style="font-size: 12px; padding: 4px 8px;">
                ${inventory.map(i => `
                  <option value="${i.id}" ${m.skuId === i.id ? 'selected' : ''}>
                    ${i.name} (Stock: ${i.currentStock})
                  </option>
                `).join('')}
              </select>
            </div>
            <div style="width: 80px;">
              <input type="number" class="form-control mat-qty-input" data-idx="${idx}" value="${m.qty}" min="1" placeholder="Qty" style="font-size: 12px; padding: 4px 8px;">
            </div>
            <div style="width: 100px; font-size: 11px; color: ${isShort ? '#ef4444' : '#34d399'}; font-weight: 600;">
              ${isShort ? `⚠️ Short (${stock})` : `✓ In Stock (${stock})`}
            </div>
            <button type="button" class="btn btn-secondary btn-sm remove-mat-btn" data-idx="${idx}" style="color: var(--red-accent); padding: 2px 6px;">
              &times;
            </button>
          </div>
        `;
      }).join('');

      matContainer.querySelectorAll('.mat-sku-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = Number(sel.getAttribute('data-idx'));
          const inv = inventory.find(i => i.id === e.target.value);
          if (inv) {
            currentMaterials[idx].skuId = inv.id;
            currentMaterials[idx].skuName = inv.name;
            renderMaterials();
          }
        });
      });

      matContainer.querySelectorAll('.mat-qty-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = Number(inp.getAttribute('data-idx'));
          currentMaterials[idx].qty = Number(e.target.value) || 1;
        });
      });

      matContainer.querySelectorAll('.remove-mat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-idx'));
          currentMaterials.splice(idx, 1);
          renderMaterials();
        });
      });
    }

    document.getElementById('addJobMaterialBtn')?.addEventListener('click', () => {
      const defaultItem = inventory[0];
      currentMaterials.push({
        skuId: defaultItem?.id || 'SKU-01',
        skuName: defaultItem?.name || 'Hardware SKU',
        qty: 1,
        returned: 0
      });
      renderMaterials();
    });

    renderMaterials();

    // Print button in drawer
    document.getElementById('drawerPrintCardBtn')?.addEventListener('click', () => {
      const html = jobService.generatePrintableJobCard(formData);
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    });

    // Verify Job Button (if in Completed state)
    document.getElementById('verifyJobNowBtn')?.addEventListener('click', async () => {
      if (confirm(`Approve verification for Job ${formData.id}? This will automatically generate Job Earning payouts for each technician and reconcile Project labour.`)) {
        try {
          await jobService.updateJobStatus(formData.id, 'Verified', auth.getCurrentUser()?.name || 'Super Admin');
          alert('Job verified successfully! Technician payouts generated and ledger posted.');
          close();
          await loadData();
        } catch (err) {
          alert('Verification failed: ' + err.message);
        }
      }
    });

    // Delete Job from Drawer Button
    document.getElementById('deleteJobFromDrawerBtn')?.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to permanently delete Job Sheet ${formData.id} (${formData.title || 'Untitled'})? This cannot be undone.`)) {
        try {
          await jobService.deleteJob(formData.id, auth.getCurrentUser()?.name || 'Super Admin');
          close();
          if (onSaved) onSaved();
        } catch (err) {
          alert('Failed to delete job: ' + err.message);
        }
      }
    });

    // Form Submit
    document.getElementById('jobDrawerForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const clientSelect = document.getElementById('drawerJobClient');
      const selectedOption = clientSelect.options[clientSelect.selectedIndex];
      const clientName = selectedOption?.getAttribute('data-name') || formData.clientName;

      const signatureDataUrl = canvas && !ctx?.getImageData(0, 0, canvas.width, canvas.height).data.every(p => p === 0)
        ? canvas.toDataURL()
        : formData.customerSignature;

      const newJobPayload = {
        title: document.getElementById('drawerJobTitle').value.trim(),
        type: document.getElementById('drawerJobType').value,
        priority: document.getElementById('drawerJobPriority').value,
        clientId: clientSelect.value,
        clientName,
        siteAddress: document.getElementById('drawerJobAddress').value.trim(),
        scheduledStart: document.getElementById('drawerJobStart').value,
        scheduledEnd: document.getElementById('drawerJobEnd').value,
        status: document.getElementById('drawerJobStatus').value,
        pointsCount: Number(document.getElementById('drawerJobPoints').value) || 0,
        camsCount: Number(document.getElementById('drawerJobCams').value) || 0,
        projectId: document.getElementById('drawerJobProject').value || null,
        assignees: currentAssignees,
        checklist: currentChecklist,
        materials: currentMaterials,
        notes: document.getElementById('drawerJobNotes').value.trim(),
        customerSignature: signatureDataUrl
      };

      try {
        if (isNew) {
          await db.collection('jobs').create({
            id: formData.id,
            ...newJobPayload,
            ticketId: null,
            amcId: null,
            activity: [
              {
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
                user: auth.getCurrentUser()?.name || 'Aditya Sharma',
                action: 'Work Order Created'
              }
            ]
          });
        } else {
          // If status changed to Verified, use jobService.updateJobStatus
          if (newJobPayload.status === 'Verified' && formData.status !== 'Verified') {
            await jobService.updateJobStatus(formData.id, 'Verified', auth.getCurrentUser()?.name || 'Super Admin');
          }
          await db.collection('jobs').update(formData.id, newJobPayload);
        }

        close();
        if (onSaved) onSaved();
      } catch (err) {
        alert('Error saving job: ' + err.message);
      }
    });
  }
