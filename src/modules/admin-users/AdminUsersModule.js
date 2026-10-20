// Admin User & Workforce Governance Module (Super Admin Only)
// Complete CRUD, Single Source of Truth Synchronization, Administrative Safeguards,
// RBAC Matrix Configuration, Audit Trail & CSV Batch Operations.

import { auth } from '../../services/auth.js';
import { peopleService } from '../../services/peopleService.js';
import { permissionService } from '../../services/permissionService.js';
import { auditService } from '../../services/auditService.js';
import { ROLES, ROLE_LABELS, ROLE_BADGE_COLORS, normalizeRole, DEFAULT_PERMISSION_MATRIX } from '../../config/permissions.js';
import { openProfileDrawer } from '../profile/MyProfileModule.js';
import { formatCurrency, formatDate } from '../../store/db.js';

export async function renderAdminUsersModule(container, navigateTo) {
  const currentUser = auth.getCurrentUser();

  // Route Guard: Strictly Super Admin
  const routeCheck = permissionService.assertRouteAccess(currentUser, 'admin-users');
  if (!routeCheck.allowed) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; max-width: 580px; margin: 40px auto; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid #ef444450; box-shadow: 0 12px 30px rgba(0,0,0,0.3);">
        <div style="width: 64px; height: 64px; background: rgba(239, 68, 68, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #ef4444;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 style="font-size: 22px; font-weight: 800; color: #ef4444; margin-bottom: 8px;">403 Access Denied</h2>
        <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
          The User Management & Governance console is strictly restricted to <strong>Super Admin</strong> personnel. 
          Your current session is logged as <strong>${currentUser?.name || 'Guest'} (${currentUser?.role || 'Guest'})</strong>.
          This unauthorized attempt has been recorded in the security audit ledger.
        </p>
        <button id="backToDashBtn" class="btn btn-primary" style="padding: 8px 20px;">
          Return to Dashboard
        </button>
      </div>
    `;
    document.getElementById('backToDashBtn')?.addEventListener('click', () => {
      if (navigateTo) navigateTo('dashboard');
    });
    return;
  }

  await peopleService.init();

  // State Management
  let activeTab = 'directory'; // 'directory' | 'matrix' | 'audit' | 'reconciliation'
  let searchQuery = '';
  let roleFilter = 'ALL';
  let accessFilter = 'ALL';
  let employmentFilter = 'ALL';
  let departmentFilter = 'ALL';
  let sortField = 'fullName';
  let sortAsc = true;
  let currentPage = 1;
  const pageSize = 12;
  let selectedPersonIds = new Set();

  let visibleColumns = {
    employeeCode: true,
    person: true,
    role: true,
    department: true,
    accessStatus: true,
    employmentStatus: true,
    canBeAssignedJobs: true,
    payRate: true,
    lastLogin: true,
    actions: true
  };

  async function refreshDataAndRender() {
    renderMainLayout();
  }

  function getFilteredAndSortedPeople(allPeople) {
    let list = [...allPeople];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.fullName && p.fullName.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.employeeCode && p.employeeCode.toLowerCase().includes(q)) ||
        (p.designation && p.designation.toLowerCase().includes(q))
      );
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      list = list.filter(p => p.role === roleFilter);
    }

    // Access status filter
    if (accessFilter !== 'ALL') {
      if (accessFilter === 'NO_LOGIN') {
        list = list.filter(p => p.accessStatus === 'NONE' || !p.authUserId);
      } else {
        list = list.filter(p => p.accessStatus === accessFilter);
      }
    }

    // Employment status filter
    if (employmentFilter !== 'ALL') {
      list = list.filter(p => p.employmentStatus === employmentFilter);
    }

    // Department filter
    if (departmentFilter !== 'ALL') {
      list = list.filter(p => p.department === departmentFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let vA = a[sortField] || '';
      let vB = b[sortField] || '';
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }

  async function renderMainLayout() {
    const allPeople = await peopleService.list();
    const filteredPeople = getFilteredAndSortedPeople(allPeople);

    // Pagination calculations
    const totalItems = filteredPeople.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedPeople = filteredPeople.slice(startIndex, startIndex + pageSize);

    // Live Metrics for Overview Strip
    const totalCount = allPeople.length;
    const activeCount = allPeople.filter(p => p.accessStatus === 'ACTIVE' && p.employmentStatus === 'ACTIVE').length;
    const invitedCount = allPeople.filter(p => p.accessStatus === 'INVITED').length;
    const suspendedCount = allPeople.filter(p => p.accessStatus === 'SUSPENDED').length;
    const exitedCount = allPeople.filter(p => p.employmentStatus === 'EXITED').length;
    const noLoginCount = allPeople.filter(p => p.accessStatus === 'NONE' || !p.authUserId).length;
    
    // Sessions & Lockouts from authAdapter
    const sessions = peopleService.authAdapter._getSessions();
    const now = Date.now();
    const loggedIn24hCount = sessions.filter(s => (now - s.lastActive) < 24 * 60 * 60 * 1000).length;

    // Lockout count
    const attempts = peopleService.authAdapter._getAttempts();
    let lockedCount = 0;
    Object.values(attempts).forEach(att => {
      if (att.lockedUntil && att.lockedUntil > now) lockedCount++;
    });

    // Unique Departments
    const departments = Array.from(new Set(allPeople.map(p => p.department).filter(Boolean)));

    container.innerHTML = `
      <div class="admin-users-module" style="padding-bottom: 40px;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%); border-radius: var(--radius-lg); padding: 24px 28px; margin-bottom: 22px; border: 1px solid rgba(99, 102, 241, 0.25); box-shadow: 0 8px 24px rgba(0,0,0,0.35);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span class="status-pill" style="background: rgba(99, 102, 241, 0.25); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                  🛡 SUPER ADMIN CONTROL TOWER
                </span>
                <span style="font-size: 11px; color: #a5b4fc;">Enterprise Single-Identity Sync</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0;">
                User Management & Workforce Governance
              </h1>
              <p style="font-size: 13px; color: #cbd5e1; margin-top: 5px; max-width: 780px; line-height: 1.5;">
                Unified directory binding employee personnel records 1:1 with authentication identities. Real-time session revoking,
                hard administrative safeguards, granular RBAC matrix customization, and zero-loss audit preservation.
              </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="btnReconcileQuick" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px;" title="Check directory consistency and detect orphaned logins">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Reconciliation Center
              </button>
              <button id="btnBulkImport" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                CSV Batch Import
              </button>
              <button id="btnCreatePerson" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Create Person & Login
              </button>
            </div>
          </div>
        </div>

        <!-- Live Overview Metrics Strip (Section 6) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 12px; margin-bottom: 22px;">
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Total People</div>
            <div style="font-size: 22px; font-weight: 800; color: var(--text-main); margin-top: 4px;">${totalCount}</div>
            <div style="font-size: 10.5px; color: #818cf8; margin-top: 2px;">Unified Records</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Active Logins</div>
            <div style="font-size: 22px; font-weight: 800; color: #10b981; margin-top: 4px;">${activeCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">Full Access</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Pending Invites</div>
            <div style="font-size: 22px; font-weight: 800; color: #f59e0b; margin-top: 4px;">${invitedCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">Awaiting Token</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Suspended</div>
            <div style="font-size: 22px; font-weight: 800; color: #ef4444; margin-top: 4px;">${suspendedCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">Sessions Revoked</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Exited Staff</div>
            <div style="font-size: 22px; font-weight: 800; color: #64748b; margin-top: 4px;">${exitedCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">Ledger Preserved</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Without Login</div>
            <div style="font-size: 22px; font-weight: 800; color: #06b6d4; margin-top: 4px;">${noLoginCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">Helpers / Field</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Active 24h</div>
            <div style="font-size: 22px; font-weight: 800; color: #3b82f6; margin-top: 4px;">${loggedIn24hCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">Live Devices</div>
          </div>
          <div class="stat-card" style="padding: 14px 16px; border-radius: var(--radius-md); background: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Lockout / Failed</div>
            <div style="font-size: 22px; font-weight: 800; color: ${lockedCount > 0 ? '#ef4444' : '#10b981'}; margin-top: 4px;">${lockedCount}</div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">15-min Lockout</div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 20px;">
          <button class="btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-nav-btn" data-tab="directory" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 700;">
            Users & Workforce Directory
          </button>
          <button class="btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-nav-btn" data-tab="matrix" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 700;">
            Roles & Permission Matrix
          </button>
          <button class="btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-nav-btn" data-tab="audit" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 700;">
            Security & Audit Ledger
          </button>
          <button class="btn ${activeTab === 'reconciliation' ? 'btn-primary' : 'btn-secondary'} btn-sm tab-nav-btn" data-tab="reconciliation" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 700;">
            Reconciliation & Integrity
          </button>
        </div>

        <!-- Tab Body Container -->
        <div id="adminTabContent">
          ${renderTabContent(activeTab, allPeople, filteredPeople, paginatedPeople, departments, totalItems, totalPages, currentPage, pageSize, selectedPersonIds, visibleColumns)}
        </div>
      </div>
    `;

    attachMainEventListeners(allPeople, filteredPeople);
  }

  function renderTabContent(tab, allPeople, filteredPeople, paginatedPeople, departments, totalItems, totalPages, currentPage, pageSize, selectedPersonIds, visibleCols) {
    if (tab === 'directory') {
      return renderDirectoryTab(allPeople, filteredPeople, paginatedPeople, departments, totalItems, totalPages, currentPage, pageSize, selectedPersonIds, visibleCols);
    }
    if (tab === 'matrix') {
      return renderMatrixTab();
    }
    if (tab === 'audit') {
      return renderAuditTab();
    }
    if (tab === 'reconciliation') {
      return renderReconciliationTab();
    }
    return '';
  }

  // ------------------------------------------------------------------------
  // TAB 1: USERS & WORKFORCE DIRECTORY
  // ------------------------------------------------------------------------
  function renderDirectoryTab(allPeople, filteredPeople, paginatedPeople, departments, totalItems, totalPages, currentPage, pageSize, selectedPersonIds, visibleCols) {
    const startIndex = (currentPage - 1) * pageSize;
    const isAllSelected = paginatedPeople.length > 0 && paginatedPeople.every(p => selectedPersonIds.has(p.id));

    return `
      <div>
        <!-- Search & Filter Controls -->
        <div class="table-card" style="padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <!-- Search -->
            <div style="flex: 2; min-width: 240px; position: relative;">
              <input type="text" id="adminSearchInput" class="form-control" placeholder="Search by name, email, phone, employee code..." value="${escapeHtml(searchQuery)}" style="font-size: 12.5px; padding: 7px 12px 7px 32px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-dim);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>

            <!-- Role Filter -->
            <div style="min-width: 140px;">
              <select id="adminRoleFilter" class="form-control" style="font-size: 12px; padding: 7px 10px;">
                <option value="ALL" ${roleFilter === 'ALL' ? 'selected' : ''}>All Roles</option>
                ${Object.keys(ROLES).map(r => `
                  <option value="${r}" ${roleFilter === r ? 'selected' : ''}>${ROLE_LABELS[r] || r}</option>
                `).join('')}
              </select>
            </div>

            <!-- Access Status Filter -->
            <div style="min-width: 140px;">
              <select id="adminAccessFilter" class="form-control" style="font-size: 12px; padding: 7px 10px;">
                <option value="ALL" ${accessFilter === 'ALL' ? 'selected' : ''}>All Access Statuses</option>
                <option value="ACTIVE" ${accessFilter === 'ACTIVE' ? 'selected' : ''}>Active Login</option>
                <option value="INVITED" ${accessFilter === 'INVITED' ? 'selected' : ''}>Invited (Pending)</option>
                <option value="SUSPENDED" ${accessFilter === 'SUSPENDED' ? 'selected' : ''}>Suspended</option>
                <option value="DEACTIVATED" ${accessFilter === 'DEACTIVATED' ? 'selected' : ''}>Deactivated</option>
                <option value="NO_LOGIN" ${accessFilter === 'NO_LOGIN' ? 'selected' : ''}>No Login Access</option>
              </select>
            </div>

            <!-- Employment Filter -->
            <div style="min-width: 130px;">
              <select id="adminEmploymentFilter" class="form-control" style="font-size: 12px; padding: 7px 10px;">
                <option value="ALL" ${employmentFilter === 'ALL' ? 'selected' : ''}>All Employment</option>
                <option value="ACTIVE" ${employmentFilter === 'ACTIVE' ? 'selected' : ''}>Active Staff</option>
                <option value="ON_LEAVE" ${employmentFilter === 'ON_LEAVE' ? 'selected' : ''}>On Leave</option>
                <option value="EXITED" ${employmentFilter === 'EXITED' ? 'selected' : ''}>Exited Staff</option>
              </select>
            </div>

            <!-- Department Filter -->
            <div style="min-width: 130px;">
              <select id="adminDeptFilter" class="form-control" style="font-size: 12px; padding: 7px 10px;">
                <option value="ALL" ${departmentFilter === 'ALL' ? 'selected' : ''}>All Depts</option>
                ${departments.map(d => `
                  <option value="${escapeHtml(d)}" ${departmentFilter === d ? 'selected' : ''}>${escapeHtml(d)}</option>
                `).join('')}
              </select>
            </div>

            <!-- Action buttons: CSV Export & Column Chooser -->
            <div style="display: flex; gap: 6px; margin-left: auto;">
              <button id="btnExportUsersCsv" class="btn btn-secondary btn-sm" title="Export current filtered view as CSV">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export CSV
              </button>
            </div>
          </div>

          <!-- Bulk Action Bar (shows when >=1 row selected) -->
          ${selectedPersonIds.size > 0 ? `
            <div style="margin-top: 14px; padding: 10px 14px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-pill" style="background: #6366f1; color: #fff; font-size: 11px;">${selectedPersonIds.size} Selected</span>
                <span style="font-size: 12px; color: var(--text-main);">Perform batch administrative action:</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="btnBulkSuspend" class="btn btn-secondary btn-sm" style="color: #ef4444;">Suspend Logins</button>
                <button id="btnBulkReactivate" class="btn btn-secondary btn-sm" style="color: #10b981;">Reactivate</button>
                <button id="btnBulkResendInvites" class="btn btn-secondary btn-sm">Resend Invites</button>
                <button id="btnBulkClearSelection" class="btn btn-secondary btn-sm">Clear</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Table View -->
        <div class="table-card" style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); background: var(--bg-card-subtle);">
                <th style="width: 38px; padding: 12px 10px; text-align: center;">
                  <input type="checkbox" id="selectAllCheckbox" ${isAllSelected ? 'checked' : ''}>
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim); cursor: pointer;" data-sort="employeeCode">
                  Code ${renderSortIcon('employeeCode', sortField, sortAsc)}
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim); cursor: pointer;" data-sort="fullName">
                  Person & Contact ${renderSortIcon('fullName', sortField, sortAsc)}
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim); cursor: pointer;" data-sort="role">
                  Role & Title ${renderSortIcon('role', sortField, sortAsc)}
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">
                  Access / Account
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">
                  Employment
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">
                  Dispatch / Rate
                </th>
                <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim); cursor: pointer;" data-sort="joinDate">
                  Joined ${renderSortIcon('joinDate', sortField, sortAsc)}
                </th>
                <th style="padding: 12px 14px; text-align: right; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">
                  Administrative Actions
                </th>
              </tr>
            </thead>
            <tbody>
              ${paginatedPeople.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-dim);">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">No user profiles match the selected criteria</div>
                    <div style="font-size: 12px;">Try clearing filters or search by a different term.</div>
                  </td>
                </tr>
              ` : paginatedPeople.map(p => {
                const roleBadgeColor = ROLE_BADGE_COLORS[p.role] || '#3b82f6';
                const isSelected = selectedPersonIds.has(p.id);
                const isCurrent = (currentUser?.id === p.authUserId || currentUser?.email === p.email);

                return `
                  <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s; ${isSelected ? 'background: rgba(99, 102, 241, 0.05);' : ''}">
                    <td style="padding: 12px 10px; text-align: center;">
                      <input type="checkbox" class="person-row-checkbox" data-id="${p.id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td style="padding: 12px 10px; font-family: monospace; font-size: 11.5px; font-weight: 700; color: #818cf8;">
                      ${p.employeeCode}
                    </td>
                    <td style="padding: 12px 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        ${p.photoUrl ? `
                          <img src="${p.photoUrl}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);" alt="">
                        ` : `
                          <div class="user-avatar-circle" style="width: 34px; height: 34px; font-size: 12px; background: ${roleBadgeColor};">
                            ${(p.displayName || p.fullName).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                        `}
                        <div>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-weight: 700; font-size: 13px; color: var(--text-main);">${escapeHtml(p.fullName)}</span>
                            ${isCurrent ? `<span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 9px; padding: 1px 5px;">YOU</span>` : ''}
                          </div>
                          <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(p.email || 'No Email')} &bull; ${escapeHtml(p.phone || '—')}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 12px 10px;">
                      <span class="status-pill" style="background: ${roleBadgeColor}20; color: ${roleBadgeColor}; border: 1px solid ${roleBadgeColor}40; font-size: 10.5px; margin-bottom: 2px;">
                        ${ROLE_LABELS[p.role] || p.role}
                      </span>
                      <div style="font-size: 11px; color: var(--text-dim);">${escapeHtml(p.designation || 'Staff')} (${escapeHtml(p.department || 'Operations')})</div>
                    </td>
                    <td style="padding: 12px 10px;">
                      ${renderAccessStatusPill(p.accessStatus)}
                      ${p.authUserId ? `
                        <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">ID: ${p.authUserId.substring(0, 10)}...</div>
                      ` : `
                        <div style="font-size: 10.5px; color: #f59e0b; margin-top: 2px;">Worker Profile Only</div>
                      `}
                    </td>
                    <td style="padding: 12px 10px;">
                      ${renderEmploymentStatusPill(p.employmentStatus)}
                    </td>
                    <td style="padding: 12px 10px;">
                      <div style="font-size: 12px; font-weight: 600; color: var(--text-main);">
                        ${p.payType} &bull; ${formatCurrency(p.defaultRate)}${p.payType === 'PerPoint' ? '/pt' : ''}
                      </div>
                      <div style="font-size: 10.5px; color: ${p.canBeAssignedJobs ? '#10b981' : '#64748b'};">
                        ${p.canBeAssignedJobs ? '✓ Assignable to Jobs' : '✗ Dispatch Blocked'}
                      </div>
                    </td>
                    <td style="padding: 12px 10px; font-size: 11.5px; color: var(--text-dim);">
                      ${formatDate(p.joinDate)}
                    </td>
                    <td style="padding: 12px 14px; text-align: right;">
                      <div style="display: flex; gap: 5px; justify-content: flex-end; align-items: center;">
                        <button class="btn btn-secondary btn-sm row-view-profile-btn" data-id="${p.id}" title="Open Full 5-Tab Profile Sheet" style="padding: 3px 8px; font-size: 11px;">
                          Profile
                        </button>
                        <button class="btn btn-secondary btn-sm row-edit-person-btn" data-id="${p.id}" title="Edit User & Operations" style="padding: 3px 8px; font-size: 11px;">
                          Edit
                        </button>
                        <div class="dropdown-action-container" style="position: relative; display: inline-block;">
                          <button class="btn btn-secondary btn-sm row-action-more-btn" data-id="${p.id}" style="padding: 3px 7px; font-size: 11px;">
                            &vellip;
                          </button>
                          <div class="row-action-menu" id="actionMenu_${p.id}" style="display: none; position: absolute; right: 0; top: 100%; width: 190px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 100; text-align: left; padding: 4px 0;">
                            ${p.accessStatus === 'SUSPENDED' ? `
                              <button class="action-menu-item btn-action-reactivate" data-id="${p.id}">✓ Reactivate Account</button>
                            ` : `
                              <button class="action-menu-item btn-action-suspend" data-id="${p.id}">⏸ Suspend Account</button>
                            `}
                            <button class="action-menu-item btn-action-reset-pwd" data-id="${p.id}">🔑 Reset Password</button>
                            <button class="action-menu-item btn-action-force-logout" data-id="${p.id}">⏻ Sign Out All Devices</button>
                            ${p.accessStatus === 'INVITED' ? `
                              <button class="action-menu-item btn-action-resend-invite" data-id="${p.id}">✉ Resend Invite</button>
                            ` : ''}
                            ${p.accessStatus === 'NONE' ? `
                              <button class="action-menu-item btn-action-grant-access" data-id="${p.id}">🔓 Grant Login Access</button>
                            ` : ''}
                            <div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>
                            <button class="action-menu-item btn-action-delete" data-id="${p.id}" style="color: #ef4444;">🗑 Delete / Archive</button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 4px; flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 12px; color: var(--text-dim);">
            Showing ${totalItems === 0 ? 0 : startIndex + 1} to ${Math.min(startIndex + pageSize, totalItems)} of ${totalItems} people
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button id="adminPrevPageBtn" class="btn btn-secondary btn-sm" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
            <span style="font-size: 12px; color: var(--text-main); font-weight: 600; padding: 0 6px;">Page ${currentPage} of ${totalPages}</span>
            <button id="adminNextPageBtn" class="btn btn-secondary btn-sm" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // TAB 2: ROLES & PERMISSION MATRIX (Section 4 & 6)
  // ------------------------------------------------------------------------
  function renderMatrixTab() {
    const matrix = permissionService.matrix;
    const resources = Object.keys(DEFAULT_PERMISSION_MATRIX);
    const roleKeys = Object.keys(ROLES);

    return `
      <div class="table-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
              Granular Role-Based Access Control (RBAC) Matrix
            </h3>
            <p style="font-size: 12.5px; color: var(--text-muted); margin: 0;">
              Super Admin live toggle control. Changes are audited immediately and enforced across both client-side route guards and data operations.
            </p>
          </div>
          <button id="btnResetMatrixDefaults" class="btn btn-secondary btn-sm" style="color: #f59e0b;">
            ↺ Reset Matrix to Defaults
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); background: var(--bg-card-subtle);">
                <th style="padding: 12px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim); min-width: 180px;">Resource Domain</th>
                ${roleKeys.map(rk => `
                  <th style="padding: 12px 10px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${ROLE_BADGE_COLORS[rk]}; min-width: 110px;">
                    ${ROLE_LABELS[rk]}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${resources.map(res => {
                const resRules = matrix[res] || {};
                const resLabel = res.replace(/_/g, ' ').toUpperCase();

                return `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 14px; font-weight: 700; color: var(--text-main);">
                      ${resLabel}
                    </td>
                    ${roleKeys.map(rk => {
                      const allowedActions = resRules[rk] || [];
                      const isSuperAdminRole = (rk === ROLES.SUPER_ADMIN);
                      const hasRead = allowedActions.includes('read') || allowedActions.includes('read_limited') || allowedActions.includes('read_own');
                      const hasWrite = allowedActions.includes('create') || allowedActions.includes('update') || allowedActions.includes('update_own');
                      const hasDelete = allowedActions.includes('delete');

                      return `
                        <td style="padding: 10px; text-align: center;">
                          ${isSuperAdminRole ? `
                            <span class="status-pill status-instock" style="font-size: 10px; font-weight: 700;">CRUD ALL</span>
                          ` : `
                            <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                              <label style="display: flex; align-items: center; gap: 4px; font-size: 10.5px; cursor: pointer;">
                                <input type="checkbox" class="matrix-toggle" data-resource="${res}" data-role="${rk}" data-action="read" ${hasRead ? 'checked' : ''}>
                                <span>Read</span>
                              </label>
                              <label style="display: flex; align-items: center; gap: 4px; font-size: 10.5px; cursor: pointer;">
                                <input type="checkbox" class="matrix-toggle" data-resource="${res}" data-role="${rk}" data-action="update" ${hasWrite ? 'checked' : ''}>
                                <span>Edit</span>
                              </label>
                              <label style="display: flex; align-items: center; gap: 4px; font-size: 10.5px; cursor: pointer;">
                                <input type="checkbox" class="matrix-toggle" data-resource="${res}" data-role="${rk}" data-action="delete" ${hasDelete ? 'checked' : ''}>
                                <span>Delete</span>
                              </label>
                            </div>
                          `}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // TAB 3: AUDIT & SECURITY LOG (Section 6)
  // ------------------------------------------------------------------------
  function renderAuditTab() {
    const logs = auditService.getLogs();

    return `
      <div class="table-card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
              Immutable Administrative & Security Audit Trail
            </h3>
            <p style="font-size: 12.5px; color: var(--text-muted); margin: 0;">
              Zero-loss chronological record tracking user mutations, role promotions, access suspensions, 403 blocks and session events.
            </p>
          </div>
          <button id="btnExportAuditLogCsv" class="btn btn-secondary btn-sm">
            Export Audit Log (CSV)
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); background: var(--bg-card-subtle);">
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Timestamp (IST)</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Actor</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Action Event</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Target</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Details</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: var(--text-dim);">Status</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-dim);">No audit events recorded yet.</td></tr>
              ` : logs.slice(0, 50).map(l => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: var(--text-dim); white-space: nowrap;">
                    ${formatDate(l.timestamp)} ${new Date(l.timestamp).toLocaleTimeString('en-IN')}
                  </td>
                  <td style="padding: 10px 12px; font-weight: 600; color: var(--text-main);">
                    ${escapeHtml(l.actorName)} <span style="font-size: 10.5px; color: var(--text-dim);">(${escapeHtml(l.actorRole)})</span>
                  </td>
                  <td style="padding: 10px 12px; font-weight: 700; color: ${l.action.includes('SECURITY') || l.action.includes('DENIED') ? '#ef4444' : (l.action.includes('DELETED') ? '#f97316' : '#38bdf8')};">
                    ${escapeHtml(l.action)}
                  </td>
                  <td style="padding: 10px 12px; color: var(--text-main);">
                    ${escapeHtml(l.targetName || l.targetId || '—')}
                  </td>
                  <td style="padding: 10px 12px; font-size: 11.5px; color: var(--text-muted); max-width: 320px;">
                    ${escapeHtml(l.details || '—')}
                  </td>
                  <td style="padding: 10px 12px; text-align: center;">
                    <span class="status-pill ${l.status === 'SUCCESS' ? 'status-instock' : 'status-reorder'}" style="font-size: 9.5px;">
                      ${l.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // TAB 4: RECONCILIATION & INTEGRITY (Section 3)
  // ------------------------------------------------------------------------
  function renderReconciliationTab() {
    const report = peopleService.getReconciliationReport();

    return `
      <div class="table-card" style="padding: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-main); margin: 0 0 4px 0;">
              Single Source of Truth Reconciliation Engine
            </h3>
            <p style="font-size: 12.5px; color: var(--text-muted); margin: 0;">
              Detects orphaned accounts, people without logins, duplicate identifiers, and sync mismatches between legacy tables and unified people.
            </p>
          </div>
          <button id="btnExecuteReconcile" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Execute 1-Click Sync & Reconcile
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 22px;">
          <div style="padding: 14px; background: var(--bg-card-subtle); border-radius: var(--radius-sm); border-left: 4px solid #10b981;">
            <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Integrity Status</div>
            <div style="font-size: 16px; font-weight: 700; color: ${report.isFullyReconciled ? '#10b981' : '#f59e0b'}; margin-top: 4px;">
              ${report.isFullyReconciled ? '✓ 100% In Sync' : '⚠ Discrepancies Detected'}
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Zero duplicate email conflicts</div>
          </div>
          <div style="padding: 14px; background: var(--bg-card-subtle); border-radius: var(--radius-sm); border-left: 4px solid #3b82f6;">
            <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">People Without Login</div>
            <div style="font-size: 16px; font-weight: 700; color: #3b82f6; margin-top: 4px;">
              ${report.peopleWithoutLogin.length} records
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Worker-only profiles (no auth)</div>
          </div>
          <div style="padding: 14px; background: var(--bg-card-subtle); border-radius: var(--radius-sm); border-left: 4px solid #ef4444;">
            <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Suspended Records</div>
            <div style="font-size: 16px; font-weight: 700; color: #ef4444; margin-top: 4px;">
              ${report.peopleSuspended.length} accounts
            </div>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Login blocked & sessions killed</div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 18px;">
          <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 10px;">
            People Without Login Access (Worker Profiles)
          </h4>
          ${report.peopleWithoutLogin.length === 0 ? `
            <div style="font-size: 12px; color: var(--text-dim);">All people records currently have linked authentication accounts.</div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
              ${report.peopleWithoutLogin.map(p => `
                <div style="padding: 10px 12px; background: var(--bg-card-subtle); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);">
                  <div>
                    <div style="font-size: 12.5px; font-weight: 700; color: var(--text-main);">${escapeHtml(p.fullName)}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">${p.employeeCode} &bull; ${escapeHtml(p.designation || p.role)}</div>
                  </div>
                  <button class="btn btn-secondary btn-sm btn-reconcile-grant-access" data-id="${p.id}" style="font-size: 11px; padding: 3px 8px;">
                    Grant Access
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // HELPER RENDERS & EVENT ATTACHMENTS
  // ------------------------------------------------------------------------
  function renderSortIcon(field, currentSort, currentAsc) {
    if (field !== currentSort) return '';
    return currentAsc ? '▲' : '▼';
  }

  function renderAccessStatusPill(status) {
    switch (status) {
      case 'ACTIVE':
        return `<span class="status-pill status-instock" style="font-size: 10px;">● ACTIVE</span>`;
      case 'INVITED':
        return `<span class="status-pill" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 10px;">✉ INVITED</span>`;
      case 'SUSPENDED':
        return `<span class="status-pill status-reorder" style="font-size: 10px;">⏸ SUSPENDED</span>`;
      case 'DEACTIVATED':
        return `<span class="status-pill" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.4); font-size: 10px;">⊘ DEACTIVATED</span>`;
      case 'NONE':
      default:
        return `<span class="status-pill" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); font-size: 10px;">NO LOGIN</span>`;
    }
  }

  function renderEmploymentStatusPill(status) {
    switch (status) {
      case 'ACTIVE':
        return `<span style="font-size: 11px; color: #10b981; font-weight: 600;">Active Duty</span>`;
      case 'ON_LEAVE':
        return `<span style="font-size: 11px; color: #f59e0b; font-weight: 600;">On Leave</span>`;
      case 'EXITED':
        return `<span style="font-size: 11px; color: #ef4444; font-weight: 600;">Exited Staff</span>`;
      default:
        return `<span style="font-size: 11px; color: var(--text-dim);">${status}</span>`;
    }
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

  // ------------------------------------------------------------------------
  // EVENT LISTENERS BINDING
  // ------------------------------------------------------------------------
  function attachMainEventListeners(allPeople, filteredPeople) {
    // Navigation Tabs
    container.querySelectorAll('.tab-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderMainLayout();
      });
    });

    // Create Person Button
    document.getElementById('btnCreatePerson')?.addEventListener('click', () => {
      openCreatePersonModal(refreshDataAndRender);
    });

    // Bulk Import Button
    document.getElementById('btnBulkImport')?.addEventListener('click', () => {
      openBulkImportModal(refreshDataAndRender);
    });

    // Reconciliation Quick / Tab Button
    document.getElementById('btnReconcileQuick')?.addEventListener('click', () => {
      activeTab = 'reconciliation';
      renderMainLayout();
    });

    if (activeTab === 'directory') {
      // Search Input
      const searchInput = document.getElementById('adminSearchInput');
      searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        renderMainLayout();
      });

      // Role Filter
      document.getElementById('adminRoleFilter')?.addEventListener('change', (e) => {
        roleFilter = e.target.value;
        currentPage = 1;
        renderMainLayout();
      });

      // Access Filter
      document.getElementById('adminAccessFilter')?.addEventListener('change', (e) => {
        accessFilter = e.target.value;
        currentPage = 1;
        renderMainLayout();
      });

      // Employment Filter
      document.getElementById('adminEmploymentFilter')?.addEventListener('change', (e) => {
        employmentFilter = e.target.value;
        currentPage = 1;
        renderMainLayout();
      });

      // Department Filter
      document.getElementById('adminDeptFilter')?.addEventListener('change', (e) => {
        departmentFilter = e.target.value;
        currentPage = 1;
        renderMainLayout();
      });

      // Sort Columns
      container.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const field = th.getAttribute('data-sort');
          if (sortField === field) {
            sortAsc = !sortAsc;
          } else {
            sortField = field;
            sortAsc = true;
          }
          renderMainLayout();
        });
      });

      // Pagination Controls
      document.getElementById('adminPrevPageBtn')?.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderMainLayout();
        }
      });

      document.getElementById('adminNextPageBtn')?.addEventListener('click', () => {
        currentPage++;
        renderMainLayout();
      });

      // Select All Checkbox
      document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const pagePeople = getFilteredAndSortedPeople(allPeople).slice((currentPage - 1) * pageSize, currentPage * pageSize);
        pagePeople.forEach(p => {
          if (checked) selectedPersonIds.add(p.id);
          else selectedPersonIds.delete(p.id);
        });
        renderMainLayout();
      });

      // Individual Row Checkbox
      container.querySelectorAll('.person-row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const id = cb.getAttribute('data-id');
          if (e.target.checked) selectedPersonIds.add(id);
          else selectedPersonIds.delete(id);
          renderMainLayout();
        });
      });

      // Clear selection
      document.getElementById('btnBulkClearSelection')?.addEventListener('click', () => {
        selectedPersonIds.clear();
        renderMainLayout();
      });

      // Bulk Suspend
      document.getElementById('btnBulkSuspend')?.addEventListener('click', async () => {
        if (!confirm(`Are you sure you want to suspend login access for ${selectedPersonIds.size} users? Their active sessions will be terminated immediately.`)) return;
        for (const id of selectedPersonIds) {
          try {
            await peopleService.updatePerson(id, { accessStatus: 'SUSPENDED' });
          } catch (e) {
            console.error('Bulk suspend error on', id, e);
          }
        }
        selectedPersonIds.clear();
        alert('Bulk suspension complete.');
        refreshDataAndRender();
      });

      // Bulk Reactivate
      document.getElementById('btnBulkReactivate')?.addEventListener('click', async () => {
        for (const id of selectedPersonIds) {
          try {
            await peopleService.updatePerson(id, { accessStatus: 'ACTIVE' });
          } catch (e) {
            console.error('Bulk reactivate error on', id, e);
          }
        }
        selectedPersonIds.clear();
        alert('Bulk reactivation complete.');
        refreshDataAndRender();
      });

      // Export CSV
      document.getElementById('btnExportUsersCsv')?.addEventListener('click', () => {
        exportPeopleToCsv(filteredPeople);
      });

      // Row Action: View Full Profile Drawer
      container.querySelectorAll('.row-view-profile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          openProfileDrawer(id, refreshDataAndRender);
        });
      });

      // Row Action: Edit Form Modal
      container.querySelectorAll('.row-edit-person-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const p = await peopleService.get(id);
          if (p) openEditPersonModal(p, refreshDataAndRender);
        });
      });

      // Row Action: More Menu Toggle
      container.querySelectorAll('.row-action-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const menu = document.getElementById(`actionMenu_${id}`);
          const isVisible = menu?.style.display === 'block';

          // Hide all other menus
          container.querySelectorAll('.row-action-menu').forEach(m => m.style.display = 'none');
          if (menu) menu.style.display = isVisible ? 'none' : 'block';
        });
      });

      // Close row menus on window click
      document.addEventListener('click', () => {
        container.querySelectorAll('.row-action-menu').forEach(m => m.style.display = 'none');
      });

      // Row Menu: Suspend / Reactivate
      container.querySelectorAll('.btn-action-suspend').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            await peopleService.updatePerson(id, { accessStatus: 'SUSPENDED' });
            alert('User login suspended and all active sessions revoked.');
            refreshDataAndRender();
          } catch (e) {
            alert(e.message);
          }
        });
      });

      container.querySelectorAll('.btn-action-reactivate').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            await peopleService.updatePerson(id, { accessStatus: 'ACTIVE' });
            alert('User login access reactivated.');
            refreshDataAndRender();
          } catch (e) {
            alert(e.message);
          }
        });
      });

      // Row Menu: Reset Password
      container.querySelectorAll('.btn-action-reset-pwd').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const p = await peopleService.get(id);
          if (!p || !p.email) {
            alert('Cannot reset password: this person has no registered email account.');
            return;
          }
          const tempPwd = `Eliza@${Math.floor(1000 + Math.random() * 9000)}`;
          const confirmReset = confirm(`Generate temporary password for ${p.fullName} (${p.email})?\n\nTemporary Password: ${tempPwd}\n\nThe user will be prompted to change their password on first login.`);
          if (confirmReset) {
            await peopleService.updatePerson(p.id, { mustChangePassword: true });
            auditService.log({
              actorName: currentUser.name,
              actorRole: currentUser.role,
              action: 'ADMIN_PASSWORD_RESET',
              targetType: 'PERSON',
              targetId: p.id,
              targetName: p.fullName,
              details: `Super Admin issued temporary password reset with mandatory change requirement.`
            });
            alert(`Temporary password set to: ${tempPwd}\nProvide this securely to ${p.fullName}.`);
            refreshDataAndRender();
          }
        });
      });

      // Row Menu: Force Logout All Devices
      container.querySelectorAll('.btn-action-force-logout').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const p = await peopleService.get(id);
          if (!p || !p.authUserId) {
            alert('This person has no active authentication identity.');
            return;
          }
          await peopleService.authAdapter.revokeSessions(p.authUserId);
          auditService.log({
            actorName: currentUser.name,
            actorRole: currentUser.role,
            action: 'SESSIONS_TERMINATED',
            targetType: 'PERSON',
            targetId: p.id,
            targetName: p.fullName,
            details: `Super Admin revoked all active login sessions across devices.`
          });
          alert(`All active sessions for ${p.fullName} have been revoked immediately.`);
        });
      });

      // Row Menu: Grant Access (for workers without login)
      container.querySelectorAll('.btn-action-grant-access, .btn-reconcile-grant-access').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const p = await peopleService.get(id);
          if (!p) return;
          const email = prompt(`Enter email address to grant login access to ${p.fullName}:`, p.email || `${p.employeeCode.toLowerCase()}@eliza.internal`);
          if (!email) return;

          try {
            await peopleService.updatePerson(p.id, {
              email: email.trim().toLowerCase(),
              accessStatus: 'ACTIVE',
              authUserId: `usr_${p.id.replace('per_', '')}`
            });
            alert(`Login access granted to ${p.fullName} with email ${email}.`);
            refreshDataAndRender();
          } catch (e) {
            alert(e.message);
          }
        });
      });

      // Row Menu: Delete / Archive (Strict Safeguards)
      container.querySelectorAll('.btn-action-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const p = await peopleService.get(id);
          if (!p) return;
          openDeleteSafeguardModal(p, refreshDataAndRender);
        });
      });
    }

    if (activeTab === 'matrix') {
      // Toggle Matrix Checkbox
      container.querySelectorAll('.matrix-toggle').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const res = chk.getAttribute('data-resource');
          const role = chk.getAttribute('data-role');
          const act = chk.getAttribute('data-action');
          permissionService.togglePermission(res, role, act, e.target.checked, currentUser);
        });
      });

      // Reset Matrix to Defaults
      document.getElementById('btnResetMatrixDefaults')?.addEventListener('click', () => {
        if (!confirm('Are you sure you want to reset all role permissions to the default system matrix?')) return;
        permissionService.resetToDefaults(currentUser);
        alert('Permission matrix reset to system defaults.');
        renderMainLayout();
      });
    }

    if (activeTab === 'audit') {
      document.getElementById('btnExportAuditLogCsv')?.addEventListener('click', () => {
        exportAuditLogToCsv(auditService.getLogs());
      });
    }

    if (activeTab === 'reconciliation') {
      document.getElementById('btnExecuteReconcile')?.addEventListener('click', () => {
        peopleService.reconcile();
        alert('Reconciliation executed successfully. Directory and legacy tables synchronized.');
        refreshDataAndRender();
      });
    }
  }

  // ------------------------------------------------------------------------
  // MODAL 1: CREATE PERSON & AUTH IDENTITY
  // ------------------------------------------------------------------------
  function openCreatePersonModal(onComplete) {
    const existing = document.getElementById('adminCreatePersonModal');
    if (existing) existing.remove();

    const nextCode = peopleService.getNextEmployeeCode();

    const modalHtml = `
      <div id="adminCreatePersonModal" class="modal-overlay" style="z-index: 10030;">
        <div class="modal-card" style="max-width: 680px; max-height: 92vh; display: flex; flex-direction: column;">
          <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="status-pill status-instock" style="font-size: 10px;">NEW IDENTITY</span>
              <h3 class="modal-title" style="margin: 0; font-size: 16px;">Create Person & User Profile</h3>
            </div>
            <button id="closeCreateModalBtn" class="modal-close-btn">&times;</button>
          </div>

          <form id="createPersonForm" style="display: flex; flex-direction: column; overflow-y: auto; flex: 1;">
            <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
              <!-- Code & Full Name -->
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Employee Code</label>
                  <input type="text" id="createEmpCode" class="form-control" value="${nextCode}" style="font-family: monospace; font-weight: 700;" readonly>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Full Legal Name *</label>
                  <input type="text" id="createFullName" class="form-control" placeholder="e.g. Ramesh Chandra" required>
                </div>
              </div>

              <!-- Email & Phone -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Work Email Address *</label>
                  <input type="email" id="createEmail" class="form-control" placeholder="ramesh@eliza.in" required>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Mobile Phone (10-Digit IN) *</label>
                  <input type="text" id="createPhone" class="form-control" placeholder="+91 98120-11223" required>
                </div>
              </div>

              <!-- Role & Designation -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">System RBAC Role *</label>
                  <select id="createRole" class="form-control" required>
                    ${Object.keys(ROLES).map(rk => `
                      <option value="${rk}" ${rk === ROLES.TECHNICIAN ? 'selected' : ''}>${ROLE_LABELS[rk]} (${rk})</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Official Designation</label>
                  <input type="text" id="createDesignation" class="form-control" placeholder="Lead CCTV Field Engineer">
                </div>
              </div>

              <!-- Department & Join Date -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Department</label>
                  <select id="createDepartment" class="form-control">
                    <option value="Field Operations">Field Operations</option>
                    <option value="Technical Services">Technical Services</option>
                    <option value="Commercial & Sales">Commercial & Sales</option>
                    <option value="Accounts & Finance">Accounts & Finance</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Join Date</label>
                  <input type="date" id="createJoinDate" class="form-control" value="${new Date().toISOString().slice(0, 10)}">
                </div>
              </div>

              <!-- Pay Type, Rate & Dispatch -->
              <div style="display: grid; grid-template-columns: 140px 140px 1fr; gap: 12px; align-items: flex-end;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Pay Type</label>
                  <select id="createPayType" class="form-control">
                    <option value="PerPoint">Per Point</option>
                    <option value="PerJob">Per Job</option>
                    <option value="Daily">Daily</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Default Rate (₹)</label>
                  <input type="number" id="createRate" class="form-control" value="600" min="0">
                </div>
                <div style="padding-bottom: 8px;">
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="createCanBeAssigned" checked>
                    <span>Eligible for Job Dispatch</span>
                  </label>
                </div>
              </div>

              <!-- Authentication & Login Access Options (Section 3) -->
              <div style="background: var(--bg-card-subtle); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-top: 6px;">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: block;">
                  Workspace Login Credentials
                </label>
                <div style="display: flex; gap: 16px; margin-bottom: 10px;">
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                    <input type="radio" name="createAccessType" value="INVITE" checked>
                    <span>Send Invite Link (expiring token)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                    <input type="radio" name="createAccessType" value="TEMP_PWD">
                    <span>Set Temporary Password</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                    <input type="radio" name="createAccessType" value="NONE">
                    <span>No Login (Worker profile only)</span>
                  </label>
                </div>

                <div id="tempPwdContainer" style="display: none; margin-top: 8px;">
                  <label class="form-label" style="font-size: 11px;">Temporary Password (min 10 chars)</label>
                  <input type="text" id="createTempPassword" class="form-control" value="Welcome@12345" style="font-family: monospace;">
                  <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 3px;">User will be forced to choose a new password upon first login.</div>
                </div>
              </div>
            </div>

            <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" id="cancelCreateBtn" class="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save & Synchronize Identity</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Toggle temp pwd box
    document.querySelectorAll('input[name="createAccessType"]').forEach(r => {
      r.addEventListener('change', () => {
        const val = document.querySelector('input[name="createAccessType"]:checked')?.value;
        const box = document.getElementById('tempPwdContainer');
        if (box) box.style.display = (val === 'TEMP_PWD') ? 'block' : 'none';
      });
    });

    // Close buttons
    const overlay = document.getElementById('adminCreatePersonModal');
    document.getElementById('closeCreateModalBtn')?.addEventListener('click', () => overlay.remove());
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => overlay.remove());

    // Submit
    document.getElementById('createPersonForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const accessType = document.querySelector('input[name="createAccessType"]:checked')?.value;
      const role = document.getElementById('createRole').value;
      const tempPwd = document.getElementById('createTempPassword')?.value;

      try {
        await peopleService.createPerson({
          employeeCode: document.getElementById('createEmpCode').value,
          fullName: document.getElementById('createFullName').value,
          email: document.getElementById('createEmail').value,
          phone: document.getElementById('createPhone').value,
          role,
          designation: document.getElementById('createDesignation').value,
          department: document.getElementById('createDepartment').value,
          joinDate: document.getElementById('createJoinDate').value,
          payType: document.getElementById('createPayType').value,
          defaultRate: Number(document.getElementById('createRate').value) || 0,
          canBeAssignedJobs: document.getElementById('createCanBeAssigned').checked,
          accessStatus: accessType === 'NONE' ? 'NONE' : (accessType === 'INVITE' ? 'INVITED' : 'ACTIVE')
        }, {
          sendInvite: accessType === 'INVITE',
          tempPassword: accessType === 'TEMP_PWD' ? tempPwd : null
        });

        alert('Person profile & auth credentials created successfully.');
        overlay.remove();
        if (onComplete) onComplete();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ------------------------------------------------------------------------
  // MODAL 2: EDIT PERSON PROFILE
  // ------------------------------------------------------------------------
  function openEditPersonModal(person, onComplete) {
    const existing = document.getElementById('adminEditPersonModal');
    if (existing) existing.remove();

    const isCurrent = (currentUser?.id === person.authUserId || currentUser?.email === person.email);

    const modalHtml = `
      <div id="adminEditPersonModal" class="modal-overlay" style="z-index: 10030;">
        <div class="modal-card" style="max-width: 680px; max-height: 92vh; display: flex; flex-direction: column;">
          <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="status-pill status-instock" style="font-size: 10px;">EDIT IDENTITY</span>
              <h3 class="modal-title" style="margin: 0; font-size: 16px;">Edit Profile: ${escapeHtml(person.fullName)}</h3>
            </div>
            <button id="closeEditModalBtn" class="modal-close-btn">&times;</button>
          </div>

          <form id="editPersonForm" style="display: flex; flex-direction: column; overflow-y: auto; flex: 1;">
            <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
              <!-- Code & Full Name -->
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Employee Code</label>
                  <input type="text" class="form-control" value="${person.employeeCode}" style="font-family: monospace; font-weight: 700;" readonly>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Full Legal Name *</label>
                  <input type="text" id="editFullName" class="form-control" value="${escapeHtml(person.fullName)}" required>
                </div>
              </div>

              <!-- Email & Phone -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Email Address *</label>
                  <input type="email" id="editEmail" class="form-control" value="${escapeHtml(person.email || '')}" required>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Mobile Phone *</label>
                  <input type="text" id="editPhone" class="form-control" value="${escapeHtml(person.phone || '')}" required>
                </div>
              </div>

              <!-- Role & Designation -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">System RBAC Role *</label>
                  <select id="editRole" class="form-control" ${isCurrent ? 'disabled title="You cannot demote or change your own role."' : ''} required>
                    ${Object.keys(ROLES).map(rk => `
                      <option value="${rk}" ${normalizeRole(person.role) === rk ? 'selected' : ''}>${ROLE_LABELS[rk]} (${rk})</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Official Designation</label>
                  <input type="text" id="editDesignation" class="form-control" value="${escapeHtml(person.designation || '')}">
                </div>
              </div>

              <!-- Department & Employment Status -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Department</label>
                  <input type="text" id="editDepartment" class="form-control" value="${escapeHtml(person.department || 'Operations')}">
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Employment Status</label>
                  <select id="editEmploymentStatus" class="form-control">
                    <option value="ACTIVE" ${person.employmentStatus === 'ACTIVE' ? 'selected' : ''}>Active</option>
                    <option value="ON_LEAVE" ${person.employmentStatus === 'ON_LEAVE' ? 'selected' : ''}>On Leave</option>
                    <option value="EXITED" ${person.employmentStatus === 'EXITED' ? 'selected' : ''}>Exited Staff (Auto-Suspends)</option>
                  </select>
                </div>
              </div>

              <!-- Pay Type, Rate & Dispatch -->
              <div style="display: grid; grid-template-columns: 140px 140px 1fr; gap: 12px; align-items: flex-end;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Pay Type</label>
                  <select id="editPayType" class="form-control">
                    <option value="PerPoint" ${person.payType === 'PerPoint' ? 'selected' : ''}>Per Point</option>
                    <option value="PerJob" ${person.payType === 'PerJob' ? 'selected' : ''}>Per Job</option>
                    <option value="Daily" ${person.payType === 'Daily' ? 'selected' : ''}>Daily</option>
                    <option value="Monthly" ${person.payType === 'Monthly' ? 'selected' : ''}>Monthly</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Default Rate (₹)</label>
                  <input type="number" id="editRate" class="form-control" value="${person.defaultRate || 0}" min="0">
                </div>
                <div style="padding-bottom: 8px;">
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="editCanBeAssigned" ${person.canBeAssignedJobs ? 'checked' : ''}>
                    <span>Eligible for Job Dispatch</span>
                  </label>
                </div>
              </div>

              <!-- Access Status & UPI -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Workspace Login Access Status</label>
                  <select id="editAccessStatus" class="form-control" ${isCurrent ? 'disabled title="You cannot suspend yourself."' : ''}>
                    <option value="ACTIVE" ${person.accessStatus === 'ACTIVE' ? 'selected' : ''}>Active</option>
                    <option value="INVITED" ${person.accessStatus === 'INVITED' ? 'selected' : ''}>Invited</option>
                    <option value="SUSPENDED" ${person.accessStatus === 'SUSPENDED' ? 'selected' : ''}>Suspended</option>
                    <option value="DEACTIVATED" ${person.accessStatus === 'DEACTIVATED' ? 'selected' : ''}>Deactivated</option>
                    <option value="NONE" ${person.accessStatus === 'NONE' ? 'selected' : ''}>None (Worker Profile Only)</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 11px; font-weight: 700;">Payout UPI ID</label>
                  <input type="text" id="editUpiId" class="form-control" value="${escapeHtml(person.upiId || '')}" placeholder="username@bank">
                </div>
              </div>
            </div>

            <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" id="cancelEditBtn" class="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Update Record</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('adminEditPersonModal');
    document.getElementById('closeEditModalBtn')?.addEventListener('click', () => overlay.remove());
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => overlay.remove());

    document.getElementById('editPersonForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newRole = document.getElementById('editRole').value;

      // Role change confirmation warning dialog
      if (newRole !== person.role) {
        const confirmRoleChange = confirm(
          `Confirm Role Escalation / Transition:\n\n` +
          `You are changing ${person.fullName}'s role from ${person.role} to ${newRole}.\n` +
          `Their access rights across all modules will update immediately upon next request.\n\n` +
          `Proceed with role update?`
        );
        if (!confirmRoleChange) return;
      }

      try {
        const updates = {
          fullName: document.getElementById('editFullName').value,
          displayName: document.getElementById('editFullName').value,
          email: document.getElementById('editEmail').value,
          phone: document.getElementById('editPhone').value,
          designation: document.getElementById('editDesignation').value,
          department: document.getElementById('editDepartment').value,
          employmentStatus: document.getElementById('editEmploymentStatus').value,
          payType: document.getElementById('editPayType').value,
          defaultRate: Number(document.getElementById('editRate').value) || 0,
          canBeAssignedJobs: document.getElementById('editCanBeAssigned').checked,
          upiId: document.getElementById('editUpiId').value
        };

        if (!isCurrent) {
          updates.role = newRole;
          updates.accessStatus = document.getElementById('editAccessStatus').value;
        }

        const res = await peopleService.updatePerson(person.id, updates);
        if (res.warning) alert(res.warning);
        else alert('Person record updated successfully.');

        overlay.remove();
        if (onComplete) onComplete();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ------------------------------------------------------------------------
  // MODAL 3: DELETE / ARCHIVE SAFEGUARDS MODAL (Section 6)
  // ------------------------------------------------------------------------
  async function openDeleteSafeguardModal(person, onComplete) {
    const dependencies = await peopleService.checkPersonDependencies(person);
    const existing = document.getElementById('deleteSafeguardModal');
    if (existing) existing.remove();

    const isCurrent = (currentUser?.id === person.authUserId || currentUser?.email === person.email);

    const modalHtml = `
      <div id="deleteSafeguardModal" class="modal-overlay" style="z-index: 10030;">
        <div class="modal-card" style="max-width: 580px; padding: 24px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; color: #ef4444;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div>
              <h3 style="font-size: 18px; font-weight: 800; color: #ef4444; margin: 0;">
                Personnel Governance Safeguard
              </h3>
              <p style="font-size: 12px; color: var(--text-dim); margin: 2px 0 0 0;">
                Target: ${escapeHtml(person.fullName)} (${person.employeeCode})
              </p>
            </div>
          </div>

          ${isCurrent ? `
            <div style="padding: 14px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); font-size: 13px; color: #ef4444; margin-bottom: 16px;">
              🛡 <strong>Safeguard Active:</strong> You cannot delete or suspend your own Super Admin identity.
            </div>
            <div style="text-align: right;">
              <button id="closeDeleteSafeguardBtn" class="btn btn-secondary btn-sm">Close</button>
            </div>
          ` : `
            ${dependencies.hasDependencies ? `
              <!-- Person has historical activity (Cannot Hard Delete) -->
              <div style="padding: 14px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 12.5px; line-height: 1.5; color: var(--text-main);">
                <div style="font-weight: 700; color: #f59e0b; margin-bottom: 4px;">Historical Dependencies Detected:</div>
                This person is actively linked to <strong>${dependencies.summary}</strong>.
                Hard-deleting this record would corrupt technical audits, financial ledgers and warranty history.
                <div style="margin-top: 8px; color: var(--text-muted); font-size: 12px;">
                  Recommended Action: <strong>Archive / Anonymize</strong>. This permanently revokes login, grey-lists the user,
                  and replaces personal details with <em>Former Employee (${person.employeeCode})</em> while leaving all financial records intact.
                </div>
              </div>

              <div style="margin-bottom: 16px;">
                <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 4px;">
                  To confirm Archive, type the employee code <strong>${person.employeeCode}</strong>:
                </label>
                <input type="text" id="confirmDeleteCodeInput" class="form-control" placeholder="${person.employeeCode}" style="font-family: monospace;">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <button id="closeDeleteSafeguardBtn" class="btn btn-secondary btn-sm">Cancel</button>
                <div style="display: flex; gap: 8px;">
                  <button id="btnSoftDeactivateOnly" class="btn btn-secondary btn-sm">Just Deactivate</button>
                  <button id="btnConfirmArchive" class="btn btn-primary btn-sm" style="background: #f59e0b; border-color: #f59e0b;">Archive & Anonymize</button>
                </div>
              </div>
            ` : `
              <!-- Zero dependencies: Hard Delete Permitted -->
              <div style="padding: 14px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 12.5px; line-height: 1.5; color: var(--text-main);">
                <div style="font-weight: 700; color: #10b981; margin-bottom: 4px;">Zero Historical Dependencies Verified:</div>
                This user has no associated jobs, tickets, payouts, or ledger entries.
                A permanent hard delete is permitted.
              </div>

              <div style="margin-bottom: 16px;">
                <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 4px;">
                  To confirm permanent deletion, type the employee code <strong>${person.employeeCode}</strong>:
                </label>
                <input type="text" id="confirmDeleteCodeInput" class="form-control" placeholder="${person.employeeCode}" style="font-family: monospace;">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <button id="closeDeleteSafeguardBtn" class="btn btn-secondary btn-sm">Cancel</button>
                <button id="btnConfirmHardDelete" class="btn btn-primary btn-sm" style="background: #ef4444; border-color: #ef4444;">Permanently Delete Record</button>
              </div>
            `}
          `}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('deleteSafeguardModal');
    document.getElementById('closeDeleteSafeguardBtn')?.addEventListener('click', () => overlay.remove());

    // Soft Deactivate
    document.getElementById('btnSoftDeactivateOnly')?.addEventListener('click', async () => {
      try {
        await peopleService.updatePerson(person.id, { accessStatus: 'DEACTIVATED', canBeAssignedJobs: false });
        alert(`Account for ${person.fullName} has been soft-deactivated.`);
        overlay.remove();
        if (onComplete) onComplete();
      } catch (err) {
        alert(err.message);
      }
    });

    // Archive / Anonymize
    document.getElementById('btnConfirmArchive')?.addEventListener('click', async () => {
      const typed = document.getElementById('confirmDeleteCodeInput')?.value;
      try {
        await peopleService.archivePerson(person.id, typed);
        alert(`Person profile archived and anonymized as 'Former Employee (${person.employeeCode})'.`);
        overlay.remove();
        if (onComplete) onComplete();
      } catch (err) {
        alert(err.message);
      }
    });

    // Hard Delete
    document.getElementById('btnConfirmHardDelete')?.addEventListener('click', async () => {
      const typed = document.getElementById('confirmDeleteCodeInput')?.value;
      try {
        await peopleService.deletePerson(person.id, typed);
        alert('Person profile and auth identity permanently deleted.');
        overlay.remove();
        if (onComplete) onComplete();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ------------------------------------------------------------------------
  // MODAL 4: CSV BATCH IMPORT (Section 6 & 10)
  // ------------------------------------------------------------------------
  function openBulkImportModal(onComplete) {
    const existing = document.getElementById('adminBulkImportModal');
    if (existing) existing.remove();

    let parsedRows = [];

    const modalHtml = `
      <div id="adminBulkImportModal" class="modal-overlay" style="z-index: 10030;">
        <div class="modal-card" style="max-width: 740px; max-height: 90vh; display: flex; flex-direction: column;">
          <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="status-pill status-instock" style="font-size: 10px;">BATCH INGESTION</span>
              <h3 class="modal-title" style="margin: 0; font-size: 16px;">Bulk Import Personnel from CSV</h3>
            </div>
            <button id="closeBulkModalBtn" class="modal-close-btn">&times;</button>
          </div>

          <div class="modal-body" style="padding: 20px; overflow-y: auto; flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <p style="font-size: 12.5px; color: var(--text-muted); margin: 0;">
                Upload a UTF-8 CSV containing staff and technician records. A dry-run validation report will preview each row.
              </p>
              <button id="btnDownloadCsvTemplate" class="btn btn-secondary btn-sm" style="font-size: 11px;">
                Download Sample Template
              </button>
            </div>

            <div style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 24px; text-align: center; margin-bottom: 16px; background: var(--bg-card-subtle);">
              <input type="file" id="csvFileInput" accept=".csv" style="display: none;">
              <button type="button" id="triggerFileSelectBtn" class="btn btn-secondary btn-sm">Select CSV File</button>
              <div id="selectedFileName" style="font-size: 12px; color: var(--text-dim); margin-top: 8px;">No file selected</div>
            </div>

            <!-- Dry Run Preview Container -->
            <div id="dryRunPreviewContainer" style="display: none;">
              <h4 style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Dry Run Validation Report</h4>
              <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <thead>
                    <tr style="background: var(--bg-card-subtle); border-bottom: 1px solid var(--border-color);">
                      <th style="padding: 6px 10px; text-align: left;">Row</th>
                      <th style="padding: 6px 10px; text-align: left;">Name</th>
                      <th style="padding: 6px 10px; text-align: left;">Email</th>
                      <th style="padding: 6px 10px; text-align: left;">Role</th>
                      <th style="padding: 6px 10px; text-align: left;">Status</th>
                    </tr>
                  </thead>
                  <tbody id="dryRunTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div id="importSummaryText" style="font-size: 12px; color: var(--text-dim);"></div>
            <div style="display: flex; gap: 10px;">
              <button id="cancelBulkBtn" class="btn btn-secondary btn-sm">Cancel</button>
              <button id="btnCommitBulkImport" class="btn btn-primary btn-sm" disabled>Commit Valid Rows</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('adminBulkImportModal');
    document.getElementById('closeBulkModalBtn')?.addEventListener('click', () => overlay.remove());
    document.getElementById('cancelBulkBtn')?.addEventListener('click', () => overlay.remove());

    // Download template
    document.getElementById('btnDownloadCsvTemplate')?.addEventListener('click', () => {
      const template = "fullName,email,phone,role,designation,department,payType,defaultRate,canBeAssignedJobs\n" +
        "Ravi Verma,ravi.verma@eliza.in,9812345670,TECHNICIAN,Field Engineer,Field Operations,PerPoint,600,true\n" +
        "Pooja Sharma,pooja@eliza.in,9812345671,ACCOUNTS,Accountant,Accounts & Finance,Monthly,30000,false\n" +
        "Vikram Singh,vikram@eliza.in,9812345672,HELPER,Apprentice Helper,Field Operations,Daily,500,true";
      downloadBlob(template, 'eliza_people_import_template.csv', 'text/csv');
    });

    // File selection
    const fileInput = document.getElementById('csvFileInput');
    document.getElementById('triggerFileSelectBtn')?.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.getElementById('selectedFileName').textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        parsedRows = parseCsv(text);
        renderDryRunReport(parsedRows);
      };
      reader.readAsText(file);
    });

    function renderDryRunReport(rows) {
      const container = document.getElementById('dryRunPreviewContainer');
      const tbody = document.getElementById('dryRunTableBody');
      const commitBtn = document.getElementById('btnCommitBulkImport');
      const summaryText = document.getElementById('importSummaryText');

      if (!container || !tbody) return;
      container.style.display = 'block';

      let validCount = 0;
      tbody.innerHTML = rows.map((r, i) => {
        const isValid = r.valid;
        if (isValid) validCount++;

        return `
          <tr style="border-bottom: 1px solid var(--border-color); background: ${isValid ? 'transparent' : 'rgba(239, 68, 68, 0.08)'};">
            <td style="padding: 6px 10px; font-weight: 700;">#${i + 1}</td>
            <td style="padding: 6px 10px;">${escapeHtml(r.fullName || '—')}</td>
            <td style="padding: 6px 10px;">${escapeHtml(r.email || '—')}</td>
            <td style="padding: 6px 10px;">${escapeHtml(r.role || '—')}</td>
            <td style="padding: 6px 10px; color: ${isValid ? '#10b981' : '#ef4444'}; font-weight: 600;">
              ${isValid ? '✓ Valid' : `✗ ${r.error}`}
            </td>
          </tr>
        `;
      }).join('');

      summaryText.textContent = `${validCount} of ${rows.length} rows valid for ingestion.`;
      if (commitBtn) commitBtn.disabled = (validCount === 0);
    }

    // Commit Import
    document.getElementById('btnCommitBulkImport')?.addEventListener('click', async () => {
      const validRows = parsedRows.filter(r => r.valid);
      let imported = 0;

      for (const row of validRows) {
        try {
          await peopleService.createPerson({
            fullName: row.fullName,
            email: row.email,
            phone: row.phone,
            role: row.role,
            designation: row.designation || row.role,
            department: row.department || 'Field Operations',
            payType: row.payType || 'PerPoint',
            defaultRate: Number(row.defaultRate) || 600,
            canBeAssignedJobs: row.canBeAssignedJobs !== false,
            accessStatus: 'ACTIVE'
          }, { sendInvite: true });
          imported++;
        } catch (e) {
          console.error('Import error on row', row, e);
        }
      }

      alert(`Batch import complete. Ingested ${imported} person records.`);
      overlay.remove();
      if (onComplete) onComplete();
    });
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = parts[idx] || '';
      });

      // Validation
      let error = null;
      if (!obj.fullName) error = 'Missing full name';
      else if (!obj.email || !obj.email.includes('@')) error = 'Invalid email';
      else if (obj.role && !ROLES[normalizeRole(obj.role)]) error = 'Invalid role';

      rows.push({
        ...obj,
        role: normalizeRole(obj.role || ROLES.TECHNICIAN),
        valid: !error,
        error
      });
    }

    return rows;
  }

  function exportPeopleToCsv(peopleList) {
    const headers = ['EmployeeCode', 'FullName', 'Email', 'Phone', 'Role', 'Designation', 'Department', 'AccessStatus', 'EmploymentStatus', 'PayType', 'DefaultRate', 'CanBeAssignedJobs', 'JoinDate'];
    const rows = peopleList.map(p => [
      p.employeeCode,
      `"${(p.fullName || '').replace(/"/g, '""')}"`,
      p.email || '',
      p.phone || '',
      p.role || '',
      `"${(p.designation || '').replace(/"/g, '""')}"`,
      `"${(p.department || '').replace(/"/g, '""')}"`,
      p.accessStatus || '',
      p.employmentStatus || '',
      p.payType || '',
      p.defaultRate || 0,
      p.canBeAssignedJobs ? 'true' : 'false',
      p.joinDate || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `eliza_workforce_directory_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  }

  function exportAuditLogToCsv(logs) {
    const headers = ['Timestamp', 'ActorName', 'ActorRole', 'Action', 'TargetType', 'TargetId', 'TargetName', 'Status', 'Details'];
    const rows = logs.map(l => [
      l.timestamp,
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      l.actorRole || '',
      l.action || '',
      l.targetType || '',
      l.targetId || '',
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      l.status || '',
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `eliza_security_audit_log_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Initial render
  await renderMainLayout();
}
