// Settings, Company Profile, Help & Shortcuts & Hierarchical User Management Module
import { store } from '../services/store.js';
import { db } from '../store/db.js';
import { auth } from '../services/auth.js';
import { SHORTCUTS_REGISTRY, openShortcutsModal } from '../services/shortcuts.js';

export function renderSettingsModule(container) {
  let activeTab = 'hierarchy'; // 'hierarchy' | 'company' | 'fieldops' | 'accounting' | 'help'

  function updateView() {
    const company = store.state.company;
    const users = store.state.users;
    const currentUser = auth.getCurrentUser() || users[0];
    const isSuperAdmin = auth.isSuperAdmin() || currentUser.roleCode === 'ADMIN' || currentUser.level === 1;
    const isManager = currentUser.level === 2;
    const slaSettings = db.state.settings?.slaMatrix || {};
    const acctSettings = db.state.settings?.accounting || {};
    const isResetV1Done = !!(db.state.settings?.resetV1Done || (typeof localStorage !== 'undefined' && localStorage.getItem('ELIZA_RESET_V1_DONE') === 'true'));
    const rec = store.getReconciliationReport ? store.getReconciliationReport() : { accountsWithoutEmployees: [], employeesWithoutAccounts: [], linkedPairs: [], totalEmployees: 0, totalUsers: 0, isFullyReconciled: true };
    const partiesCount = (store.state.parties || []).length;
    const itemsCount = (store.state.items || []).length;

    // Group users by hierarchy level
    const l1Users = users.filter(u => u.level === 1 || u.roleCode === 'ADMIN');
    const l2Users = users.filter(u => u.level === 2);
    const l3Users = users.filter(u => u.level === 3);
    const l4Users = users.filter(u => u.level === 4);

    container.innerHTML = `
      <div class="settings-module-view">
        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.3); color: #93c5fd; margin-bottom: 6px;">
                ● ${isSuperAdmin ? 'SUPER ADMIN APEX GOVERNANCE & HIERARCHY' : 'DEPARTMENTAL OPERATIONS & STAFF DIRECTORY'}
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                ORGANIZATIONAL HIERARCHY, SHORTCUTS & CONFIGURATION
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Governed by Super Admin <strong>Aditya Sharma</strong> (Managing Director). Active Session: <strong>${currentUser.name}</strong> (${currentUser.title || currentUser.role}).
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <!-- My Profile Button for ALL ROLES -->
              <button id="myProfileBtn" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border: 1px solid #60a5fa;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                My Profile (${currentUser.name.split(' ')[0]})
              </button>

              ${isSuperAdmin ? `
                <button id="addHierarchyUserBtn" class="btn btn-secondary btn-sm" style="background: rgba(37, 99, 235, 0.2); border-color: #3b82f6; color: #93c5fd;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Add Team Member
                </button>
              ` : `
                <span class="badge-locked" style="padding: 6px 12px; font-size: 11.5px; border-radius: var(--radius-md);">
                  🔒 Staff Provisioning: MD/CEO Apex Only
                </span>
              `}

              <button id="backupJsonBtn" class="btn btn-secondary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Backup ERP (JSON)
              </button>
            </div>
          </div>
        </div>

        <!-- Tab Controls Bar -->
        <div style="display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; flex-wrap: wrap;">
          <button id="tabHierarchyBtn" class="btn btn-sm ${activeTab === 'hierarchy' ? 'btn-primary' : 'btn-secondary'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Organizational Hierarchy & User Access (${users.length} Users)
          </button>
          <button id="tabCompanyBtn" class="btn btn-sm ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Company Profile & Master Coordinates
          </button>
          <button id="tabFieldOpsBtn" class="btn btn-sm ${activeTab === 'fieldops' ? 'btn-primary' : 'btn-secondary'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            Field Operations, SLA Matrix & Rules
          </button>
          <button id="tabAccountingBtn" class="btn btn-sm ${activeTab === 'accounting' ? 'btn-primary' : 'btn-secondary'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            Accounting & Tax Variables
          </button>
          <button id="tabHelpBtn" class="btn btn-sm ${activeTab === 'help' ? 'btn-primary' : 'btn-secondary'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Help, Shortcuts & Support
          </button>
        </div>

        ${activeTab === 'hierarchy' ? `
          <!-- HIERARCHY TAB CONTENT -->

          <!-- Hierarchy KPI Summary Strip -->
          <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
            <div class="kpi-card teal">
              <span class="kpi-label">Apex Chief Executive</span>
              <div class="kpi-value" style="color: #2dd4bf; font-size: 20px;">Aditya Sharma</div>
              <div class="kpi-subtitle">Super Admin & Managing Director</div>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Direct Department Heads</span>
              <div class="kpi-value" style="color: #38bdf8;">${l2Users.length} Managers</div>
              <div class="kpi-subtitle">Operations & Commercial</div>
            </div>
            <div class="kpi-card green">
              <span class="kpi-label">Field & Technical Staff</span>
              <div class="kpi-value" style="color: #34d399;">${l3Users.length + l4Users.length} Specialists</div>
              <div class="kpi-subtitle">Engineering & Installations</div>
            </div>
            <div class="kpi-card amber">
              <span class="kpi-label">Active Organization Users</span>
              <div class="kpi-value" style="color: #fbbf24;">${users.filter(u => u.status === 'Active').length} Active</div>
              <div class="kpi-subtitle">${users.filter(u => u.status === 'Suspended').length} Suspended</div>
            </div>
          </div>

          <!-- Visual Hierarchy Tree / Organogram -->
          <div class="table-card" style="padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 700;">Organizational Reporting Organogram (Hierarchical Tree)</h3>
                <p style="font-size: 12px; color: var(--text-dim);">Top-down corporate reporting chain governed by Super Admin Aditya Sharma</p>
              </div>
              <span class="status-pill status-instock">Apex Top-Down Structure</span>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; gap: 24px; overflow-x: auto; padding: 20px 0;">
              <!-- Level 1: Apex Super Admin -->
              <div style="display: flex; flex-direction: column; align-items: center;">
                ${l1Users.map(u => `
                  <div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(13, 148, 136, 0.25)); border: 2px solid #3b82f6; border-radius: var(--radius-lg); padding: 16px 24px; width: 340px; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2); text-align: center; position: relative;">
                    <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #2563eb; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 10px; border-radius: 12px; text-transform: uppercase;">
                      L1 &bull; Apex Managing Director
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 4px;">
                      <div class="user-avatar-circle" style="width: 44px; height: 44px; font-size: 16px; background: ${u.badgeColor};">
                        ${u.avatar}
                      </div>
                      <div style="text-align: left;">
                        <div style="font-size: 15px; font-weight: 800; color: #ffffff;">${u.name}</div>
                        <div style="font-size: 11.5px; color: #38bdf8; font-weight: 600;">${u.title}</div>
                        <div style="font-size: 10.5px; color: var(--text-dim);">${u.department}</div>
                      </div>
                    </div>
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                      <span class="status-pill status-instock" style="font-size: 10.5px;">Super Admin (Full Access)</span>
                      <span style="font-size: 11px; color: var(--text-muted);">${users.filter(x => x.reportsTo === u.id).length} Direct Reports</span>
                    </div>
                  </div>
                `).join('')}

                <!-- Vertical Connector Line -->
                <div style="width: 2px; height: 30px; background: #3b82f6;"></div>
              </div>

              <!-- Level 2: Department Heads Grid -->
              <div style="position: relative; display: flex; justify-content: center; gap: 40px; width: 100%;">
                ${l2Users.map(u => {
                  const subs = users.filter(x => x.reportsTo === u.id);
                  return `
                    <div style="display: flex; flex-direction: column; align-items: center;">
                      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px 18px; width: 300px; box-shadow: var(--shadow-sm); position: relative;">
                        <div style="position: absolute; top: -9px; left: 16px; background: ${u.badgeColor}; color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 8px; border-radius: 10px;">
                          L2 &bull; Department Head
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                          <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 13px; background: ${u.badgeColor};">
                            ${u.avatar}
                          </div>
                          <div>
                            <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${u.name}</div>
                            <div style="font-size: 11px; color: #38bdf8;">${u.role}</div>
                            <div style="font-size: 10.5px; color: var(--text-dim);">${u.department}</div>
                          </div>
                        </div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-size: 10.5px; color: var(--text-dim);">Reports to: Aditya Sharma</span>
                          <span class="status-pill status-progress" style="font-size: 10px;">${subs.length} Subordinates</span>
                        </div>
                      </div>

                      ${subs.length > 0 ? `
                        <!-- Connector down to Level 3/4 -->
                        <div style="width: 2px; height: 24px; background: var(--border-color);"></div>

                        <!-- Subordinates List -->
                        <div style="display: flex; flex-direction: column; gap: 8px; width: 300px;">
                          ${subs.map(sub => `
                            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                              <div style="display: flex; align-items: center; gap: 8px;">
                                <div class="user-avatar-circle" style="width: 28px; height: 28px; font-size: 10px; background: ${sub.badgeColor};">
                                  ${sub.avatar}
                                </div>
                                <div>
                                  <div style="font-size: 12.5px; font-weight: 600; color: var(--text-main);">${sub.name}</div>
                                  <div style="font-size: 10.5px; color: var(--text-dim);">${sub.role} &bull; L${sub.level}</div>
                                </div>
                              </div>
                              <span class="status-pill ${sub.status === 'Active' ? 'status-instock' : 'status-reorder'}" style="font-size: 9.5px;">
                                ${sub.status}
                              </span>
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Comprehensive User Directory & Hierarchy Table with Role-Based Access Controls -->
          <div class="table-card">
            <div class="table-header-bar">
              <div class="table-title-group">
                <h3>Enterprise Team & Reporting Line Directory</h3>
                <p>
                  ${isSuperAdmin 
                    ? 'Super Admin Apex Access: Full authority to add, edit, suspend, and delete staff accounts.' 
                    : isManager 
                      ? 'Department Manager Access: You can manage your own profile and view subordinate/peer profiles in read-only mode.' 
                      : 'Staff Access: You can manage your personal contact and security profile.'}
                </p>
              </div>
            </div>

            <div class="table-responsive">
              <table class="erp-table">
                <thead>
                  <tr>
                    <th>User / Avatar</th>
                    <th>Username</th>
                    <th>Role & Scope</th>
                    <th class="text-center">Hierarchy Tier</th>
                    <th>Department</th>
                    <th>Reports To (Manager)</th>
                    <th>Contact Details</th>
                    <th class="text-center">Permissions</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Hierarchy Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(u => {
                    const isSelf = u.id === currentUser.id;
                    return `
                      <tr style="${isSelf ? 'background: rgba(59, 130, 246, 0.05);' : ''}">
                        <td>
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="user-avatar-circle" style="width: 34px; height: 34px; font-size: 12px; background: ${u.badgeColor}; flex-shrink: 0;">
                              ${u.avatar}
                            </div>
                            <div>
                              <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
                                ${u.name}
                                ${isSelf ? '<span class="status-pill status-instock" style="font-size: 9px; padding: 1px 6px;">You</span>' : ''}
                              </div>
                              <div style="font-size: 11px; color: var(--text-dim);">${u.title || u.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style="font-family: monospace; font-size: 12px; color: var(--blue-accent); font-weight: 600;">${u.username}</td>
                        <td style="font-weight: 600;">${u.role}</td>
                        <td class="text-center">
                          <span class="status-pill status-progress" style="font-size: 11px; font-weight: 700;">
                            ${u.levelName ? u.levelName.split(':')[0] : 'L' + (u.level || 1)}
                          </span>
                        </td>
                        <td style="font-size: 12px;">${u.department}</td>
                        <td style="font-size: 12px; color: ${u.reportsTo ? 'var(--text-main)' : '#34d399'}; font-weight: 500;">
                          ${u.reportsToName || 'Apex / Board of Directors'}
                        </td>
                        <td style="font-size: 11.5px; color: var(--text-dim);">
                          <div>${u.email}</div>
                          <div>${u.phone || '+91 89300-82398'}</div>
                        </td>
                        <td class="text-center">
                          <span class="status-pill status-progress" style="font-size: 10.5px;">
                            ${u.roleCode === 'ADMIN' ? 'All (11 Modules)' : (u.allowedModules ? u.allowedModules.length + ' Modules' : 'Limited')}
                          </span>
                        </td>
                        <td class="text-center">
                          <span class="status-pill ${u.status === 'Active' ? 'status-instock' : 'status-reorder'}">
                            ${u.status}
                          </span>
                        </td>
                        <td class="text-center" style="white-space: nowrap;">
                          ${isSelf ? `
                            <button class="btn btn-primary btn-sm edit-my-profile-btn" data-user-id="${u.id}" style="padding: 3px 9px; font-size: 11px;">
                              Edit My Profile
                            </button>
                          ` : isSuperAdmin ? `
                            <div style="display: inline-flex; align-items: center; gap: 5px;">
                              <button class="btn btn-secondary btn-sm edit-hierarchy-btn" data-user-id="${u.id}" style="padding: 2px 7px; font-size: 11px;">
                                Edit
                              </button>
                              <button class="btn btn-secondary btn-sm toggle-status-btn" data-user-id="${u.id}" style="padding: 2px 7px; font-size: 11px; color: ${u.status === 'Active' ? 'var(--red-accent)' : '#34d399'};">
                                ${u.status === 'Active' ? 'Suspend' : 'Activate'}
                              </button>
                              <button class="btn btn-secondary btn-sm delete-user-row-btn" data-user-id="${u.id}" style="padding: 2px 7px; font-size: 11px; color: var(--red-accent);" title="Remove team member">
                                Delete
                              </button>
                            </div>
                          ` : `
                            <div style="display: inline-flex; align-items: center; gap: 6px;">
                              <button class="btn btn-secondary btn-sm view-profile-btn" data-user-id="${u.id}" style="padding: 3px 8px; font-size: 11px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                View Profile
                              </button>
                              <span class="badge-locked" title="Department Managers and staff have read-only permissions for other profiles">🔒 View Only</span>
                            </div>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        ${activeTab === 'company' ? `
          <!-- COMPANY & MASTER SETTINGS TAB -->
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
            <!-- Left: Company Profile Settings Form -->
            <div class="table-card" style="padding: 22px;">
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Corporate Identity & Statutory Details</h3>
              <form id="companyProfileForm">
                <div class="form-group">
                  <label class="form-label">Company Legal Name</label>
                  <input type="text" id="compName" class="form-control" value="${company.name}" ${isSuperAdmin ? '' : 'disabled'} required>
                </div>
                <div class="form-group">
                  <label class="form-label">Business Tagline / Core Scope</label>
                  <input type="text" id="compTagline" class="form-control" value="${company.tagline}" ${isSuperAdmin ? '' : 'disabled'} required>
                </div>
                <div class="form-group">
                  <label class="form-label">Authorized Signatory / Managing Director</label>
                  <input type="text" id="compAuthPerson" class="form-control" value="${company.authorizedPerson || 'Aditya Sharma'}" ${isSuperAdmin ? '' : 'disabled'} required>
                </div>
                <div class="form-group">
                  <label class="form-label">Registered Office Address</label>
                  <input type="text" id="compAddress" class="form-control" value="${company.address}" ${isSuperAdmin ? '' : 'disabled'} required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div class="form-group">
                    <label class="form-label">GSTIN Identification Number</label>
                    <input type="text" id="compGstin" class="form-control" value="${company.gstin}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Income Tax Permanent A/c (PAN)</label>
                    <input type="text" id="compPan" class="form-control" value="${company.pan}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div class="form-group">
                    <label class="form-label">Official Contact Phone</label>
                    <input type="text" id="compPhone" class="form-control" value="${company.phone}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Official Email Address</label>
                    <input type="email" id="compEmail" class="form-control" value="${company.email}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
                  <div class="form-group">
                    <label class="form-label">Bank Name</label>
                    <input type="text" id="compBank" class="form-control" value="${company.bankName}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Account Number</label>
                    <input type="text" id="compAccount" class="form-control" value="${company.accountNo}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">IFSC Code</label>
                    <input type="text" id="compIfsc" class="form-control" value="${company.ifscCode}" ${isSuperAdmin ? '' : 'disabled'} required>
                  </div>
                </div>
                ${isSuperAdmin ? `
                  <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                    <button type="submit" class="btn btn-primary">Save Company Coordinates</button>
                  </div>
                ` : `
                  <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 10px; font-style: italic;">
                    🔒 Statutory coordinates can only be modified by Apex Managing Director Aditya Sharma.
                  </div>
                `}
              </form>
            </div>

            <!-- Right: Disaster Recovery & Data Governance -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <!-- Backup & Restore -->
              <div class="table-card" style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <h3 style="font-size: 15px; font-weight: 700;">Full ERP Database Backup (JSON)</h3>
                  <span class="status-pill status-instock" style="font-size: 10px;">Safe Offline JSON</span>
                </div>
                <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 14px;">
                  Export complete application state (parties, inventory, quotations, jobs, tickets, ledgers, users, companies) as portable JSON.
                </p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                  <button id="downloadBackupJsonBtn" class="btn btn-primary btn-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Full Backup (JSON)
                  </button>
                  ${isSuperAdmin ? `
                    <label class="btn btn-secondary btn-sm" style="cursor: pointer; margin: 0;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Restore from JSON
                      <input type="file" id="importJsonFileInput" accept=".json" style="display: none;">
                    </label>
                  ` : ''}
                </div>
              </div>

              <!-- Task 2: Clean-Slate Reset (One-Time Versioned Migration) -->
              <div class="table-card" style="padding: 20px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <h3 style="font-size: 15px; font-weight: 700; color: var(--red-accent);">Clean-Slate Reset (One-Time Migration)</h3>
                    <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Versioned migration flag: <code>resetV1Done</code></div>
                  </div>
                  <span class="status-pill ${isResetV1Done ? 'status-instock' : 'status-urgent'}" style="font-size: 10px;">
                    ${isResetV1Done ? 'Active: resetV1Done=true' : 'Pending Reset'}
                  </span>
                </div>
                <div style="background: var(--bg-card-subtle); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 12px; font-size: 11.5px; line-height: 1.6;">
                  <div>✔ <strong>KEPT:</strong> ${partiesCount} Party Masters & ${itemsCount} Inventory SKUs</div>
                  <div>⚡ <strong>RESET TO 0:</strong> Receivables, payables, customer/vendor balances, ledgers, payouts, transactions, and revenue KPIs</div>
                  <div>🗑 <strong>DELETED:</strong> Jobs, leads, service tickets, and staff except Owner (Aditya Sharma)</div>
                  <div style="color: #38bdf8; margin-top: 4px;">🛡 Full backup is automatically downloaded to disk before wipe.</div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                  ${isSuperAdmin ? `
                    <button id="executeCleanSlateResetBtn" class="btn btn-danger btn-sm">
                      Execute Clean-Slate Reset
                    </button>
                    <button id="resetFactoryBtn" class="btn btn-secondary btn-sm" style="font-size: 11px;">
                      Reset Factory Defaults
                    </button>
                  ` : `
                    <span class="badge-locked" style="padding: 6px 10px;">🔒 Reset Restricted to Owner</span>
                  `}
                </div>
              </div>

              <!-- Task 4: Employee <-> User Accounts Parity -->
              <div class="table-card" style="padding: 20px; border: 1px solid rgba(56, 189, 248, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <h3 style="font-size: 15px; font-weight: 700; color: #38bdf8;">Employee & Account Sync (Parity)</h3>
                  <span class="status-pill ${rec.isFullyReconciled ? 'status-instock' : 'status-reorder'}" style="font-size: 10px;">
                    ${rec.isFullyReconciled ? '100% In-Sync' : `${rec.accountsWithoutEmployees.length + rec.employeesWithoutAccounts.length} Mismatches`}
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 12px;">
                  <div style="background: var(--bg-card-subtle); padding: 6px 10px; border-radius: var(--radius-sm);">
                    <span style="color: var(--text-dim);">Users / Staff:</span>
                    <strong style="margin-left: 4px;">${rec.totalUsers} / ${rec.totalEmployees}</strong>
                  </div>
                  <div style="background: var(--bg-card-subtle); padding: 6px 10px; border-radius: var(--radius-sm);">
                    <span style="color: var(--text-dim);">Linked Pairs:</span>
                    <strong style="color: #34d399; margin-left: 4px;">${rec.linkedPairs.length}</strong>
                  </div>
                </div>
                ${!rec.isFullyReconciled ? `
                  <div style="font-size: 11px; color: #fbbf24; margin-bottom: 10px;">
                    Unlinked: ${rec.accountsWithoutEmployees.length} user accounts & ${rec.employeesWithoutAccounts.length} employee records.
                  </div>
                ` : ''}
                ${isSuperAdmin ? `
                  <button id="settingsReconcileBtn" class="btn btn-secondary btn-sm" style="border-color: #38bdf8; color: #38bdf8;">
                    Reconcile & Link Mismatches
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        ` : ''}

        ${activeTab === 'help' ? `
          <!-- HELP, KEYBOARD SHORTCUTS & SUPPORT TAB -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Top Support Hero Header -->
            <div style="background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-lg); padding: 22px 26px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div>
                <span class="status-pill status-instock" style="font-size: 10.5px; margin-bottom: 6px;">● KEYBOARD ACCELERATION & HELPDESK</span>
                <h3 style="font-size: 20px; font-weight: 800; color: #ffffff;">Keyboard Shortcuts Directory & Technical Support</h3>
                <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                  High-velocity ERP navigation, dialog management rules, and technical support coordinates.
                </p>
              </div>
              <button id="openShortcutsCheatSheetBtn" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.001"></path><path d="M10 8h.001"></path><path d="M14 8h.001"></path><path d="M18 8h.001"></path><path d="M8 12h.001"></path><path d="M12 12h.001"></path><path d="M16 12h.001"></path><path d="M7 16h10"></path></svg>
                Launch Shortcuts Modal (<kbd class="shortcut-key">?</kbd>)
              </button>
            </div>

            <!-- Shortcuts Directory Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px;">
              ${SHORTCUTS_REGISTRY.map(group => `
                <div class="shortcut-group-card">
                  <div class="shortcut-group-header">
                    <span style="font-size: 16px;">${group.icon}</span>
                    <span style="font-size: 14px; font-weight: 700;">${group.category}</span>
                  </div>
                  <div>
                    ${group.items.map(item => `
                      <div class="shortcut-row">
                        <span style="color: var(--text-main); font-size: 12.5px; font-weight: 500; max-width: 65%;">${item.desc}</span>
                        <div class="shortcut-combo">
                          ${item.key.split(' ').map(p => {
                            if (p === '+' || p === '/') return `<span style="color: var(--text-dim); font-size: 11px;">${p}</span>`;
                            return `<kbd class="shortcut-key">${p}</kbd>`;
                          }).join('')}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Role-Based Access Control Governance Matrix -->
            <div class="table-card" style="padding: 24px;">
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #38bdf8;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Role-Based Access Control & Profile Governance Rules
              </h3>
              <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 18px;">
                Enterprise security policies enforced across all Eliza Infotech CRM & ERP workflows
              </p>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: var(--radius-md); padding: 16px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 13px; font-weight: 800; color: #60a5fa;">Level 1 &bull; Super Admin (MD/CEO)</span>
                    <span class="status-pill status-instock" style="font-size: 9.5px;">Apex Sovereign</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-main); line-height: 1.5;">
                    Governed by <strong>Aditya Sharma</strong>. Full authority to create, edit, suspend, and delete any employee profile. Configures company statutory GSTIN coordinates, banking accounts, and database disaster recovery.
                  </div>
                </div>

                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 16px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 13px; font-weight: 800; color: #34d399;">Level 2 &bull; Department Heads / Managers</span>
                    <span class="badge-locked" style="font-size: 9.5px;">Subordinate Read-Only</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-main); line-height: 1.5;">
                    Operations & Commercial Managers (e.g. Sunil Verma, Amit Sharma). Can edit their personal profile credentials. Can view subordinate technicians and peer profiles in <strong>read-only</strong> mode, but <strong>cannot edit or delete them</strong>.
                  </div>
                </div>

                <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-md); padding: 16px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 13px; font-weight: 800; color: #c084fc;">Level 3/4 &bull; Technical Field Staff</span>
                    <span class="status-pill status-progress" style="font-size: 9.5px;">Self-Service Only</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-main); line-height: 1.5;">
                    Surveillance Specialists & Technicians (e.g. Deepak Saini, Manoj Kumar). Full profile self-management (Name, Contact, Password, Avatar) and view of direct reporting line. Restricted to assigned project and service logs.
                  </div>
                </div>
              </div>
            </div>

            <!-- Technical Support, Coordinates & Escalation -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px;">
              <div class="table-card" style="padding: 22px;">
                <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">Official Technical Support & Project Escalation</h3>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12.5px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="color: var(--text-dim); width: 140px;">24/7 Helpline:</span>
                    <strong style="color: #38bdf8; font-size: 14px;">+91 89300-82398</strong>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="color: var(--text-dim); width: 140px;">Technical Email:</span>
                    <span style="color: var(--text-main);">support@elizainfotech.com</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="color: var(--text-dim); width: 140px;">Executive Desk:</span>
                    <span style="color: var(--text-main);">aditya@elizainfotech.com</span>
                  </div>
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span style="color: var(--text-dim); width: 140px; flex-shrink: 0;">Headquarters:</span>
                    <span style="color: var(--text-main);">29/20, 8 Marla Colony, Near Radha-Krishna School, Jattal Road, Panipat, Haryana - 132103</span>
                  </div>
                </div>
              </div>

              <div class="table-card" style="padding: 22px;">
                <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">System Telemetry & Storage Quota</h3>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-dim);">Database Engine:</span>
                    <span style="color: var(--text-main); font-weight: 600;">HTML5 LocalStorage + Memory State</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-dim);">Live Leads Count:</span>
                    <span style="color: #38bdf8; font-weight: 700;">${store.state.leads?.length || 0} Opportunities</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-dim);">Saved Quotations:</span>
                    <span style="color: #34d399; font-weight: 700;">${store.state.savedQuotations?.length || 0} In Repository</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-dim);">Master SKUs Registered:</span>
                    <span style="color: #fbbf24; font-weight: 700;">${store.state.items?.length || 0} CCTV Hardware SKUs</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-dim);">System Release:</span>
                    <span class="status-pill status-instock" style="font-size: 10px;">v2.4 Enterprise Production</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${activeTab === 'fieldops' ? `
          <!-- Field Operations, SLA Matrix & Rules Tab -->
          <div class="fieldops-settings-section">
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 3px;">SLA Matrix, Operating Hours & Payout Rules</h4>
                <p style="font-size: 12px; color: var(--text-dim);">Configure response and resolution thresholds, business-hours calculation, and automated payout incentive rules.</p>
              </div>
              <button id="saveFieldOpsSettingsBtn" class="btn btn-primary btn-sm">Save Configuration</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
              <!-- SLA Matrix Card -->
              <div class="table-card" style="padding: 20px; margin-bottom: 0;">
                <h4 style="font-size: 14px; font-weight: 700; color: #38bdf8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  SLA Matrix Thresholds (Hours)
                </h4>
                <table class="erp-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th class="text-center">Response (Hours)</th>
                      <th class="text-center">Resolution (Hours)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span class="status-pill status-urgent">Critical</span></td>
                      <td class="text-center"><input type="number" id="slaCritResp" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.Critical?.responseHours || 1}" min="1"></td>
                      <td class="text-center"><input type="number" id="slaCritReso" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.Critical?.resolveHours || 4}" min="1"></td>
                    </tr>
                    <tr>
                      <td><span class="status-pill status-reorder">High</span></td>
                      <td class="text-center"><input type="number" id="slaHighResp" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.High?.responseHours || 2}" min="1"></td>
                      <td class="text-center"><input type="number" id="slaHighReso" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.High?.resolveHours || 12}" min="1"></td>
                    </tr>
                    <tr>
                      <td><span class="status-pill status-progress">Medium</span></td>
                      <td class="text-center"><input type="number" id="slaMedResp" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.Medium?.responseHours || 4}" min="1"></td>
                      <td class="text-center"><input type="number" id="slaMedReso" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.Medium?.resolveHours || 24}" min="1"></td>
                    </tr>
                    <tr>
                      <td><span class="status-pill status-instock">Low</span></td>
                      <td class="text-center"><input type="number" id="slaLowResp" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.Low?.responseHours || 8}" min="1"></td>
                      <td class="text-center"><input type="number" id="slaLowReso" class="form-control" style="width: 80px; text-align: center; margin: 0 auto;" value="${slaSettings.Low?.resolveHours || 48}" min="1"></td>
                    </tr>
                  </tbody>
                </table>

                <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 14px;">
                  <div style="margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                      <input type="checkbox" id="bizHoursToggle" ${db.state.settings?.businessHours?.enabled !== false ? 'checked' : ''}>
                      Business Hours Window (09:00 - 19:00, Mon - Sat)
                    </label>
                    <p style="font-size: 11px; color: var(--text-dim); margin-left: 24px;">SLA timers freeze overnight and on Sundays.</p>
                  </div>
                  <div>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                      <input type="checkbox" id="pauseOnWaitingToggle" ${db.state.settings?.pauseOnWaitingClient !== false ? 'checked' : ''}>
                      Pause Clock while Waiting Client
                    </label>
                    <p style="font-size: 11px; color: var(--text-dim); margin-left: 24px;">Clock halts automatically when ticket is in "Waiting Client" status.</p>
                  </div>
                </div>
              </div>

              <!-- Payout Rules & Incentive Engine -->
              <div class="table-card" style="padding: 20px; margin-bottom: 0;">
                <h4 style="font-size: 14px; font-weight: 700; color: #10b981; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Automated Payout Rules Engine
                </h4>
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">On-Time Completion Incentive (₹)</label>
                  <input type="number" id="payoutOnTimeBonus" class="form-control" value="${db.state.settings?.payoutRules?.onTimeBonus || 250}">
                  <span style="font-size: 11px; color: var(--text-dim);">Auto-credited as 'Incentive' when verified on or before scheduled end.</span>
                </div>
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">SLA Breach Penalty (₹)</label>
                  <input type="number" id="payoutSlaPenalty" class="form-control" value="${db.state.settings?.payoutRules?.slaBreachPenalty || 200}">
                  <span style="font-size: 11px; color: var(--text-dim);">Auto-deducted as 'Penalty' for breached tickets requiring rework.</span>
                </div>
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">Advance Auto-Recovery % from Next Earnings</label>
                  <input type="number" id="payoutAdvancePct" class="form-control" value="${db.state.settings?.payoutRules?.advanceRecoveryPct || 25}" min="0" max="100">
                  <span style="font-size: 11px; color: var(--text-dim);">Percentage of verified earnings allocated towards clearing outstanding advances.</span>
                </div>
              </div>
            </div>

            <!-- Standard Job Sheet Checklist Templates -->
            <div class="table-card" style="padding: 20px; margin-bottom: 24px;">
              <h4 style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 12px;">Standard Job Sheet Checklist Templates</h4>
              <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 14px;">Define standard multi-step quality protocols auto-loaded into Work Orders by job type.</p>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                ${['New Install', 'Upgrade', 'AMC Visit', 'Complaint Repair', 'Survey', 'Re-routing'].map(type => {
                  const list = (db.state.settings?.checklistTemplates || {})[type] || [];
                  return `
                    <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                      <div style="font-weight: 700; font-size: 13px; color: var(--text-main); margin-bottom: 6px;">${type}</div>
                      <textarea class="form-control checklist-template-textarea" data-type="${type}" rows="5" style="font-size: 11.5px; font-family: monospace;">${list.join('\n')}</textarea>
                      <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 4px;">One checklist item per line.</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Demo Data & Factory Reset Control -->
            <div class="table-card" style="padding: 20px; border: 1px solid rgba(239, 68, 68, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
                <div>
                  <h4 style="font-size: 14px; font-weight: 700; color: #ef4444; margin-bottom: 4px;">Demo Data & Factory Reset Control</h4>
                  <p style="font-size: 12px; color: var(--text-dim);">Reset localStorage to seed 12 realistic employees, 15 jobs, 12 SLA tickets, and reconciled double-entry ledgers.</p>
                </div>
                <button id="seedDemoDataBtn" class="btn btn-primary" style="background: #ef4444; border-color: #dc2626;">
                  🔄 Load Demo Data / Reset ERP
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        ${activeTab === 'accounting' ? `
          <!-- Accounting, Tax & Commercial Variables Configuration Tab -->
          <div class="accounting-settings-section">
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 3px; display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  Statutory GST, Discounts & Commercial Accounting Variables
                </h4>
                <p style="font-size: 12px; color: var(--text-dim); margin: 0;">
                  Configure system-wide defaults for GST taxation, quotation discounts, labor rates, and freight. All variables can be overridden per quotation in BOQ Studio.
                </p>
              </div>
              <button id="saveAccountingSettingsBtn" class="btn btn-primary btn-sm">Save Configuration</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
              <!-- Card 1: Statutory GST & Taxation Defaults -->
              <div class="table-card" style="padding: 20px; margin-bottom: 0;">
                <h4 style="font-size: 14px; font-weight: 700; color: #38bdf8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Statutory GST & Jurisdiction Defaults
                </h4>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="setGstEnabledByDefault" ${acctSettings.gstEnabled !== false ? 'checked' : ''}>
                    Enable GST on New Quotations by Default
                  </label>
                  <span style="font-size: 11px; color: var(--text-dim); margin-left: 24px;">If unchecked, new proposals will default to Non-GST / Tax-Exempt.</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Default GST Rate (%)</label>
                    <select id="setDefaultGstRate" class="form-control">
                      <option value="18" ${(acctSettings.defaultGstRate || 18) == 18 ? 'selected' : ''}>18% (Standard CCTV Surveillance)</option>
                      <option value="28" ${acctSettings.defaultGstRate == 28 ? 'selected' : ''}>28% (Monitors & Specialized Signage)</option>
                      <option value="12" ${acctSettings.defaultGstRate == 12 ? 'selected' : ''}>12% (IT / Turnkey Network)</option>
                      <option value="5" ${acctSettings.defaultGstRate == 5 ? 'selected' : ''}>5% (Essential Solar / Low Voltage)</option>
                      <option value="0" ${acctSettings.defaultGstRate == 0 ? 'selected' : ''}>0% (Exempt / Composite)</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Default Supply Regimen</label>
                    <select id="setDefaultTaxType" class="form-control">
                      <option value="intra" ${(acctSettings.defaultTaxType || 'intra') === 'intra' ? 'selected' : ''}>Intra-State (CGST 50% + SGST 50%)</option>
                      <option value="inter" ${acctSettings.defaultTaxType === 'inter' ? 'selected' : ''}>Inter-State (IGST 100%)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">Company GSTIN Identification</label>
                  <input type="text" id="setCompanyGstin" class="form-control" value="${company.gstin || '06HHQPS1919L1ZJ'}" style="font-family: monospace; font-weight: 700; text-transform: uppercase;">
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Non-GST / Tax-Exempt Declaration Template</label>
                  <textarea id="setTaxExemptDeclaration" class="form-control" rows="2" style="font-size: 11.5px;">${acctSettings.taxExemptDeclaration || 'Commercial supply exempt from GST under Composition / Non-taxable turnover schedule.'}</textarea>
                </div>
              </div>

              <!-- Card 2: Commercial Discounts & Additional Charges -->
              <div class="table-card" style="padding: 20px; margin-bottom: 0;">
                <h4 style="font-size: 14px; font-weight: 700; color: #10b981; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  Discounts, Labour Rates & Payment Terms
                </h4>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Default Proposal Discount (%)</label>
                    <input type="number" id="setDefaultDiscountPct" class="form-control" value="${acctSettings.defaultDiscountPct || 0}" min="0" max="100" step="0.5">
                    <span style="font-size: 11px; color: var(--text-dim);">Initial discount % applied on new proposals.</span>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Standard Labour Rate (₹ / Camera)</label>
                    <input type="number" id="setDefaultInstallRate" class="form-control" value="${acctSettings.defaultInstallationRatePerCam || 600}" min="0" step="50">
                    <span style="font-size: 11px; color: var(--text-dim);">Base installation charge per camera unit.</span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Default Shipping Charge (₹)</label>
                    <input type="number" id="setDefaultShippingCharge" class="form-control" value="${acctSettings.defaultShippingCharge || 0}" min="0" step="50">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Default Advance Required (%)</label>
                    <input type="number" id="setDefaultAdvancePct" class="form-control" value="${acctSettings.defaultAdvancePct || 50}" min="0" max="100">
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                    <input type="checkbox" id="setEnableRoundOff" ${acctSettings.enableRoundOff !== false ? 'checked' : ''}>
                    Auto Round-Off Grand Total to Nearest Rupee
                  </label>
                  <p style="font-size: 11px; color: var(--text-dim); margin-left: 24px; margin-top: 4px;">Eliminates odd paisa decimals from quotations and official proposals.</p>
                </div>
              </div>
            </div>

            <!-- Card 3: Statutory Terms & Conditions Template -->
            <div class="table-card" style="padding: 20px; margin-bottom: 24px;">
              <h4 style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 8px;">Standard Commercial Quotation Terms & Conditions</h4>
              <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 14px;">These statutory clauses automatically populate on printed A4 proposals.</p>
              <textarea id="setStatutoryTerms" class="form-control" rows="5" style="font-size: 12px; font-family: monospace;">${(acctSettings.statutoryTerms || [
                "Payment: 50% advance along with confirmed work order, balance 50% upon installation sign-off.",
                "Taxes: Goods & Services Tax (GST) charged @ 18% (9% CGST + 9% SGST) as statutory intra-state supply.",
                "Warranty: Comprehensive 2-Year On-Site Manufacturer Warranty on CP Plus Cams, DVR/NVR & WD Hard Disks.",
                "Delivery: Complete hardware mobilization within 3-5 business days upon order confirmation.",
                "Jurisdiction: All disputes subject to Panipat, Haryana jurisdiction only."
              ]).join('\n')}</textarea>
              <span style="font-size: 11px; color: var(--text-dim); margin-top: 4px; display: block;">One commercial condition clause per line.</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Tab switching event handlers
    document.getElementById('tabHierarchyBtn')?.addEventListener('click', () => {
      activeTab = 'hierarchy';
      updateView();
    });

    document.getElementById('tabCompanyBtn')?.addEventListener('click', () => {
      activeTab = 'company';
      updateView();
    });

    document.getElementById('tabFieldOpsBtn')?.addEventListener('click', () => {
      activeTab = 'fieldops';
      updateView();
    });

    document.getElementById('tabAccountingBtn')?.addEventListener('click', () => {
      activeTab = 'accounting';
      updateView();
    });

    document.getElementById('tabHelpBtn')?.addEventListener('click', () => {
      activeTab = 'help';
      updateView();
    });

    // Save Accounting Settings Handler
    document.getElementById('saveAccountingSettingsBtn')?.addEventListener('click', () => {
      if (!db.state.settings) db.state.settings = {};
      const termsRaw = document.getElementById('setStatutoryTerms')?.value || '';
      const terms = termsRaw.split('\n').map(t => t.trim()).filter(Boolean);

      db.state.settings.accounting = {
        gstEnabled: document.getElementById('setGstEnabledByDefault')?.checked ?? true,
        defaultGstRate: Number(document.getElementById('setDefaultGstRate')?.value) || 18,
        defaultTaxType: document.getElementById('setDefaultTaxType')?.value || 'intra',
        defaultDiscountPct: Number(document.getElementById('setDefaultDiscountPct')?.value) || 0,
        defaultInstallationRatePerCam: Number(document.getElementById('setDefaultInstallRate')?.value) || 600,
        defaultShippingCharge: Number(document.getElementById('setDefaultShippingCharge')?.value) || 0,
        defaultAdvancePct: Number(document.getElementById('setDefaultAdvancePct')?.value) || 50,
        enableRoundOff: document.getElementById('setEnableRoundOff')?.checked ?? true,
        taxExemptDeclaration: document.getElementById('setTaxExemptDeclaration')?.value.trim() || '',
        statutoryTerms: terms
      };

      const newGstin = document.getElementById('setCompanyGstin')?.value.trim();
      if (newGstin && store.state.company) {
        store.state.company.gstin = newGstin;
      }

      db._persist();
      store.saveState();
      alert('Accounting, Tax & Commercial Variables configuration saved successfully!');
      updateView();
    });

    // Launch shortcuts cheat sheet button (in Help tab)
    document.getElementById('openShortcutsCheatSheetBtn')?.addEventListener('click', () => {
      openShortcutsModal();
    });

    // Top banner My Profile button
    document.getElementById('myProfileBtn')?.addEventListener('click', () => {
      openMyProfileModal(currentUser, () => updateView());
    });

    // Add User Modal (MD/CEO only)
    document.getElementById('addHierarchyUserBtn')?.addEventListener('click', () => {
      openAddUserModal(() => updateView());
    });

    // Edit My Profile button (for self row in table)
    container.querySelectorAll('.edit-my-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-user-id');
        const target = users.find(u => u.id === id);
        if (target) openMyProfileModal(target, () => updateView());
      });
    });

    // View Profile button (for managers and staff viewing other profiles)
    container.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-user-id');
        const target = users.find(u => u.id === id);
        if (target) openViewOnlyUserProfileModal(target);
      });
    });

    // Edit User Modal (Super Admin only for editing other users)
    container.querySelectorAll('.edit-hierarchy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-user-id');
        const target = users.find(u => u.id === id);
        if (target) openEditUserModal(target, () => updateView());
      });
    });

    // Toggle status (Super Admin only)
    container.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-user-id');
        store.toggleUserStatus(id);
        updateView();
      });
    });

    // Delete user row button (Super Admin only)
    container.querySelectorAll('.delete-user-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-user-id');
        const target = users.find(u => u.id === id);
        if (target) {
          if (confirm(`Remove ${target.name} (${target.role}) from the organization? Any subordinates will be automatically reassigned to Super Admin Aditya Sharma.`)) {
            store.deleteUser(id);
            updateView();
          }
        }
      });
    });

    // Company profile submit
    document.getElementById('companyProfileForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isSuperAdmin) return;
      store.state.company = {
        name: document.getElementById('compName').value,
        tagline: document.getElementById('compTagline').value,
        authorizedPerson: document.getElementById('compAuthPerson').value,
        address: document.getElementById('compAddress').value,
        gstin: document.getElementById('compGstin').value,
        pan: document.getElementById('compPan').value,
        phone: document.getElementById('compPhone').value,
        email: document.getElementById('compEmail').value,
        bankName: document.getElementById('compBank').value,
        accountNo: document.getElementById('compAccount').value,
        ifscCode: document.getElementById('compIfsc').value,
        designation: "Managing Director"
      };
      store.saveState();
      store.logAction('COMPANY_PROFILE_UPDATED', 'SETTINGS', `Updated company coordinates (Authorized: ${store.state.company.authorizedPerson})`);
      alert('Company profile updated successfully!');
      updateView();
    });

    // Save Field Operations & SLA Configuration
    document.getElementById('saveFieldOpsSettingsBtn')?.addEventListener('click', async () => {
      if (!db.state.settings) db.state.settings = {};

      db.state.settings.slaMatrix = {
        Critical: { responseHours: Number(document.getElementById('slaCritResp')?.value) || 1, resolveHours: Number(document.getElementById('slaCritReso')?.value) || 4 },
        High: { responseHours: Number(document.getElementById('slaHighResp')?.value) || 2, resolveHours: Number(document.getElementById('slaHighReso')?.value) || 12 },
        Medium: { responseHours: Number(document.getElementById('slaMedResp')?.value) || 4, resolveHours: Number(document.getElementById('slaMedReso')?.value) || 24 },
        Low: { responseHours: Number(document.getElementById('slaLowResp')?.value) || 8, resolveHours: Number(document.getElementById('slaLowReso')?.value) || 48 }
      };

      db.state.settings.businessHours = {
        enabled: document.getElementById('bizHoursToggle')?.checked !== false,
        startHour: 9,
        endHour: 19,
        days: [1, 2, 3, 4, 5, 6]
      };

      db.state.settings.pauseOnWaitingClient = document.getElementById('pauseOnWaitingToggle')?.checked !== false;

      db.state.settings.payoutRules = {
        onTimeBonus: Number(document.getElementById('payoutOnTimeBonus')?.value) || 250,
        slaBreachPenalty: Number(document.getElementById('payoutSlaPenalty')?.value) || 200,
        advanceRecoveryPct: Number(document.getElementById('payoutAdvancePct')?.value) || 25
      };

      const updatedChecklists = {};
      container.querySelectorAll('.checklist-template-textarea').forEach(ta => {
        const type = ta.getAttribute('data-type');
        const lines = ta.value.split('\n').map(l => l.trim()).filter(Boolean);
        updatedChecklists[type] = lines;
      });
      db.state.settings.checklistTemplates = updatedChecklists;

      await db.saveState();
      store.logAction('SETTINGS_SLA_CONFIG_SAVED', 'SETTINGS', 'Saved custom SLA matrix, business hours & payout rules');
      alert('Field Operations & SLA configuration saved successfully!');
      updateView();
    });

    // Seed Demo Data / Reset Storage
    document.getElementById('seedDemoDataBtn')?.addEventListener('click', () => {
      if (confirm('Load complete realistic demo dataset (12 employees incl. Amit, Sunil, Deepak, Manoj; 15 jobs; 12 SLA tickets; payouts; reconciled ledgers)? Any custom uncommitted data will be re-seeded.')) {
        db.resetStorage();
        store.logAction('SETTINGS_DEMO_DATA_RESET', 'SETTINGS', 'Re-seeded complete Field Operations demo records');
        alert('ERP storage successfully reset with authentic Field Operations dataset! Reloading...');
        location.reload();
      }
    });

    // Backup JSON (Full ERP Database)
    const handleBackupExport = () => {
      db.exportFullBackupFile();
      store.logAction('BACKUP_EXPORTED', 'SETTINGS', 'Downloaded comprehensive ERP & Field Operations JSON backup');
    };
    document.getElementById('backupJsonBtn')?.addEventListener('click', handleBackupExport);
    document.getElementById('downloadBackupJsonBtn')?.addEventListener('click', handleBackupExport);

    // Clean-Slate Reset (Task 2)
    document.getElementById('executeCleanSlateResetBtn')?.addEventListener('click', () => {
      const confirmText = prompt('CLEAN-SLATE RESET CONFIRMATION:\n\nThis will:\n1. KEEP Party Masters (names, GSTIN, contacts) & Item Masters intact.\n2. ZERO all accounts: receivables, payables, party balances, ledgers, and revenue KPIs.\n3. DELETE all jobs, leads, service tickets, and staff except Owner.\n4. Save and download a full JSON backup before wiping.\n\nType "RESET" to confirm:');
      if (confirmText === 'RESET') {
        store.cleanSlateReset();
        db.exportFullBackupFile();
        alert('Clean-Slate Reset completed successfully! A full pre-reset backup was exported. Reloading application...');
        location.reload();
      } else if (confirmText !== null) {
        alert('Reset cancelled. You must type "RESET" in capital letters to proceed.');
      }
    });

    // Employee <-> User Account Sync (Task 4)
    document.getElementById('settingsReconcileBtn')?.addEventListener('click', () => {
      const rec = store.getReconciliationReport();
      const msg = `EMPLOYEE <-> USER RECONCILIATION:\n` +
        `• Total Users: ${rec.totalUsers}\n` +
        `• Total Employees: ${rec.totalEmployees}\n` +
        `• Linked Pairs: ${rec.linkedPairs.length}\n` +
        `• Accounts without Staff: ${rec.accountsWithoutEmployees.length}\n` +
        `• Staff without User Login: ${rec.employeesWithoutAccounts.length}\n\n` +
        `Do you want to automatically reconcile matching records by email/name and create linked profiles for orphans?`;
      if (confirm(msg)) {
        store.reconcileEmployees();
        alert('Synchronization complete! All users and employees are now linked.');
        updateView();
      }
    });

    // Restore JSON
    document.getElementById('importJsonFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const success = await db.importBackup(event.target.result);
            if (success) {
              store.logAction('BACKUP_RESTORED', 'SETTINGS', 'Restored ERP database from external JSON file');
              alert('Database restored successfully from file! Reloading application...');
              location.reload();
            } else {
              alert('Invalid ERP backup file structure.');
            }
          } catch (err) {
            alert('Error parsing JSON backup file: ' + err.message);
          }
        };
        reader.readAsText(file);
      }
    });

    // Reset Factory
    document.getElementById('resetFactoryBtn')?.addEventListener('click', () => {
      if (confirm('Restore factory master dataset? Any modifications will be reset to the original commercial dossier state.')) {
        db.resetStorage();
        alert('ERP restored to authentic dossier baseline! Reloading...');
        location.reload();
      }
    });
  }

  updateView();
}

