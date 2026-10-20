// Top Navbar Component - Operational Alerts, Period Engine, Role Badging & User Menu Flyout
import { auth } from '../services/auth.js';
import { store } from '../services/store.js';
import { notificationService } from '../services/notificationService.js';
import { renderPeriodBar } from './PeriodPicker/PeriodPicker.js';
import { openProfileDrawer } from '../modules/profile/MyProfileModule.js';
import { ROLE_LABELS, ROLE_BADGE_COLORS, normalizeRole, ROLES } from '../config/permissions.js';

let notificationsOpen = false;
let userMenuOpen = false;

export async function renderNavbar(container, onNavigate, onOpenSearch, onOpenAuth) {
  const user = auth.getCurrentUser() || { name: 'Guest', role: 'Super Admin', avatar: 'AS', roleCode: 'ADMIN' };
  const canonicalRole = normalizeRole(user.roleCode || user.role);
  const roleLabel = ROLE_LABELS[canonicalRole] || user.role;
  const roleBadgeColor = ROLE_BADGE_COLORS[canonicalRole] || '#3b82f6';
  
  // Fetch live notifications
  const alerts = await notificationService.getActiveAlerts();
  const unreadCount = notificationService.getUnreadCount(alerts);

  // Format today's date
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  container.innerHTML = `
    <header class="top-navbar" style="position: relative;">
      <div class="nav-left-tools">
        <button id="sidebarToggleBtn" class="sidebar-toggle-btn" title="Toggle Sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div id="navSearchBar" class="global-search-bar" title="Press Ctrl+K or / to search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span class="search-placeholder">Search jobs, tickets, staff, SKUs, leads...</span>
          <span class="search-kbd">Ctrl+K</span>
        </div>

        <!-- Global Period & Date Range Filter Bar -->
        <div id="navPeriodPickerContainer"></div>
      </div>

      <div class="nav-right-tools">
        ${(import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development') !== 'production' ? `
          <div class="env-badge-pill" style="display: flex; align-items: center; gap: 4px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #f59e0b;"></span>
            <span>${import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development'}</span>
          </div>
        ` : ''}

        <!-- Quick Role Switcher (Admin / Supervisor / Technician) -->
        <div class="demo-role-switcher" style="display: flex; align-items: center; background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: 20px; padding: 2px 4px; gap: 2px;">
          <span style="font-size: 10px; font-weight: 700; color: var(--text-dim); padding: 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Role</span>
          <button class="role-switch-btn ${canonicalRole === ROLES.SUPER_ADMIN || canonicalRole === ROLES.ADMIN ? 'active' : ''}" data-role="ADMIN" style="border: none; background: ${canonicalRole === ROLES.SUPER_ADMIN || canonicalRole === ROLES.ADMIN ? 'var(--blue-accent)' : 'transparent'}; color: ${canonicalRole === ROLES.SUPER_ADMIN || canonicalRole === ROLES.ADMIN ? '#fff' : 'var(--text-muted)'}; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; cursor: pointer; transition: all 0.15s;" title="Switch to Admin (Aditya Sharma)">
            Admin
          </button>
          <button class="role-switch-btn ${canonicalRole === ROLES.SUPERVISOR ? 'active' : ''}" data-role="OPS" style="border: none; background: ${canonicalRole === ROLES.SUPERVISOR ? 'var(--blue-accent)' : 'transparent'}; color: ${canonicalRole === ROLES.SUPERVISOR ? '#fff' : 'var(--text-muted)'}; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; cursor: pointer; transition: all 0.15s;" title="Switch to Supervisor (Sunil Verma)">
            Supervisor
          </button>
          <button class="role-switch-btn ${canonicalRole === ROLES.TECHNICIAN ? 'active' : ''}" data-role="TECH" style="border: none; background: ${canonicalRole === ROLES.TECHNICIAN ? 'var(--blue-accent)' : 'transparent'}; color: ${canonicalRole === ROLES.TECHNICIAN ? '#fff' : 'var(--text-muted)'}; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; cursor: pointer; transition: all 0.15s;" title="Switch to Field Technician (Deepak Saini)">
            Technician
          </button>
        </div>

        <div class="date-live-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Live: ${today}</span>
        </div>

        <button id="themeToggleBtn" class="btn-icon-action" title="Toggle Dark / Light Theme">
          ${isLight ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          `}
        </button>

        <!-- Export Full Backup Action Button -->
        <button id="navExportBackupBtn" class="btn-icon-action" style="color: #38bdf8;" title="Export Full Backup (JSON)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>

        <!-- Notification Bell with Dot -->
        <button id="notificationsBtn" class="btn-icon-action" style="position: relative;" title="Operational & SLA Alerts">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          ${unreadCount > 0 ? `
            <span style="position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 6px #ef4444;"></span>
          ` : ''}
        </button>

        <!-- Navbar User Profile Badge -->
        <div id="userProfileBadge" class="user-quick-profile" style="max-width: 220px; cursor: pointer;" title="Open User Menu">
          <div class="user-avatar-circle" style="background: ${roleBadgeColor};">
            ${user.avatar || 'AS'}
          </div>
          <div class="user-meta-info">
            <span class="user-meta-name" style="color: var(--text-main);">${user.name}</span>
            <span class="user-meta-role" style="color: ${roleBadgeColor}; font-weight: 700;">${roleLabel}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 4px; color: var(--text-dim);">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <!-- User Profile Menu Flyout (Section 7) -->
      <div id="userProfileMenuFlyout" style="display: ${userMenuOpen ? 'block' : 'none'}; position: absolute; top: calc(100% + 8px); right: 16px; width: 280px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.35); z-index: 1000; overflow: hidden; animation: fadeIn 0.15s ease;">
        <!-- Header -->
        <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-card-subtle);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 13px; background: ${roleBadgeColor};">
              ${user.avatar || 'AS'}
            </div>
            <div style="overflow: hidden; flex: 1;">
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${user.name}</div>
              <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${user.email || 'aditya@eliza.in'}</div>
            </div>
          </div>
          <div style="margin-top: 8px;">
            <span class="status-pill" style="font-size: 10px; background: ${roleBadgeColor}20; color: ${roleBadgeColor}; border: 1px solid ${roleBadgeColor}40;">
              ${roleLabel}
            </span>
          </div>
        </div>

        <!-- Menu Actions -->
        <div style="padding: 6px 0;">
          <button class="nav-dropdown-item" id="navMenuMyProfileBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>My Profile</span>
          </button>
          <button class="nav-dropdown-item" id="navMenuSecurityBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Security & Sessions</span>
          </button>
          ${auth.isSuperAdmin() ? `
            <button class="nav-dropdown-item" id="navMenuAdminUsersBtn" style="color: #818cf8;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>User Management</span>
            </button>
          ` : ''}
          <button class="nav-dropdown-item" id="navMenuThemeToggleBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line></svg>
            <span>Toggle Theme (${isLight ? 'Dark' : 'Light'})</span>
          </button>
          <div style="border-top: 1px solid var(--border-color); margin: 4px 0;"></div>
          <button class="nav-dropdown-item" id="navMenuSwitchUserBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
            <span>Switch Workspace / Role</span>
          </button>
          <button class="nav-dropdown-item" id="navMenuSignOutBtn" style="color: #ef4444;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <!-- Notifications Dropdown Flyout -->
      <div id="notificationsFlyout" style="display: ${notificationsOpen ? 'block' : 'none'}; position: absolute; top: calc(100% + 8px); right: 180px; width: 360px; max-height: 480px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.35); z-index: 1000; overflow: hidden; animation: fadeIn 0.15s ease;">
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-subtle);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13.5px; color: var(--text-main);">Operational Alerts</span>
            <span class="badge" style="background: #ef4444; color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 700;">${alerts.length}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="clearAllNotifsBtn" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 11px;">Clear All</button>
            <button id="closeNotifsBtn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px;">&times;</button>
          </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto; padding: 8px;">
          ${alerts.length === 0 ? `
            <div style="text-align: center; padding: 32px 16px; color: var(--text-dim); font-size: 12.5px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 8px; opacity: 0.5;"><circle cx="12" cy="12" r="10"></circle><path d="M8 12l2 2 4-4"></path></svg>
              All systems clear. No SLA breaches or urgent issues.
            </div>
          ` : alerts.map(a => `
            <div class="notif-item" data-target="${a.targetModule}" data-id="${a.targetId}" data-alert-id="${a.id}" style="padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; background: ${a.isRead ? 'transparent' : 'rgba(239, 68, 68, 0.06)'}; border-left: 3px solid ${a.severity === 'critical' ? '#ef4444' : (a.severity === 'danger' ? '#f97316' : '#eab308')}; cursor: pointer; transition: background 0.15s;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                <span style="font-size: 12px; font-weight: 700; color: ${a.severity === 'critical' ? '#ef4444' : 'var(--text-main)'};">${a.title}</span>
                <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 4px; background: var(--bg-card-subtle); color: var(--text-dim); white-space: nowrap;">${a.category}</span>
              </div>
              <p style="font-size: 11px; color: var(--text-muted); margin: 3px 0 0;">${a.message}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </header>
  `;

  // Mount Global Period Filter Bar
  const periodContainer = document.getElementById('navPeriodPickerContainer');
  if (periodContainer) {
    renderPeriodBar(periodContainer);
  }

  // Attach event handlers
  document.getElementById('navExportBackupBtn')?.addEventListener('click', () => {
    store.exportBackup();
  });

  document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (window.innerWidth <= 1024) {
      const isOpen = sidebar?.classList.toggle('mobile-open');
      if (backdrop) {
        if (isOpen) {
          backdrop.classList.add('active');
          document.body.classList.add('sidebar-drawer-open');
        } else {
          backdrop.classList.remove('active');
          document.body.classList.remove('sidebar-drawer-open');
        }
      }
    } else {
      sidebar?.classList.toggle('collapsed');
    }
  });

  document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
    document.body.classList.remove('sidebar-drawer-open');
  });

  document.getElementById('navSearchBar')?.addEventListener('click', onOpenSearch);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ELIZA_THEME', next);
    renderNavbar(container, onNavigate, onOpenSearch, onOpenAuth);
  };

  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('navMenuThemeToggleBtn')?.addEventListener('click', toggleTheme);

  // User Profile flyout toggle
  const profileBadge = document.getElementById('userProfileBadge');
  const userFlyout = document.getElementById('userProfileMenuFlyout');
  const notifBtn = document.getElementById('notificationsBtn');
  const notifFlyout = document.getElementById('notificationsFlyout');

  profileBadge?.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenuOpen = !userMenuOpen;
    notificationsOpen = false;
    if (userFlyout) userFlyout.style.display = userMenuOpen ? 'block' : 'none';
    if (notifFlyout) notifFlyout.style.display = 'none';
  });

  // User Menu Actions
  document.getElementById('navMenuMyProfileBtn')?.addEventListener('click', () => {
    userMenuOpen = false;
    if (userFlyout) userFlyout.style.display = 'none';
    openProfileDrawer(user);
  });

  document.getElementById('navMenuSecurityBtn')?.addEventListener('click', () => {
    userMenuOpen = false;
    if (userFlyout) userFlyout.style.display = 'none';
    openProfileDrawer(user);
  });

  document.getElementById('navMenuAdminUsersBtn')?.addEventListener('click', () => {
    userMenuOpen = false;
    if (userFlyout) userFlyout.style.display = 'none';
    if (onNavigate) onNavigate('admin-users');
  });

  document.getElementById('navMenuSwitchUserBtn')?.addEventListener('click', () => {
    userMenuOpen = false;
    if (userFlyout) userFlyout.style.display = 'none';
    if (onOpenAuth) onOpenAuth();
  });

  document.getElementById('navMenuSignOutBtn')?.addEventListener('click', () => {
    userMenuOpen = false;
    if (userFlyout) userFlyout.style.display = 'none';
    auth.logout();
  });

  // Role Switcher buttons
  container.querySelectorAll('.role-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetRole = btn.getAttribute('data-role');
      if (targetRole) {
        auth.quickLoginAs(targetRole);
      }
    });
  });

  // Notifications toggle
  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsOpen = !notificationsOpen;
    userMenuOpen = false;
    if (notifFlyout) notifFlyout.style.display = notificationsOpen ? 'block' : 'none';
    if (userFlyout) userFlyout.style.display = 'none';
  });

  document.getElementById('closeNotifsBtn')?.addEventListener('click', () => {
    notificationsOpen = false;
    if (notifFlyout) notifFlyout.style.display = 'none';
  });

  document.getElementById('clearAllNotifsBtn')?.addEventListener('click', () => {
    notificationService.clearAll(alerts);
    notificationsOpen = false;
    renderNavbar(container, onNavigate, onOpenSearch, onOpenAuth);
  });

  container.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-card-hover)');
    item.addEventListener('mouseleave', () => {
      const isRead = item.getAttribute('data-read') === 'true';
      item.style.background = isRead ? 'transparent' : 'rgba(239, 68, 68, 0.06)';
    });
    item.addEventListener('click', () => {
      const targetMod = item.getAttribute('data-target');
      const alertId = item.getAttribute('data-alert-id');
      if (alertId) notificationService.markAsRead(alertId);
      notificationsOpen = false;
      if (targetMod) onNavigate(targetMod);
    });
  });

  // Close flyouts on outside click
  document.addEventListener('click', (e) => {
    if (userMenuOpen && userFlyout && !userFlyout.contains(e.target) && !profileBadge?.contains(e.target)) {
      userMenuOpen = false;
      userFlyout.style.display = 'none';
    }
    if (notificationsOpen && notifFlyout && !notifFlyout.contains(e.target) && !notifBtn?.contains(e.target)) {
      notificationsOpen = false;
      notifFlyout.style.display = 'none';
    }
  });
}
