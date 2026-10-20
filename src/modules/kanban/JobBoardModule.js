// Kanban Job Board Module - Drag & Drop, Swimlanes, Calendar & Dispatch List
import { db, formatCurrency, formatDate } from '../../store/db.js';
import { jobService } from '../../services/jobService.js';
import { slaService } from '../../services/slaService.js';
import { auth } from '../../services/auth.js';
import { periodStore } from '../../store/periodStore.js';
import { inRange } from '../../services/periodService.js';
import { renderPagePeriodHeader } from '../../components/PeriodPicker/PeriodPicker.js';
import { openJobDrawer } from '../jobs/JobSheetsModule.js';

export function renderJobBoardModule(container) {
  let activeView = 'kanban'; // 'kanban' | 'calendar' | 'dispatch'
  let swimlane = 'none'; // 'none' | 'employee' | 'priority'
  let searchQuery = '';
  let employeeFilter = 'All';
  let priorityFilter = 'All';
  let typeFilter = 'All';
  let myJobsOnly = false;
  let alwaysShowOverdue = true;
  let jobDateBasis = 'scheduledStart';

  let jobs = [];
  let employees = [];
  let tickets = [];
  let parties = [];

  const KANBAN_COLUMNS = [
    { id: 'Backlog', label: 'Backlog / Pending Scope', color: '#64748b', wipLimit: 15 },
    { id: 'Scheduled', label: 'Scheduled & Dispatched', color: '#38bdf8', wipLimit: 10 },
    { id: 'In Progress', label: 'In Progress (On Site)', color: '#f59e0b', wipLimit: 6 },
    { id: 'On Hold', label: 'On Hold (Site Blocked)', color: '#ef4444', wipLimit: 8 },
    { id: 'Completed', label: 'Completed (Sign-Off)', color: '#10b981', wipLimit: 12 },
    { id: 'Verified', label: 'Verified & Audited', color: '#6366f1', wipLimit: 50 }
  ];

  async function loadData() {
    jobs = await db.collection('jobs').list();
    employees = await db.collection('employees').list();
    tickets = await db.collection('tickets').list();
    parties = await db.collection('parties').list();
    renderView();
  }

  function getFilteredJobs() {
    const currentUser = auth.getCurrentUser();
    const period = periodStore.getPagePeriod('job-board');
    const now = new Date();

    return jobs.filter(j => {
      // 1. Period filter with 'always show overdue' protection
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const isOverdue = (j.status !== 'Completed' && j.status !== 'Verified' && j.status !== 'Cancelled') && j.scheduledEnd && new Date(j.scheduledEnd) < now;
        const isUnscheduled = !j.scheduledStart;

        if (alwaysShowOverdue && (isOverdue || isUnscheduled)) {
          // Kept visible so critical overdue or unassigned work is never hidden by date filter
        } else {
          const rawDate = j[jobDateBasis] || j.scheduledStart || j.createdAt;
          if (!rawDate) return false;
          if (!inRange(String(rawDate).slice(0, 10), period)) {
            return false;
          }
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = j.id.toLowerCase().includes(q) ||
          j.title.toLowerCase().includes(q) ||
          (j.clientName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (employeeFilter !== 'All') {
        const has = (j.assignees || []).some(a => a.employeeId === employeeFilter);
        if (!has) return false;
      }
      if (priorityFilter !== 'All' && j.priority !== priorityFilter) return false;
      if (typeFilter !== 'All' && j.type !== typeFilter) return false;
      if (myJobsOnly && currentUser) {
        const has = (j.assignees || []).some(a => a.employeeId === currentUser.id || a.employeeName === currentUser.name);
        if (!has) return false;
      }
      return true;
    });
  }

  function renderView() {
    const filteredJobs = getFilteredJobs();
    const now = new Date();

    container.innerHTML = `
      <div class="job-board-module-view">
        <!-- Top Page Period Header -->
        <div id="jobBoardPagePeriodContainer"></div>

        <!-- Top Board Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.4); color: #93c5fd; margin-bottom: 6px;">
                ● LIVE FIELD PIPELINE & DISPATCH BOARD
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                FIELD OPERATIONS KANBAN & DISPATCH
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Drag & drop work orders across pipeline stages, monitor SLA risk chips, enforce WIP limits and review daily dispatches.
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <!-- View Switcher -->
              <div style="display: flex; background: rgba(0,0,0,0.3); padding: 3px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.1);">
                <button id="viewKanbanBtn" class="btn btn-sm ${activeView === 'kanban' ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 10px; font-size: 11.5px;">
                  Kanban Board
                </button>
                <button id="viewCalendarBtn" class="btn btn-sm ${activeView === 'calendar' ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 10px; font-size: 11.5px;">
                  Calendar
                </button>
                <button id="viewDispatchBtn" class="btn btn-sm ${activeView === 'dispatch' ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 10px; font-size: 11.5px;">
                  Today's Dispatch
                </button>
              </div>

              ${activeView === 'kanban' ? `
                <!-- Swimlane Selector -->
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 11px; color: #cbd5e1;">Swimlane:</span>
                  <select id="swimlaneSelect" class="form-control" style="font-size: 11.5px; padding: 4px 8px; width: 140px; background: #0f172a; color: #fff; border-color: rgba(255,255,255,0.2);">
                    <option value="none" ${swimlane === 'none' ? 'selected' : ''}>Standard Columns</option>
                    <option value="employee" ${swimlane === 'employee' ? 'selected' : ''}>By Employee</option>
                    <option value="priority" ${swimlane === 'priority' ? 'selected' : ''}>By Priority</option>
                  </select>
                </div>
              ` : ''}

              <!-- Create Job Button -->
              <button id="boardCreateJobBtn" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; padding: 5px 12px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Create Job Sheet
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="table-card" style="padding: 14px 18px; margin-bottom: 20px;">
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <input type="text" id="boardSearchInput" class="form-control" placeholder="Quick filter by Job ID, client, scope..." value="${searchQuery}" style="font-size: 12px; padding: 6px 10px;">
            </div>
            <div style="width: 150px;">
              <select id="boardEmployeeFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
                <option value="All">Technician: All</option>
                ${employees.map(e => `
                  <option value="${e.id}" ${employeeFilter === e.id ? 'selected' : ''}>${e.name}</option>
                `).join('')}
              </select>
            </div>
            <div style="width: 130px;">
              <select id="boardPriorityFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
                <option value="All" ${priorityFilter === 'All' ? 'selected' : ''}>Priority: All</option>
                <option value="Critical" ${priorityFilter === 'Critical' ? 'selected' : ''}>Critical</option>
                <option value="High" ${priorityFilter === 'High' ? 'selected' : ''}>High</option>
                <option value="Medium" ${priorityFilter === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Low" ${priorityFilter === 'Low' ? 'selected' : ''}>Low</option>
              </select>
            </div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="myJobsCheckbox" ${myJobsOnly ? 'checked' : ''}>
              <span style="color: ${myJobsOnly ? '#38bdf8' : 'var(--text-dim)'}; font-weight: 600;">My Jobs</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; user-select: none; margin-left: 6px;">
              <input type="checkbox" id="boardAlwaysShowOverdueCheckbox" ${alwaysShowOverdue ? 'checked' : ''}>
              <span style="color: ${alwaysShowOverdue ? '#34d399' : 'var(--text-dim)'}; font-weight: 600;">Always show overdue</span>
            </label>
            <span style="font-size: 11.5px; color: var(--text-muted); margin-left: auto;">
              Showing <strong>${filteredJobs.length}</strong> of ${jobs.length} jobs in period
            </span>
          </div>
        </div>

        <!-- View Body Content -->
        ${activeView === 'kanban' ? renderKanbanContent(filteredJobs) : ''}
        ${activeView === 'calendar' ? renderCalendarContent(filteredJobs) : ''}
        ${activeView === 'dispatch' ? renderDispatchContent(filteredJobs) : ''}
      </div>
    `;

    const headerContainer = document.getElementById('jobBoardPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'job-board', {
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

  function renderKanbanContent(filteredJobs) {
    if (swimlane === 'none') {
      return `
        <div class="kanban-board" style="display: grid; grid-template-columns: repeat(6, minmax(280px, 1fr)); gap: 16px; overflow-x: auto; padding-bottom: 20px;">
          ${KANBAN_COLUMNS.map(col => {
            const colJobs = filteredJobs.filter(j => j.status === col.id);
            const isWipExceeded = col.wipLimit && colJobs.length > col.wipLimit;

            return `
              <div class="kanban-column" data-status-id="${col.id}" style="background: var(--bg-card); border: 1px solid ${isWipExceeded ? '#ef4444' : 'var(--border-color)'}; border-radius: var(--radius-lg); display: flex; flex-direction: column; min-height: 650px;">
                <!-- Column Header -->
                <div class="kanban-header" style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-subtle); border-top: 3px solid ${col.color}; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg);">
                  <div>
                    <span style="font-weight: 700; font-size: 13px; color: var(--text-main);">${col.label}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="status-pill ${isWipExceeded ? 'status-reorder' : 'status-progress'}" style="font-size: 10px; font-weight: 700;">
                      ${colJobs.length}${col.wipLimit ? ` / ${col.wipLimit}` : ''}
                    </span>
                    <button type="button" class="kanban-create-in-col-btn" data-status="${col.id}" title="New job in ${col.label}" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-dim); cursor: pointer; font-size: 12px; padding: 1px 6px; line-height: 1.2;">
                      +
                    </button>
                  </div>
                </div>

                ${isWipExceeded ? `
                  <div style="background: rgba(239, 68, 68, 0.15); color: #f87171; font-size: 10.5px; padding: 4px 10px; text-align: center; font-weight: 600;">
                    ⚠️ WIP Limit Exceeded (${colJobs.length} > ${col.wipLimit})
                  </div>
                ` : ''}

                <!-- Cards Container -->
                <div class="kanban-dropzone" data-status-id="${col.id}" style="padding: 12px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto;">
                  ${colJobs.length === 0 ? `
                    <div style="text-align: center; padding: 26px 10px; color: var(--text-dim); font-size: 12px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
                      <div style="margin-bottom: 8px;">No work orders in ${col.id}</div>
                      <button type="button" class="btn btn-secondary btn-sm kanban-create-in-col-btn" data-status="${col.id}" style="font-size: 11px; padding: 3px 8px;">
                        + New Job Sheet
                      </button>
                    </div>
                  ` : colJobs.map(job => renderKanbanCard(job)).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Swimlane by Employee or Priority
    const swimlaneGroups = swimlane === 'employee'
      ? employees.map(e => ({ id: e.id, label: `${e.name} (${e.role})` }))
      : [
          { id: 'Critical', label: 'Critical Priority (P1)' },
          { id: 'High', label: 'High Priority (P2)' },
          { id: 'Medium', label: 'Medium Priority (P3)' },
          { id: 'Low', label: 'Low Priority (P4)' }
        ];

    return `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        ${swimlaneGroups.map(group => {
          const groupJobs = filteredJobs.filter(j => {
            if (swimlane === 'employee') {
              return (j.assignees || []).some(a => a.employeeId === group.id);
            }
            return j.priority === group.id;
          });

          return `
            <div class="table-card" style="padding: 16px;">
              <div style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #38bdf8; display: flex; align-items: center; justify-content: space-between;">
                <span>${group.label}</span>
                <span class="status-pill status-progress" style="font-size: 11px;">${groupJobs.length} Work Orders</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(6, minmax(240px, 1fr)); gap: 12px; overflow-x: auto;">
                ${KANBAN_COLUMNS.map(col => {
                  const cellJobs = groupJobs.filter(j => j.status === col.id);
                  return `
                    <div class="kanban-dropzone" data-status-id="${col.id}" style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px; min-height: 160px; display: flex; flex-direction: column; gap: 8px;">
                      <div style="font-size: 11px; font-weight: 600; color: var(--text-dim); border-bottom: 1px solid var(--border-color); padding-bottom: 4px; display: flex; justify-content: space-between;">
                        <span>${col.id}</span>
                        <span>(${cellJobs.length})</span>
                      </div>
                      ${cellJobs.map(job => renderKanbanCard(job)).join('')}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderKanbanCard(job) {
    const now = new Date();
    const isOverdue = (job.status !== 'Completed' && job.status !== 'Verified' && job.status !== 'Cancelled') &&
      job.scheduledEnd && new Date(job.scheduledEnd) < now;

    const checklistTotal = (job.checklist || []).length;
    const checklistDone = (job.checklist || []).filter(c => c.done).length;
    const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

    const priorityColors = {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#38bdf8',
      Low: '#94a3b8'
    };

    // Linked Ticket SLA chip if applicable
    let slaChipHtml = '';
    if (job.ticketId) {
      const ticket = tickets.find(t => t.id === job.ticketId);
      if (ticket) {
        const sla = slaService.computeTicketSlaStatus(ticket);
        slaChipHtml = `
          <div class="sla-chip ${sla.badgeClass}" style="font-size: 9.5px; padding: 2px 6px; border-radius: 4px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;">
            <span>⏱ Ticket ${ticket.id}:</span>
            <strong>${sla.timeFormatted}</strong>
          </div>
        `;
      }
    }

    return `
      <div class="job-kanban-card" data-job-id="${job.id}" draggable="true" style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 4px solid ${priorityColors[job.priority] || '#38bdf8'}; border-radius: var(--radius-md); padding: 10px 12px; cursor: grab; transition: all 0.2s ease; box-shadow: var(--shadow-sm); position: relative;">
        <!-- Card Top: Grab handle & Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--text-dim); font-size: 12px;">⠿</span>
            <span class="kanban-card-id-btn" data-job-id="${job.id}" style="font-family: monospace; font-size: 11.5px; font-weight: 700; color: #38bdf8; cursor: pointer; text-decoration: underline;" title="Click to view/edit work order">
              ${job.id}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 9.5px; font-weight: 700; color: ${priorityColors[job.priority] || '#94a3b8'}; text-transform: uppercase; margin-right: 2px;">
              ${job.priority}
            </span>
            <button type="button" class="btn btn-secondary btn-sm kanban-card-edit-btn" data-job-id="${job.id}" title="Edit Job Sheet" style="padding: 1px 5px; font-size: 10.5px; line-height: 1.2;">
              ✏️
            </button>
            <button type="button" class="btn btn-secondary btn-sm kanban-card-delete-btn" data-job-id="${job.id}" title="Delete Job Sheet" style="padding: 1px 5px; font-size: 10.5px; line-height: 1.2; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
              🗑
            </button>
          </div>
        </div>

        <!-- Title & Client -->
        <div class="kanban-card-content" style="cursor: pointer;" title="Click to view/edit work order">
          <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main); margin-bottom: 2px; line-height: 1.3;">
            ${job.title}
          </div>
          <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            📍 ${job.clientName}
          </div>
        </div>

        <!-- SLA Chip if present -->
        ${slaChipHtml}

        <!-- Checklist Bar -->
        <div style="margin: 6px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-dim); margin-bottom: 2px;">
            <span>Checklist</span>
            <span>${checklistDone}/${checklistTotal} (${checklistPct}%)</span>
          </div>
          <div style="height: 4px; background: var(--bg-card-subtle); border-radius: 2px; overflow: hidden;">
            <div style="width: ${checklistPct}%; height: 100%; background: ${checklistPct === 100 ? '#34d399' : '#38bdf8'};"></div>
          </div>
        </div>

        <!-- Card Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.06);">
          <div style="display: flex; align-items: center; gap: 4px;">
            ${(job.assignees || []).map(a => {
              const emp = employees.find(e => e.id === a.employeeId);
              const initials = emp ? emp.name.split(' ').map(n => n[0]).join('') : 'EM';
              return `
                <div class="user-avatar-circle" style="width: 22px; height: 22px; font-size: 9px; background: #2563eb;" title="${emp?.name || a.employeeId}">
                  ${initials}
                </div>
              `;
            }).join('')}
            ${(!job.assignees || !job.assignees.length) ? `<span style="font-size: 10px; color: #f87171;">Unassigned</span>` : ''}
          </div>

          <div style="text-align: right;">
            <div style="font-size: 10.5px; color: ${isOverdue ? '#ef4444' : 'var(--text-dim)'}; font-weight: ${isOverdue ? '700' : '500'};">
              ${isOverdue ? '⚠️ Overdue' : formatDate(job.scheduledEnd || job.scheduledStart)}
            </div>
            <div style="font-size: 9.5px; color: var(--text-dim);">${job.pointsCount || 0} Pts &bull; ${job.camsCount || 0} Cams</div>
          </div>
        </div>

        <!-- Quick Actions Footer -->
        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; gap: 6px;">
          <button type="button" class="btn btn-secondary btn-sm kanban-card-print-btn" data-job-id="${job.id}" title="Print A4 Work Order Card" style="font-size: 10px; padding: 2px 6px;">
            🖨 Card
          </button>
          <select class="job-quick-move-select" data-job-id="${job.id}" style="font-size: 10px; padding: 2px 4px; background: var(--bg-card-subtle); color: var(--text-dim); border: 1px solid var(--border-color); border-radius: 4px;">
            <option value="">Move to...</option>
            ${KANBAN_COLUMNS.map(c => `
              <option value="${c.id}" ${job.status === c.id ? 'disabled' : ''}>${c.id}</option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  }

  function renderCalendarContent(filteredJobs) {
    // Group jobs by date (next 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }

    return `
      <div class="table-card" style="padding: 20px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 14px;">7-Day Work Order Dispatch Calendar</h3>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; overflow-x: auto;">
          ${days.map(d => {
            const dateStr = d.toISOString().split('T')[0];
            const isToday = i => i === 0;
            const dayJobs = filteredJobs.filter(j => (j.scheduledStart && j.scheduledStart.startsWith(dateStr)));

            return `
              <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; min-height: 280px;">
                <div style="font-size: 12px; font-weight: 700; color: ${d.getDay() === 0 ? '#f87171' : 'var(--text-main)'}; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 8px;">
                  ${d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                  ${d.toDateString() === new Date().toDateString() ? ' (Today)' : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${dayJobs.length === 0 ? `
                    <div style="font-size: 11px; color: var(--text-dim); font-style: italic;">No jobs</div>
                  ` : dayJobs.map(j => `
                    <div class="open-job-card-quick" data-job-id="${j.id}" style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 3px solid #38bdf8; border-radius: 4px; padding: 6px 8px; font-size: 11px; cursor: pointer;">
                      <div style="font-weight: 700; color: #38bdf8;">${j.id}</div>
                      <div style="font-weight: 600; color: var(--text-main); margin: 2px 0;">${j.clientName}</div>
                      <div style="color: var(--text-dim);">${j.type} &bull; ${j.status}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderDispatchContent(filteredJobs) {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayJobs = filteredJobs.filter(j => j.scheduledStart && j.scheduledStart.startsWith(todayStr));

    return `
      <div class="table-card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;">Daily Field Dispatch Sheet (${formatDate(new Date())})</h3>
            <p style="font-size: 12px; color: var(--text-dim);">Printable daily route schedule for all surveillance engineers and field staff.</p>
          </div>
          <button id="printDispatchSheetBtn" class="btn btn-primary btn-sm">
            🖨 Print Dispatch Sheet
          </button>
        </div>

        <div class="table-responsive">
          <table class="erp-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Client & Site Coordinates</th>
                <th>Work Scope</th>
                <th>Assigned Engineers</th>
                <th>Time Window</th>
                <th>Points</th>
                <th>Status</th>
                <th>Quick Dispatch</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${todayJobs.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-dim);">
                    No jobs currently scheduled for today (${formatDate(new Date())}).
                  </td>
                </tr>
              ` : todayJobs.map(j => {
                const clientPhone = parties.find(p => p.id === j.clientId)?.phone || '+91 89300-82398';
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #38bdf8;">${j.id}</td>
                    <td>
                      <div style="font-weight: 700;">${j.clientName}</div>
                      <div style="font-size: 11px; color: var(--text-dim);">${j.siteAddress}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600;">${j.type}</div>
                      <div style="font-size: 11px; color: var(--text-dim);">${j.title}</div>
                    </td>
                    <td>
                      ${(j.assignees || []).map(a => `${a.employeeName || a.employeeId} (${a.role})`).join(', ') || 'Unassigned'}
                    </td>
                    <td>${j.scheduledStart ? j.scheduledStart.slice(11, 16) : '09:00'} - ${j.scheduledEnd ? j.scheduledEnd.slice(11, 16) : '18:00'}</td>
                    <td>${j.pointsCount || 0}</td>
                    <td><span class="status-pill status-progress">${j.status}</span></td>
                    <td style="white-space: nowrap;">
                      <a href="tel:${clientPhone}" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 11px;" title="Call Client">
                        📞 Call
                      </a>
                      <a href="https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=Hello%20from%20Eliza%20Infotech%20CCTV%20Technical%20Team%20regarding%20Job%20${j.id}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 11px; color: #34d399;" title="WhatsApp Client">
                        💬 WhatsApp
                      </a>
                    </td>
                    <td class="text-center" style="white-space: nowrap;">
                      <button type="button" class="btn btn-primary btn-sm open-dispatch-job-btn" data-job-id="${j.id}" style="padding: 2px 7px; font-size: 11px;">
                        Edit
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm print-dispatch-job-btn" data-job-id="${j.id}" title="Print A4 Job Card" style="padding: 2px 6px; font-size: 11px;">
                        🖨
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm delete-dispatch-job-btn" data-job-id="${j.id}" title="Delete Job Sheet" style="padding: 2px 6px; font-size: 11px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
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
    `;
  }

  function attachEvents() {
    // View Switchers
    document.getElementById('viewKanbanBtn')?.addEventListener('click', () => { activeView = 'kanban'; renderView(); });
    document.getElementById('viewCalendarBtn')?.addEventListener('click', () => { activeView = 'calendar'; renderView(); });
    document.getElementById('viewDispatchBtn')?.addEventListener('click', () => { activeView = 'dispatch'; renderView(); });

    // Swimlane
    document.getElementById('swimlaneSelect')?.addEventListener('change', (e) => {
      swimlane = e.target.value;
      renderView();
    });

    // Filters
    document.getElementById('boardSearchInput')?.addEventListener('input', (e) => { searchQuery = e.target.value; renderView(); });
    document.getElementById('boardEmployeeFilter')?.addEventListener('change', (e) => { employeeFilter = e.target.value; renderView(); });
    document.getElementById('boardPriorityFilter')?.addEventListener('change', (e) => { priorityFilter = e.target.value; renderView(); });
    document.getElementById('myJobsCheckbox')?.addEventListener('change', (e) => { myJobsOnly = e.target.checked; renderView(); });
    document.getElementById('boardAlwaysShowOverdueCheckbox')?.addEventListener('change', (e) => { alwaysShowOverdue = e.target.checked; renderView(); });

    // Native Drag and Drop Setup
    let draggedJobId = null;

    container.querySelectorAll('.job-kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedJobId = card.getAttribute('data-job-id');
        card.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', draggedJobId);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        draggedJobId = null;
        container.querySelectorAll('.kanban-column, .kanban-dropzone').forEach(col => col.classList.remove('kanban-dragover'));
      });
    });

    container.querySelectorAll('.kanban-dropzone').forEach(dropzone => {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dropzone.classList.add('kanban-dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('kanban-dragover');
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('kanban-dragover');
        const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
        const targetStatus = dropzone.getAttribute('data-status-id');

        if (jobId && targetStatus) {
          try {
            await jobService.updateJobStatus(jobId, targetStatus, auth.getCurrentUser()?.name || 'Super Admin');
            await loadData();
          } catch (err) {
            alert('Cannot move job: ' + err.message);
          }
        }
      });
    });

    // Quick Move Select (Keyboard & Touch Accessibility)
    container.querySelectorAll('.job-quick-move-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const targetStatus = e.target.value;
        const jobId = sel.getAttribute('data-job-id');
        if (targetStatus && jobId) {
          try {
            await jobService.updateJobStatus(jobId, targetStatus, auth.getCurrentUser()?.name || 'Super Admin');
            await loadData();
          } catch (err) {
            alert('Cannot move job: ' + err.message);
            sel.value = '';
          }
        }
      });
    });

    // Top Banner Create Job Button
    document.getElementById('boardCreateJobBtn')?.addEventListener('click', () => {
      openJobDrawer(null, () => loadData());
    });

    // Column "+ New Job Sheet" Buttons
    container.querySelectorAll('.kanban-create-in-col-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const status = btn.getAttribute('data-status') || 'Backlog';
        openJobDrawer({ status, isPrefill: true }, () => loadData());
      });
    });

    // Edit Job from Card (Icon button and ID link)
    container.querySelectorAll('.kanban-card-edit-btn, .kanban-card-id-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-job-id');
        const target = jobs.find(j => j.id === id);
        if (target) openJobDrawer(target, () => loadData());
      });
    });

    // Delete Job from Card
    container.querySelectorAll('.kanban-card-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-job-id');
        const target = jobs.find(j => j.id === id);
        if (confirm(`Are you sure you want to permanently delete Job Sheet ${id} (${target?.title || 'Untitled'})? This cannot be undone.`)) {
          try {
            await jobService.deleteJob(id, auth.getCurrentUser()?.name || 'Super Admin');
            await loadData();
          } catch (err) {
            alert('Failed to delete job: ' + err.message);
          }
        }
      });
    });

    // Print Job Card from Kanban or Dispatch
    container.querySelectorAll('.kanban-card-print-btn, .print-dispatch-job-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-job-id');
        const target = jobs.find(j => j.id === id);
        if (target) {
          const html = jobService.generatePrintableJobCard(target);
          const win = window.open('', '_blank');
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 250);
        }
      });
    });

    // Dispatch Table Row Edit and Delete
    container.querySelectorAll('.open-dispatch-job-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-job-id');
        const target = jobs.find(j => j.id === id);
        if (target) openJobDrawer(target, () => loadData());
      });
    });

    container.querySelectorAll('.delete-dispatch-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-job-id');
        const target = jobs.find(j => j.id === id);
        if (confirm(`Are you sure you want to permanently delete Job Sheet ${id} (${target?.title || 'Untitled'})? This cannot be undone.`)) {
          try {
            await jobService.deleteJob(id, auth.getCurrentUser()?.name || 'Super Admin');
            await loadData();
          } catch (err) {
            alert('Failed to delete job: ' + err.message);
          }
        }
      });
    });

    // Card click opens full drawer
    container.querySelectorAll('.job-kanban-card, .open-job-card-quick').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.tagName === 'A' || e.target.closest('button')) return;
        const jobId = el.getAttribute('data-job-id');
        const targetJob = jobs.find(j => j.id === jobId);
        if (targetJob) openJobDrawer(targetJob, () => loadData());
      });
    });

    // Quick-Move Dropdown on Card (Touch and mobile friendly column switcher)
    container.querySelectorAll('.job-quick-move-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        const jobId = sel.getAttribute('data-job-id');
        if (!newStatus || !jobId) return;
        try {
          await jobService.updateJobStatus(jobId, newStatus, auth.getCurrentUser()?.name || 'Super Admin');
          await loadData();
        } catch (err) {
          alert('Failed to update status: ' + (err.message || err));
          sel.value = '';
        }
      });
    });

    // Print Dispatch Sheet
    document.getElementById('printDispatchSheetBtn')?.addEventListener('click', () => {
      window.print();
    });
  }

  function openJobQuickDrawer(job) {
    const existing = document.getElementById('jobQuickDrawerModal');
    if (existing) existing.remove();

    const clientPhone = parties.find(p => p.id === job.clientId)?.phone || '+91 89300-82398';

    const html = `
      <div id="jobQuickDrawerModal" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 620px;">
          <div class="modal-header">
            <div>
              <div style="font-family: monospace; font-size: 12px; color: #38bdf8; font-weight: 700;">${job.id} &bull; ${job.type}</div>
              <h3 class="modal-title">${job.title}</h3>
            </div>
            <button id="closeQuickDrawerBtn" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background: var(--bg-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 14px;">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Client Site & Direct Dispatch</div>
              <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-top: 2px;">${job.clientName}</div>
              <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">${job.siteAddress}</div>
              <div style="display: flex; gap: 10px; margin-top: 10px;">
                <a href="tel:${clientPhone}" class="btn btn-secondary btn-sm" style="font-size: 11.5px;">
                  📞 Call Client (${clientPhone})
                </a>
                <a href="https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=Hello%20from%20Eliza%20Infotech%20CCTV%20regarding%20Job%20${job.id}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 11.5px; color: #34d399;">
                  💬 WhatsApp
                </a>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 11px; color: var(--text-dim);">Pipeline Status</div>
                <div style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-top: 2px;">${job.status}</div>
              </div>
              <div style="background: var(--bg-card-subtle); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 11px; color: var(--text-dim);">Assigned Lead</div>
                <div style="font-size: 13px; font-weight: 700; color: #34d399; margin-top: 2px;">
                  ${(job.assignees || []).map(a => a.employeeName || a.employeeId).join(', ') || 'Unassigned'}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Add Quick Progress Note / Site Observation</label>
              <textarea id="quickJobNoteText" class="form-control" rows="3" placeholder="Enter note..."></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <button type="button" id="quickDrawerDeleteJobBtn" class="btn btn-secondary" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
              🗑 Delete
            </button>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="openFullDrawerFromQuickBtn" class="btn btn-secondary">
                🛠 Full Work Order / Edit
              </button>
              <button type="button" id="dismissQuickDrawerBtn" class="btn btn-secondary">Close</button>
              <button type="button" id="saveQuickJobNoteBtn" class="btn btn-primary">Add Note</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('jobQuickDrawerModal');
    const close = () => modal.remove();

    document.getElementById('closeQuickDrawerBtn')?.addEventListener('click', close);
    document.getElementById('dismissQuickDrawerBtn')?.addEventListener('click', close);

    document.getElementById('openFullDrawerFromQuickBtn')?.addEventListener('click', () => {
      close();
      openJobDrawer(job, () => loadData());
    });

    document.getElementById('quickDrawerDeleteJobBtn')?.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to permanently delete Job Sheet ${job.id} (${job.title || 'Untitled'})? This cannot be undone.`)) {
        try {
          await jobService.deleteJob(job.id, auth.getCurrentUser()?.name || 'Super Admin');
          close();
          await loadData();
        } catch (err) {
          alert('Failed to delete job: ' + err.message);
        }
      }
    });

    document.getElementById('saveQuickJobNoteBtn')?.addEventListener('click', async () => {
      const note = document.getElementById('quickJobNoteText')?.value.trim();
      if (note) {
        const activity = [...(job.activity || [])];
        activity.push({
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          user: auth.getCurrentUser()?.name || 'Super Admin',
          action: `Note added: ${note}`
        });
        await db.collection('jobs').update(job.id, {
          notes: (job.notes ? job.notes + '\n' : '') + `[${new Date().toLocaleDateString('en-IN')}] ${note}`,
          activity
        });
        close();
        await loadData();
      }
    });
  }

  loadData();
}