/**
 * Self Profile Modal - Enables ALL roles to manage their personal profile, password, contact details & avatar.
 */
export function openMyProfileModal(userToEdit, onSaved) {
  const existing = document.getElementById('myProfileModalOverlay');
  if (existing) existing.remove();

  const currentUser = auth.getCurrentUser() || userToEdit;
  const user = store.state.users.find(u => u.id === userToEdit.id) || userToEdit;
  const isSuperAdmin = auth.isSuperAdmin() || user.roleCode === 'ADMIN';

  const modalHtml = `
    <div id="myProfileModalOverlay" class="modal-overlay" style="z-index: 10020;">
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar-circle" style="width: 42px; height: 42px; font-size: 15px; background: ${user.badgeColor || '#2563eb'};">
              ${user.avatar}
            </div>
            <div>
              <h3 class="modal-title">My Profile & Security Settings</h3>
              <p style="font-size: 11.5px; color: var(--text-dim);">${user.name} &bull; ${user.title || user.role}</p>
            </div>
          </div>
          <button id="closeMyProfileModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="myProfileForm">
          <div class="modal-body">
            <!-- Role info strip -->
            <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <span class="status-pill status-progress" style="font-size: 10.5px;">${user.levelName || 'Tier L' + user.level}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--text-main); margin-left: 8px;">${user.department}</span>
              </div>
              <div style="font-size: 11.5px; color: var(--text-dim);">
                ${user.reportsTo ? `Reports to: <strong style="color: #38bdf8;">${user.reportsToName || 'Department Head'}</strong>` : `<strong style="color: #34d399;">Apex Chief Executive</strong>`}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="myProfileName" class="form-control" value="${user.name}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Username (Login ID)</label>
                <input type="text" id="myProfileUsername" class="form-control" value="${user.username}" disabled style="opacity: 0.65; cursor: not-allowed;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Official Email Address</label>
                <input type="email" id="myProfileEmail" class="form-control" value="${user.email}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Contact Phone / Mobile</label>
                <input type="text" id="myProfilePhone" class="form-control" value="${user.phone || '+91 89300-82398'}" required>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Change Password</label>
                <input type="password" id="myProfilePassword" class="form-control" value="${user.password || ''}" placeholder="Enter new password" required>
              </div>
              <div class="form-group">
                <label class="form-label">Avatar Accent Theme</label>
                <div style="display: flex; gap: 8px; margin-top: 6px;">
                  ${['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'].map(color => `
                    <label style="cursor: pointer; position: relative;">
                      <input type="radio" name="avatarColorRadio" value="${color}" ${user.badgeColor === color ? 'checked' : ''} style="display: none;">
                      <div class="avatar-color-swatch" style="width: 26px; height: 26px; border-radius: 50%; background: ${color}; border: 2px solid ${user.badgeColor === color ? '#ffffff' : 'transparent'}; box-shadow: 0 0 6px ${color};"></div>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>

            <div style="margin-top: 14px; padding: 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-md); font-size: 11.5px; color: #93c5fd; display: flex; align-items: flex-start; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                <strong>Role Governance:</strong> ${isSuperAdmin ? 'As Apex Super Admin, you have unrestricted authority over all system roles and modules.' : 'Role tiering, departmental re-assignments, and module delegations are governed by Apex Managing Director Aditya Sharma.'}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="cancelMyProfileBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Update My Profile</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const overlay = document.getElementById('myProfileModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeMyProfileModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelMyProfileBtn')?.addEventListener('click', close);

  // Swatch selection styling
  overlay.querySelectorAll('input[name="avatarColorRadio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      overlay.querySelectorAll('.avatar-color-swatch').forEach(sw => sw.style.border = '2px solid transparent');
      const parentSwatch = radio.nextElementSibling;
      if (parentSwatch) parentSwatch.style.border = '2px solid #ffffff';
    });
  });

  document.getElementById('myProfileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedColor = overlay.querySelector('input[name="avatarColorRadio"]:checked')?.value || user.badgeColor || '#3b82f6';
    const newName = document.getElementById('myProfileName').value.trim();
    const initials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || user.avatar;

    const updates = {
      name: newName,
      avatar: initials,
      email: document.getElementById('myProfileEmail').value.trim(),
      phone: document.getElementById('myProfilePhone').value.trim(),
      password: document.getElementById('myProfilePassword').value,
      badgeColor: selectedColor
    };

    store.updateUser(user.id, updates);

    // If currently logged in user updated their own profile, sync auth session
    if (currentUser.id === user.id) {
      const updatedUser = { ...user, ...updates };
      auth.saveUser(updatedUser);
    }

    store.logAction('PROFILE_SELF_UPDATED', 'SETTINGS', `User ${newName} updated their personal contact and security credentials`);
    alert('Profile updated successfully!');
    close();
    if (onSaved) onSaved();
  });
}

