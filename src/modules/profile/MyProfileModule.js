// My Profile & Comprehensive Person Profile Drawer
// Field-level access rules, self-service security, sessions, photo compression & audit trails

import { auth } from '../../services/auth.js';
import { peopleService } from '../../services/peopleService.js';
import { auditService } from '../../services/auditService.js';
import { ROLES, normalizeRole, ROLE_LABELS, ROLE_BADGE_COLORS } from '../../config/permissions.js';
import { db, formatCurrency, formatDate } from '../../store/db.js';
import { hashPassword, verifyPassword } from '../../services/supabase.js';

export async function openProfileDrawer(personIdentifier, onSaved = null) {
  const existing = document.getElementById('profileDrawerOverlay');
  if (existing) existing.remove();

  const currentUser = auth.getCurrentUser() || { id: 'usr-01', role: 'Super Admin', name: 'Aditya Sharma' };
  const isSuperAdmin = auth.isSuperAdmin();
  const isAdmin = isSuperAdmin || normalizeRole(currentUser.roleCode || currentUser.role) === ROLES.ADMIN;

  // Resolve target person
  let person = null;
  if (!personIdentifier) {
    person = await peopleService.get(currentUser.personId || currentUser.id || currentUser.employeeId || currentUser.email);
    if (!person) {
      person = (await peopleService.list())[0];
    }
  } else if (typeof personIdentifier === 'object') {
    person = await peopleService.get(personIdentifier.personId || personIdentifier.id || personIdentifier.employeeCode || personIdentifier.authUserId || personIdentifier.email);
    if (!person) {
      person = (await peopleService.list())[0];
    }
  } else {
    person = await peopleService.get(personIdentifier);
    if (!person) {
      person = (await peopleService.list())[0];
    }
  }

  if (!person) {
    alert('Profile record could not be loaded.');
    return;
  }

  const isOwnProfile = (currentUser.id === person.authUserId || currentUser.email === person.email);
  const dependencies = await peopleService.checkPersonDependencies(person);
  const activeSessions = await peopleService.authAdapter.listSessions(person.authUserId);

  let activeTab = 'overview'; // 'overview' | 'jobs' | 'finances' | 'security' | 'activity'
  let isRateRevealed = false;
  let hasUnsavedChanges = false;

  function renderDrawerHtml() {
    const roleBadgeColor = ROLE_BADGE_COLORS[person.role] || '#3b82f6';
    const initials = (person.displayName || person.fullName).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return `
      <div id="profileDrawerOverlay" class="modal-overlay" style="z-index: 10025;">
        <div class="modal-card" style="max-width: 820px; max-height: 94vh; display: flex; flex-direction: column;">
          <!-- Header Bar -->
          <div class="modal-header" style="padding: 16px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="position: relative;">
                ${person.photoUrl ? `
                  <img src="${person.photoUrl}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;" alt="Avatar">
                ` : `
                  <div class="user-avatar-circle" style="width: 52px; height: 52px; font-size: 18px; background: ${roleBadgeColor};">
                    ${initials}
                  </div>
                `}
                <span class="status-indicator" style="position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; border-radius: 50%; background: ${person.accessStatus === 'ACTIVE' ? '#10b981' : '#ef4444'}; border: 2px solid var(--bg-card);" title="Access: ${person.accessStatus}"></span>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3 class="modal-title" style="margin: 0; font-size: 18px;">${person.fullName}</h3>
                  <span class="status-pill" style="font-size: 10.5px; background: ${roleBadgeColor}20; color: ${roleBadgeColor}; border: 1px solid ${roleBadgeColor}40;">
                    ${ROLE_LABELS[person.role] || person.role}
                  </span>
                  <span style="font-family: monospace; font-size: 11px; color: var(--text-dim); background: var(--bg-card-subtle); padding: 1px 6px; border-radius: 4px;">
                    ${person.employeeCode}
                  </span>
                </div>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">
                  ${person.designation || 'Technical Staff'} &bull; ${person.department} &bull; ${person.email || 'No Email Login'}
                </p>
              </div>
            </div>
            <button id="closeProfileDrawerBtn" class="modal-close-btn">&times;</button>
          </div>

          <!-- Tab Navigation -->
          <div style="display: flex; border-bottom: 1px solid var(--border-color); background: var(--bg-card-subtle);">
            <button class="profile-nav-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
            <button class="profile-nav-tab ${activeTab === 'jobs' ? 'active' : ''}" data-tab="jobs">Jobs & SLA (${dependencies.jobsCount})</button>
            <button class="profile-nav-tab ${activeTab === 'finances' ? 'active' : ''}" data-tab="finances">Payouts & Ledger (${dependencies.payoutsCount})</button>
            <button class="profile-nav-tab ${activeTab === 'security' ? 'active' : ''}" data-tab="security">Access & Security</button>
            <button class="profile-nav-tab ${activeTab === 'activity' ? 'active' : ''}" data-tab="activity">Activity Log</button>
          </div>

          <!-- Body Content Scrollable -->
          <div class="modal-body" style="padding: 20px 24px; overflow-y: auto; flex: 1;">
            ${renderTabBody(person, activeTab, isOwnProfile, isAdmin, isSuperAdmin, dependencies, activeSessions, isRateRevealed)}
          </div>

          <!-- Footer Actions -->
          <div class="modal-footer" style="padding: 14px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card);">
            <div>
              ${isSuperAdmin && !isOwnProfile ? `
                <button type="button" id="deletePersonDrawerBtn" class="btn btn-secondary btn-sm" style="color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
                  🗑 Delete / Archive
                </button>
              ` : ''}
            </div>
            <div style="display: flex; gap: 10px;">
              <button type="button" id="cancelProfileDrawerBtn" class="btn btn-secondary">Close</button>
              <button type="button" id="saveProfileDrawerBtn" class="btn btn-primary">Save Profile Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabBody(p, tab, isOwn, isAdmin, isSuper, deps, sessions, rateRevealed) {
    if (tab === 'overview') {
      return `
        <!-- Lock Notice for Self-Viewers -->
        ${!isAdmin ? `
          <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; color: #93c5fd; display: flex; align-items: center; gap: 8px;">
            <span>🔒</span>
            <span>Fields marked with a lock icon are administrative and can only be modified by Super Admin / Management.</span>
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <!-- Self Editable / Admin Editable -->
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input type="text" id="profFullName" class="form-control" value="${p.fullName || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Display / Preferred Name</label>
            <input type="text" id="profDisplayName" class="form-control" value="${p.displayName || p.fullName || ''}">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label">Phone Number (10-Digit IN) *</label>
            <input type="text" id="profPhone" class="form-control" value="${p.phone || ''}" placeholder="+91 98000-00000" required>
          </div>
          <div class="form-group">
            <label class="form-label">UPI ID (For Instant Field Payouts)</label>
            <input type="text" id="profUpiId" class="form-control" value="${p.upiId || ''}" placeholder="e.g. name@okaxis">
          </div>
        </div>

        <!-- Photo Upload & Compression (<=200KB) -->
        <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
          <label class="form-label" style="font-weight: 700;">Profile Photograph (Compressed to &le;200 KB)</label>
          <div style="display: flex; align-items: center; gap: 14px; margin-top: 6px;">
            <input type="file" id="profPhotoFileInput" accept="image/png, image/jpeg, image/webp" class="form-control" style="flex: 1; font-size: 12px;">
            ${p.photoUrl ? `
              <button type="button" id="removePhotoBtn" class="btn btn-secondary btn-sm" style="color: #f87171;">Remove Photo</button>
            ` : ''}
          </div>
          <div id="photoCompressionNote" style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Supports PNG, JPEG or WebP. Auto-downscaled and cropped to square avatar.</div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Residential Address / Base Location</label>
          <textarea id="profAddress" class="form-control" rows="2" placeholder="e.g. House No. 24, Model Town, Panipat, Haryana">${p.address || ''}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label">Emergency Contact Person</label>
            <input type="text" id="profEmergencyName" class="form-control" value="${p.emergencyContactName || ''}" placeholder="e.g. Ramesh Sharma (Brother)">
          </div>
          <div class="form-group">
            <label class="form-label">Emergency Phone</label>
            <input type="text" id="profEmergencyPhone" class="form-control" value="${p.emergencyContactPhone || ''}" placeholder="+91 94160-00000">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label">Languages Spoken</label>
            <input type="text" id="profLanguages" class="form-control" value="${(p.languages || []).join(', ')}" placeholder="Hindi, English, Punjabi">
          </div>
          <div class="form-group">
            <label class="form-label">Technical Skills & Specializations</label>
            <input type="text" id="profSkills" class="form-control" value="${(p.skills || []).join(', ')}" placeholder="Fiber Splicing, CP Plus IP, RAID">
          </div>
        </div>

        <!-- Administrative Section (Locked for non-admins) -->
        <div style="border-top: 2px dashed var(--border-color); padding-top: 16px; margin-top: 20px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span>Administrative Governance</span>
            ${!isAdmin ? '<span style="font-size: 11px; color: #f87171; text-transform: none;">🔒 Read-Only for Employee</span>' : ''}
          </h4>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">System Role ${!isAdmin ? '🔒' : ''}</label>
              ${isAdmin ? `
                <select id="profRoleSelect" class="form-control">
                  ${Object.values(ROLES).map(r => `
                    <option value="${r}" ${p.role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>
                  `).join('')}
                </select>
              ` : `
                <input type="text" class="form-control" value="${ROLE_LABELS[p.role] || p.role}" disabled style="background: var(--bg-card-subtle);">
              `}
            </div>
            <div class="form-group">
              <label class="form-label">Designation / Title ${!isAdmin ? '🔒' : ''}</label>
              <input type="text" id="profDesignation" class="form-control" value="${p.designation || ''}" ${!isAdmin ? 'disabled style="background: var(--bg-card-subtle);"' : ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Department ${!isAdmin ? '🔒' : ''}</label>
              <input type="text" id="profDepartment" class="form-control" value="${p.department || 'Field Operations'}" ${!isAdmin ? 'disabled style="background: var(--bg-card-subtle);"' : ''}>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Employment Status ${!isAdmin ? '🔒' : ''}</label>
              ${isAdmin ? `
                <select id="profEmploymentStatus" class="form-control">
                  <option value="ACTIVE" ${p.employmentStatus === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                  <option value="ON_LEAVE" ${p.employmentStatus === 'ON_LEAVE' ? 'selected' : ''}>ON_LEAVE</option>
                  <option value="EXITED" ${p.employmentStatus === 'EXITED' ? 'selected' : ''}>EXITED (Relieved)</option>
                </select>
              ` : `
                <input type="text" class="form-control" value="${p.employmentStatus}" disabled style="background: var(--bg-card-subtle);">
              `}
            </div>
            <div class="form-group">
              <label class="form-label">Portal Access Status ${!isAdmin ? '🔒' : ''}</label>
              ${isAdmin ? `
                <select id="profAccessStatus" class="form-control">
                  <option value="ACTIVE" ${p.accessStatus === 'ACTIVE' ? 'selected' : ''}>ACTIVE (Can Login)</option>
                  <option value="INVITED" ${p.accessStatus === 'INVITED' ? 'selected' : ''}>INVITED (Pending Acceptance)</option>
                  <option value="SUSPENDED" ${p.accessStatus === 'SUSPENDED' ? 'selected' : ''}>SUSPENDED (Blocked)</option>
                  <option value="DEACTIVATED" ${p.accessStatus === 'DEACTIVATED' ? 'selected' : ''}>DEACTIVATED</option>
                  <option value="NONE" ${p.accessStatus === 'NONE' ? 'selected' : ''}>NONE (No Login Account)</option>
                </select>
              ` : `
                <input type="text" class="form-control" value="${p.accessStatus}" disabled style="background: var(--bg-card-subtle);">
              `}
            </div>
          </div>

          <!-- Rates Section with Reveal Click -->
          <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-main);">Compensation & Rates ${!isAdmin ? '🔒' : ''}</span>
              ${!rateRevealed ? `
                <button type="button" id="revealRateBtn" class="btn btn-secondary btn-sm" style="font-size: 10px; padding: 2px 6px;">
                  👁 Reveal Rate Details
                </button>
              ` : '<span style="font-size: 10px; color: #34d399;">✓ Rate Revealed (Logged)</span>'}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Pay Type</label>
                <select id="profPayType" class="form-control" ${!isAdmin ? 'disabled' : ''}>
                  <option value="PerPoint" ${p.payType === 'PerPoint' ? 'selected' : ''}>Per Point (Camera Mount)</option>
                  <option value="PerJob" ${p.payType === 'PerJob' ? 'selected' : ''}>Per Job (Fixed Commission)</option>
                  <option value="Daily" ${p.payType === 'Daily' ? 'selected' : ''}>Daily Wage</option>
                  <option value="Monthly" ${p.payType === 'Monthly' ? 'selected' : ''}>Monthly Salary</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Default Rate (₹)</label>
                <input type="text" id="profDefaultRate" class="form-control" value="${rateRevealed || isAdmin ? p.defaultRate : '••••••'}" ${!isAdmin ? 'disabled' : ''}>
              </div>
            </div>
            <div style="margin-top: 10px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
                <input type="checkbox" id="profCanBeAssignedJobs" ${p.canBeAssignedJobs ? 'checked' : ''} ${!isAdmin ? 'disabled' : ''}>
                <span>Can be assigned field jobs / surveillance installations</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'jobs') {
      return `
        <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Assigned Field Work Orders (${deps.jobsCount})</h4>
          <p style="font-size: 12px; color: var(--text-dim);">Historical installations and maintenance tasks linked to ${p.fullName}.</p>
        </div>
        <div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 24px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          All ${deps.jobsCount} linked job work orders are intact in the Job Sheets and Kanban Board modules.
        </div>
      `;
    }

    if (tab === 'finances') {
      return `
        <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Financial Payouts & Double-Entry Ledger (${deps.payoutsCount} Payouts)</h4>
          <p style="font-size: 12px; color: var(--text-dim);">Vouchers, labor accruals and digital disbursements posted for ${p.fullName}.</p>
        </div>
        <div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 24px; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          ${deps.payoutsCount} payouts and ${deps.ledgerCount} double-entry ledger vouchers are linked to code <strong>${p.employeeCode}</strong>.
        </div>
      `;
    }

    if (tab === 'security') {
      return `
        <!-- Password Change Section -->
        <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 10px;">Change Password</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 11.5px;">New Password (Min 10 characters)</label>
              <input type="password" id="profNewPassword" class="form-control" placeholder="Enter secure password">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label" style="font-size: 11.5px;">Confirm New Password</label>
              <input type="password" id="profConfirmPassword" class="form-control" placeholder="Re-enter password">
            </div>
          </div>
          <div id="passwordStrengthMeter" style="margin-top: 8px; font-size: 11px; color: var(--text-dim);"></div>
          <button type="button" id="btnUpdatePassword" class="btn btn-primary btn-sm" style="margin-top: 10px;">
            Update Password
          </button>
        </div>

        <!-- Active Sessions Section -->
        <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="font-size: 13px; font-weight: 700; color: #38bdf8; margin: 0;">Active Login Sessions (${sessions.length})</h4>
            ${sessions.length > 0 ? `
              <button type="button" id="btnSignOutOtherSessions" class="btn btn-secondary btn-sm" style="font-size: 10.5px; color: #f87171;">
                Sign Out Other Devices
              </button>
            ` : ''}
          </div>
          ${sessions.length === 0 ? `
            <div style="font-size: 11.5px; color: var(--text-dim); font-style: italic;">No active login sessions recorded.</div>
          ` : sessions.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 6px; font-size: 11.5px;">
              <div>
                <strong>${s.userAgent ? s.userAgent.substring(0, 45) + '...' : 'Browser Client'}</strong>
                <div style="font-size: 10.5px; color: var(--text-dim);">IP: ${s.ip} &bull; Active: ${new Date(s.lastActiveAt).toLocaleTimeString()}</div>
              </div>
              <span class="status-pill status-instock" style="font-size: 9.5px;">Current</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (tab === 'activity') {
      const logs = auditService.getLogs(l => l.targetId === p.id || l.targetName?.includes(p.fullName));
      return `
        <div style="background: var(--bg-card-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #38bdf8; margin: 0 0 4px 0;">Immutable Security & Audit Trail</h4>
          <p style="font-size: 11.5px; color: var(--text-dim); margin: 0;">Chronological record of permissions, credentials, and profile modifications.</p>
        </div>
        ${logs.length === 0 ? `
          <div style="text-align: center; padding: 24px; color: var(--text-dim); font-size: 12px;">No activity logged yet for this user.</div>
        ` : logs.map(l => `
          <div style="padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 8px; font-size: 11.5px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #38bdf8;">${l.action}</strong>
              <span style="font-size: 10.5px; color: var(--text-dim);">${new Date(l.timestamp).toLocaleString()}</span>
            </div>
            <div>${l.details}</div>
            <div style="font-size: 10px; color: var(--text-dim); margin-top: 3px;">By: ${l.actorName} (${l.actorRole})</div>
          </div>
        `).join('')}
      `;
    }

    return '';
  }

  function mountDrawer() {
    document.body.insertAdjacentHTML('beforeend', renderDrawerHtml());
    attachDrawerEvents();
  }

  function updateDrawerView() {
    const overlay = document.getElementById('profileDrawerOverlay');
    if (overlay) overlay.remove();
    mountDrawer();
  }

  function attachDrawerEvents() {
    const overlay = document.getElementById('profileDrawerOverlay');
    const close = () => {
      if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard them?')) return;
      }
      overlay.remove();
    };

    document.getElementById('closeProfileDrawerBtn')?.addEventListener('click', close);
    document.getElementById('cancelProfileDrawerBtn')?.addEventListener('click', close);

    // Tab buttons
    overlay.querySelectorAll('.profile-nav-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        activeTab = tabBtn.getAttribute('data-tab');
        updateDrawerView();
      });
    });

    // Reveal rate details
    document.getElementById('revealRateBtn')?.addEventListener('click', () => {
      isRateRevealed = true;
      auditService.log({
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'SENSITIVE_RATE_VIEWED',
        targetType: 'PERSON',
        targetId: person.id,
        targetName: person.fullName,
        details: `${currentUser.name} revealed compensation rates for ${person.fullName}`
      });
      updateDrawerView();
    });

    // Photo file input with client compression <= 200KB
    document.getElementById('profPhotoFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 250;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to WebP or JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          person.photoUrl = compressedDataUrl;
          hasUnsavedChanges = true;
          document.getElementById('photoCompressionNote').textContent = `✓ Photo compressed successfully (${Math.round(compressedDataUrl.length / 1024)} KB). Save profile to apply.`;
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('removePhotoBtn')?.addEventListener('click', () => {
      person.photoUrl = null;
      hasUnsavedChanges = true;
      updateDrawerView();
    });

    // Password Update
    document.getElementById('btnUpdatePassword')?.addEventListener('click', async () => {
      const newP = document.getElementById('profNewPassword')?.value;
      const confP = document.getElementById('profConfirmPassword')?.value;

      if (!newP || newP.length < 10) {
        alert('Password must be at least 10 characters long.');
        return;
      }
      if (newP !== confP) {
        alert('Password confirmation does not match.');
        return;
      }

      const hashedPassword = await hashPassword(newP);
      const user = (store.state.users || []).find(u => u.id === person.authUserId || (u.email && u.email.toLowerCase() === person.email?.toLowerCase()));
      if (user) {
        user.password = hashedPassword;
        user.mustChangePassword = false;
        store.saveState();

        auditService.log({
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: 'PASSWORD_UPDATED',
          targetType: 'USER',
          targetId: person.id,
          targetName: person.fullName,
          details: `Password changed for ${person.fullName}`
        });

        alert('Password updated successfully!');
        document.getElementById('profNewPassword').value = '';
        document.getElementById('profConfirmPassword').value = '';
      }
    });

    // Sign out other sessions
    document.getElementById('btnSignOutOtherSessions')?.addEventListener('click', async () => {
      if (confirm('Sign out all other sessions? Other devices will be disconnected immediately.')) {
        await peopleService.authAdapter.revokeSessions(person.authUserId, true);
        alert('All other devices have been signed out.');
        updateDrawerView();
      }
    });

    // Delete / Archive from drawer
    document.getElementById('deletePersonDrawerBtn')?.addEventListener('click', async () => {
      const code = prompt(`To proceed with deletion/archive, please type the employee code '${person.employeeCode}':`);
      if (!code) return;

      try {
        if (dependencies.hasDependencies) {
          if (confirm(`This person has ${dependencies.totalCount} linked records (${dependencies.summary}). Hard deletion is not allowed. Would you like to Archive & Anonymize this profile instead?`)) {
            await peopleService.archivePerson(person.id, code, currentUser);
            alert('Person archived and anonymized successfully.');
            close();
            if (onSaved) onSaved();
          }
        } else {
          await peopleService.deletePerson(person.id, code, currentUser);
          alert('Person deleted successfully.');
          close();
          if (onSaved) onSaved();
        }
      } catch (err) {
        alert('Action failed: ' + err.message);
      }
    });

    // Save Profile Changes
    document.getElementById('saveProfileDrawerBtn')?.addEventListener('click', async () => {
      const fullName = document.getElementById('profFullName')?.value?.trim();
      const displayName = document.getElementById('profDisplayName')?.value?.trim() || fullName;
      const phone = document.getElementById('profPhone')?.value?.trim();
      const upiId = document.getElementById('profUpiId')?.value?.trim();
      const address = document.getElementById('profAddress')?.value?.trim();
      const emergencyContactName = document.getElementById('profEmergencyName')?.value?.trim();
      const emergencyContactPhone = document.getElementById('profEmergencyPhone')?.value?.trim();

      const languages = (document.getElementById('profLanguages')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const skills = (document.getElementById('profSkills')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updates = {
        fullName,
        displayName,
        phone,
        upiId,
        address,
        emergencyContactName,
        emergencyContactPhone,
        languages,
        skills,
        photoUrl: person.photoUrl
      };

      if (isAdmin) {
        const roleSel = document.getElementById('profRoleSelect');
        if (roleSel) updates.role = roleSel.value;
        const desig = document.getElementById('profDesignation');
        if (desig) updates.designation = desig.value.trim();
        const dept = document.getElementById('profDepartment');
        if (dept) updates.department = dept.value.trim();
        const empStat = document.getElementById('profEmploymentStatus');
        if (empStat) updates.employmentStatus = empStat.value;
        const accStat = document.getElementById('profAccessStatus');
        if (accStat) updates.accessStatus = accStat.value;
        const payType = document.getElementById('profPayType');
        if (payType) updates.payType = payType.value;
        const defRate = document.getElementById('profDefaultRate');
        if (defRate && defRate.value !== '••••••') updates.defaultRate = Number(defRate.value) || 0;
        const canAssign = document.getElementById('profCanBeAssignedJobs');
        if (canAssign) updates.canBeAssignedJobs = canAssign.checked;
      }

      try {
        const result = await peopleService.updatePerson(person.id, updates, currentUser);
        hasUnsavedChanges = false;
        if (result.warning) alert(result.warning);
        alert('Profile saved successfully!');
        close();
        if (onSaved) onSaved(result.person);
      } catch (err) {
        alert('Error saving profile: ' + err.message);
      }
    });
  }

  mountDrawer();
}
