// Team & Employee Master Module - Unified Workforce Directory & Performance Scorecards
// Synchronized with peopleService single source of truth and openProfileDrawer.

import { db, formatCurrency, formatDate } from '../../store/db.js';
import { auth } from '../../services/auth.js';
import { peopleService } from '../../services/peopleService.js';
import { ROLES, ROLE_LABELS, ROLE_BADGE_COLORS, normalizeRole } from '../../config/permissions.js';
import { openProfileDrawer } from '../profile/MyProfileModule.js';

export function renderTeamModule(container, navigateTo) {
  let people = [];
  let jobs = [];
  let payouts = [];
  let tickets = [];

  let searchQuery = '';
  let roleFilter = 'All';
  let activeOnly = true;

  const currentUser = auth.getCurrentUser() || { name: 'Super Admin', role: 'Super Admin' };
  const userRole = normalizeRole(currentUser.roleCode || currentUser.role);
  const isTechnicianView = (userRole === ROLES.TECHNICIAN || userRole === ROLES.HELPER);
  const isSuperAdmin = (userRole === ROLES.SUPER_ADMIN);
  const isAdmin = isSuperAdmin || (userRole === ROLES.ADMIN);

  async function loadData() {
    await peopleService.init();
    people = await peopleService.list();
    jobs = await db.collection('jobs').list();
    payouts = await db.collection('payouts').list();
    tickets = await db.collection('tickets').list();
    renderView();
  }

  function getFilteredPeople() {
    return people.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (p.fullName && p.fullName.toLowerCase().includes(q)) ||
          (p.displayName && p.displayName.toLowerCase().includes(q)) ||
          (p.role && p.role.toLowerCase().includes(q)) ||
          (p.designation && p.designation.toLowerCase().includes(q)) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.employeeCode && p.employeeCode.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (roleFilter !== 'All' && p.role !== roleFilter) return false;
      if (activeOnly && (p.employmentStatus !== 'ACTIVE' || p.accessStatus === 'SUSPENDED' || p.accessStatus === 'DEACTIVATED')) return false;
      return true;
    });
  }

  function renderView() {
    const filtered = getFilteredPeople();

    container.innerHTML = `
      <div class="team-module-view" style="padding-bottom: 30px;">
        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.4); color: #93c5fd; margin-bottom: 6px;">
                ● TECHNICAL WORKFORCE DIRECTORY & OPERATIONS
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 4px 0;">
                FIELD SURVEILLANCE ENGINEERING TEAM
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                ${isTechnicianView ? 
                  'Official contact directory of Eliza Infotech surveillance team members and dispatch contacts.' : 
                  'Technician rate cards, job turnarounds, CSAT ratings, performance scorecards & direct ledger statements.'}
              </p>
            </div>
            ${isAdmin ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isSuperAdmin ? `
                  <button id="navToAdminUsersBtn" class="btn btn-secondary btn-sm" title="Go to Super Admin User Management Dashboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    User Governance
                  </button>
                ` : ''}
                <button id="addPersonBtn" class="btn btn-primary btn-sm">
                  + Add Team Member
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="table-card" style="padding: 14px 18px; margin-bottom: 20px;">
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 220px;">
              <input type="text" id="empSearchInput" class="form-control" placeholder="Search by name, role, phone, employee code..." value="${escapeHtml(searchQuery)}" style="font-size: 12px; padding: 6px 10px;">
            </div>
            <div style="width: 170px;">
              <select id="empRoleFilter" class="form-control" style="font-size: 12px; padding: 6px 10px;">
                <option value="All" ${roleFilter === 'All' ? 'selected' : ''}>Role: All</option>
                ${Object.keys(ROLES).map(rk => `
                  <option value="${rk}" ${roleFilter === rk ? 'selected' : ''}>${ROLE_LABELS[rk]}</option>
                `).join('')}
              </select>
            </div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; user-select: none;">
              <input type="checkbox" id="empActiveOnlyCheckbox" ${activeOnly ? 'checked' : ''}>
              <span style="color: var(--text-dim); font-weight: 600;">Active Staff Only</span>
            </label>
          </div>
        </div>

        <!-- Team Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-md);">
              No team members match your filter criteria.
            </div>
          ` : filtered.map(person => {
            const roleBadgeColor = ROLE_BADGE_COLORS[person.role] || '#3b82f6';
            const initials = (person.displayName || person.fullName).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const isActive = (person.employmentStatus === 'ACTIVE' && person.accessStatus !== 'SUSPENDED' && person.accessStatus !== 'DEACTIVATED');

            // Simplified view for Technicians (Section 7)
            if (isTechnicianView) {
              return `
                <div class="table-card" style="padding: 16px; display: flex; align-items: center; gap: 14px;">
                  ${person.photoUrl ? `
                    <img src="${person.photoUrl}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;" alt="">
                  ` : `
                    <div class="user-avatar-circle" style="width: 46px; height: 46px; font-size: 15px; background: ${roleBadgeColor};">
                      ${initials}
                    </div>
                  `}
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">${escapeHtml(person.fullName)}</div>
                      <span class="status-pill ${isActive ? 'status-instock' : 'status-reorder'}" style="font-size: 9.5px;">
                        ${isActive ? 'Active' : 'Away'}
                      </span>
                    </div>
                    <div style="font-size: 11.5px; color: #38bdf8; font-weight: 600; margin-top: 2px;">
                      ${escapeHtml(person.designation || ROLE_LABELS[person.role] || person.role)}
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <span>${escapeHtml(person.phone || 'No Phone')}</span>
                    </div>
                  </div>
                </div>
              `;
            }

            // Full Operational Card for Managers / Admins
            const personJobs = jobs.filter(j => (j.assignees || []).some(a => a.employeeId === person.employeeCode || a.employeeId === person.id));
            const completedJobs = personJobs.filter(j => j.status === 'Completed' || j.status === 'Verified');
            const totalPoints = completedJobs.reduce((sum, j) => sum + (Number(j.pointsCount) || 0), 0);

            const personPayouts = payouts.filter(p => p.employeeId === person.employeeCode || p.employeeId === person.id);
            const totalEarned = personPayouts
              .filter(p => p.direction === 'CR' || p.type === 'Job Earning' || p.type === 'Bonus' || p.type === 'Salary')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const totalPaid = personPayouts.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
            const netBalance = totalEarned - totalPaid;

            let onTimeJobs = 0;
            completedJobs.forEach(j => {
              if (j.scheduledEnd && j.actualEnd) {
                if (new Date(j.actualEnd) <= new Date(j.scheduledEnd)) onTimeJobs++;
              } else {
                onTimeJobs++;
              }
            });
            const onTimePct = completedJobs.length > 0 ? Math.round((onTimeJobs / completedJobs.length) * 100) : 100;

            return `
              <div class="table-card" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <!-- Card Header -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${person.photoUrl ? `
                        <img src="${person.photoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;" alt="">
                      ` : `
                        <div class="user-avatar-circle" style="width: 40px; height: 40px; font-size: 14px; background: ${roleBadgeColor};">
                          ${initials}
                        </div>
                      `}
                      <div>
                        <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">${escapeHtml(person.fullName)}</div>
                        <div style="font-size: 11.5px; color: #38bdf8; font-weight: 600;">${escapeHtml(person.designation || ROLE_LABELS[person.role] || person.role)}</div>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span class="status-pill ${isActive ? 'status-instock' : 'status-reorder'}" style="font-size: 10px;">
                        ${isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div style="font-family: monospace; font-size: 10px; color: var(--text-dim); margin-top: 2px;">
                        ${person.employeeCode}
                      </div>
                    </div>
                  </div>

                  <!-- Rate & Contact Details -->
                  <div style="background: var(--bg-card-subtle); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 11.5px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--text-dim);">Pay Basis:</span>
                      <strong>${person.payType} (${formatCurrency(person.defaultRate)}${person.payType === 'PerPoint' ? '/pt' : ''})</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="color: var(--text-dim);">Phone:</span>
                      <span>${escapeHtml(person.phone || '—')}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-dim);">UPI ID:</span>
                      <span style="font-family: monospace; color: #38bdf8;">${escapeHtml(person.upiId || '—')}</span>
                    </div>
                  </div>

                  <!-- Performance Stats -->
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; text-align: center;">
                    <div style="background: var(--bg-card-subtle); padding: 8px 4px; border-radius: var(--radius-sm);">
                      <div style="font-size: 14px; font-weight: 700; color: #34d399;">${completedJobs.length}</div>
                      <div style="font-size: 10px; color: var(--text-dim);">Jobs Done</div>
                    </div>
                    <div style="background: var(--bg-card-subtle); padding: 8px 4px; border-radius: var(--radius-sm);">
                      <div style="font-size: 14px; font-weight: 700; color: #38bdf8;">${totalPoints}</div>
                      <div style="font-size: 10px; color: var(--text-dim);">Points Mount</div>
                    </div>
                    <div style="background: var(--bg-card-subtle); padding: 8px 4px; border-radius: var(--radius-sm);">
                      <div style="font-size: 14px; font-weight: 700; color: ${onTimePct >= 90 ? '#34d399' : '#fbbf24'};">${onTimePct}%</div>
                      <div style="font-size: 10px; color: var(--text-dim);">On-Time %</div>
                    </div>
                  </div>
                </div>

                <!-- Footer Financials & Actions -->
                <div style="border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 10px; color: var(--text-dim);">Balance Due:</div>
                    <div style="font-size: 13px; font-weight: 700; color: ${netBalance > 0 ? '#fbbf24' : '#34d399'};">
                      ${formatCurrency(Math.abs(netBalance))} ${netBalance >= 0 ? 'Due' : 'Advance'}
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm view-profile-drawer-btn" data-person-id="${person.id}" style="font-size: 11px; padding: 3px 8px;">
                      Profile Sheet
                    </button>
                    ${isAdmin ? `
                      <button class="btn btn-secondary btn-sm edit-profile-drawer-btn" data-person-id="${person.id}" style="font-size: 11px; padding: 3px 8px;">
                        Edit
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    document.getElementById('empSearchInput')?.addEventListener('input', (e) => { searchQuery = e.target.value; renderView(); });
    document.getElementById('empRoleFilter')?.addEventListener('change', (e) => { roleFilter = e.target.value; renderView(); });
    document.getElementById('empActiveOnlyCheckbox')?.addEventListener('change', (e) => { activeOnly = e.target.checked; renderView(); });

    document.getElementById('navToAdminUsersBtn')?.addEventListener('click', () => {
      if (navigateTo) navigateTo('admin-users');
    });

    document.getElementById('addPersonBtn')?.addEventListener('click', () => {
      if (isSuperAdmin && navigateTo) {
        navigateTo('admin-users');
      } else {
        alert('To add new staff members, please contact a Super Admin or use the User Governance console.');
      }
    });

    // Profile and Edit buttons both open the comprehensive 5-tab Profile Drawer
    container.querySelectorAll('.view-profile-drawer-btn, .edit-profile-drawer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-person-id');
        openProfileDrawer(id, () => loadData());
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  loadData();
}