/**
 * View-Only Profile Modal - For managers and staff to view colleagues without editing rights.
 */
export function openViewOnlyUserProfileModal(user) {
  const existing = document.getElementById('viewOnlyProfileModalOverlay');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="viewOnlyProfileModalOverlay" class="modal-overlay" style="z-index: 10020;">
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar-circle" style="width: 44px; height: 44px; font-size: 15px; background: ${user.badgeColor || '#6366f1'};">
              ${user.avatar}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 class="modal-title">${user.name}</h3>
                <span class="badge-locked">🔒 Read-Only</span>
              </div>
              <p style="font-size: 12px; color: #38bdf8; font-weight: 600;">${user.title || user.role}</p>
            </div>
          </div>
          <button id="closeViewOnlyModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #fbbf24; display: flex; align-items: flex-start; gap: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <div>
              <strong>Department Governance Notice:</strong>
              <div>Managers and team members have read-only view of staff credentials. Profile editing, suspension, and deletions are strictly reserved for Super Admin / MD & CEO Aditya Sharma.</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div style="background: var(--bg-card-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Hierarchy Level</div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-top: 4px;">
                ${user.levelName || 'Level ' + user.level}
              </div>
            </div>
            <div style="background: var(--bg-card-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Department</div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-top: 4px;">
                ${user.department}
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div style="background: var(--bg-card-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Direct Reporting Line</div>
              <div style="font-size: 13px; font-weight: 600; color: #34d399; margin-top: 4px;">
                ${user.reportsToName || 'Apex / Board of Directors'}
              </div>
            </div>
            <div style="background: var(--bg-card-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Account Status</div>
              <div style="margin-top: 4px;">
                <span class="status-pill ${user.status === 'Active' ? 'status-instock' : 'status-reorder'}">
                  ${user.status}
                </span>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-card-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px;">
            <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px;">Contact & Coordinates</div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--text-dim); width: 80px;">Email:</span>
                <span style="color: var(--text-main); font-weight: 500;">${user.email}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--text-dim); width: 80px;">Phone:</span>
                <span style="color: var(--text-main); font-weight: 500;">${user.phone || '+91 89300-82398'}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--text-dim); width: 80px;">Username:</span>
                <span style="color: #38bdf8; font-family: monospace;">${user.username}</span>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-card-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px;">Assigned ERP Operational Modules</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${(user.allowedModules || ['dashboard', 'calculators']).map(m => `
                <span class="status-pill status-progress" style="font-size: 10.5px; text-transform: capitalize;">${m}</span>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" id="dismissViewOnlyBtn" class="btn btn-primary">Done Viewing</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const overlay = document.getElementById('viewOnlyProfileModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeViewOnlyModalBtn')?.addEventListener('click', close);
  document.getElementById('dismissViewOnlyBtn')?.addEventListener('click', close);
}

/**
 * Add User Modal - MD/CEO Super Admin only
 */
function openAddUserModal(onSaved) {
  const users = store.state.users;
  const potentialManagers = users.filter(u => u.level <= 2);

  const modalHtml = `
    <div id="addUserModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Add Organization Team Member (Hierarchical Delegation)</h3>
          <button id="closeAddUserModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="addUserForm">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="newUserName" class="form-control" placeholder="e.g. Vikas Malik" required>
              </div>
              <div class="form-group">
                <label class="form-label">Username (Login ID)</label>
                <input type="text" id="newUserUsername" class="form-control" placeholder="e.g. vikas" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" id="newUserPassword" class="form-control" value="password123" required>
              </div>
              <div class="form-group">
                <label class="form-label">Role Classification</label>
                <select id="newUserRoleCode" class="form-control">
                  <option value="OPS">Operations & Projects</option>
                  <option value="SALES">Commercial & Bidding</option>
                  <option value="TECH">Field Surveillance & Engineering</option>
                  <option value="SUPPORT">Service & Backoffice Support</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Hierarchy Level</label>
                <select id="newUserLevel" class="form-control">
                  <option value="2">Level 2: Department Head / Manager</option>
                  <option value="3" selected>Level 3: Technical Specialist / Officer</option>
                  <option value="4">Level 4: Field Technician / Staff</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Direct Reporting Manager (Reports To)</label>
                <select id="newUserReportsTo" class="form-control">
                  ${potentialManagers.map(m => `
                    <option value="${m.id}">${m.name} (${m.role} &bull; L${m.level})</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Official Title</label>
                <input type="text" id="newUserTitle" class="form-control" placeholder="e.g. Senior Network Specialist" required>
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <select id="newUserDept" class="form-control">
                  <option value="Operations & Projects">Operations & Projects</option>
                  <option value="Commercial & Sales">Commercial & Sales</option>
                  <option value="Field Operations">Field Operations</option>
                  <option value="Executive Leadership">Executive Leadership</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="newUserEmail" class="form-control" placeholder="vikas@elizainfotech.com" required>
              </div>
              <div class="form-group">
                <label class="form-label">Contact Phone</label>
                <input type="text" id="newUserPhone" class="form-control" value="+91 " required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" id="cancelAddUserBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Team Member</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('addUserModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeAddUserModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelAddUserBtn')?.addEventListener('click', close);

  document.getElementById('addUserForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const roleCode = document.getElementById('newUserRoleCode').value;
    const level = Number(document.getElementById('newUserLevel').value);

    let defaultModules = ['dashboard', 'calculators'];
    if (roleCode === 'OPS') defaultModules = ['dashboard', 'calculators', 'quotation', 'projects', 'amc', 'inventory', 'technicians', 'items'];
    if (roleCode === 'SALES') defaultModules = ['dashboard', 'calculators', 'quotation', 'crm', 'amc', 'items'];
    if (roleCode === 'TECH') defaultModules = ['dashboard', 'calculators', 'amc', 'technicians', 'inventory'];

    store.addUser({
      name: document.getElementById('newUserName').value,
      username: document.getElementById('newUserUsername').value,
      password: document.getElementById('newUserPassword').value,
      role: document.getElementById('newUserTitle').value,
      roleCode,
      title: document.getElementById('newUserTitle').value,
      level,
      department: document.getElementById('newUserDept').value,
      reportsTo: document.getElementById('newUserReportsTo').value,
      email: document.getElementById('newUserEmail').value,
      phone: document.getElementById('newUserPhone').value,
      allowedModules: defaultModules
    });

    close();
    if (onSaved) onSaved();
  });
}

/**
 * Edit User Modal - Super Admin MD/CEO only
 */
function openEditUserModal(userToEdit, onSaved) {
  const users = store.state.users;
  const potentialManagers = users.filter(u => u.id !== userToEdit.id && u.level <= 2);

  const modalHtml = `
    <div id="editUserModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Edit Hierarchy & Access: ${userToEdit.name}</h3>
          <button id="closeEditUserModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="editUserForm">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="editUserName" class="form-control" value="${userToEdit.name}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Role Title</label>
                <input type="text" id="editUserRole" class="form-control" value="${userToEdit.role}" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Hierarchy Level</label>
                <select id="editUserLevel" class="form-control" ${userToEdit.roleCode === 'ADMIN' ? 'disabled' : ''}>
                  <option value="1" ${userToEdit.level === 1 ? 'selected' : ''}>Level 1: Executive C-Suite</option>
                  <option value="2" ${userToEdit.level === 2 ? 'selected' : ''}>Level 2: Department Head</option>
                  <option value="3" ${userToEdit.level === 3 ? 'selected' : ''}>Level 3: Technical Specialist</option>
                  <option value="4" ${userToEdit.level === 4 ? 'selected' : ''}>Level 4: Field Staff</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Direct Reporting Manager</label>
                <select id="editUserReportsTo" class="form-control" ${userToEdit.roleCode === 'ADMIN' ? 'disabled' : ''}>
                  ${userToEdit.roleCode === 'ADMIN' ? `
                    <option value="">Apex / Board of Directors</option>
                  ` : `
                    ${potentialManagers.map(m => `
                      <option value="${m.id}" ${userToEdit.reportsTo === m.id ? 'selected' : ''}>
                        ${m.name} (${m.role})
                      </option>
                    `).join('')}
                  `}
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Department</label>
                <input type="text" id="editUserDept" class="form-control" value="${userToEdit.department}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Account Status</label>
                <select id="editUserStatus" class="form-control" ${userToEdit.roleCode === 'ADMIN' ? 'disabled' : ''}>
                  <option value="Active" ${userToEdit.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Suspended" ${userToEdit.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Contact Email</label>
                <input type="email" id="editUserEmail" class="form-control" value="${userToEdit.email}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="text" id="editUserPhone" class="form-control" value="${userToEdit.phone || '+91 89300-82398'}" required>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${userToEdit.roleCode !== 'ADMIN' ? `
              <button type="button" id="deleteUserBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                Remove Member
              </button>
            ` : ''}
            <button type="button" id="cancelEditUserBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('editUserModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeEditUserModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelEditUserBtn')?.addEventListener('click', close);

  if (userToEdit.roleCode !== 'ADMIN') {
    document.getElementById('deleteUserBtn')?.addEventListener('click', () => {
      if (confirm(`Remove ${userToEdit.name} from the organization? Any subordinates will be automatically reassigned to Super Admin Aditya Sharma.`)) {
        store.deleteUser(userToEdit.id);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  document.getElementById('editUserForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const updates = {
      name: document.getElementById('editUserName').value,
      role: document.getElementById('editUserRole').value,
      title: document.getElementById('editUserRole').value,
      department: document.getElementById('editUserDept').value,
      email: document.getElementById('editUserEmail').value,
      phone: document.getElementById('editUserPhone').value
    };

    if (userToEdit.roleCode !== 'ADMIN') {
      updates.level = Number(document.getElementById('editUserLevel').value);
      updates.reportsTo = document.getElementById('editUserReportsTo').value;
      updates.status = document.getElementById('editUserStatus').value;
    }

    store.updateUser(userToEdit.id, updates);
    close();
    if (onSaved) onSaved();
  });
}
