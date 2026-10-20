// Collapsible Sidebar Navigation Component
import { auth } from '../services/auth.js';
import { store } from '../services/store.js';
import { db } from '../store/db.js';
import { openProfileDrawer } from '../modules/profile/MyProfileModule.js';

export function renderSidebar(container, activeModule, onNavigate, onOpenAuth) {
  const user = auth.getCurrentUser();
  const kpis = store.getKpis();
  const activeCompId = db.getActiveCompanyId ? db.getActiveCompanyId() : 'comp-eliza';
  const companies = db.getCompanies ? db.getCompanies() : [];
  const currentCompany = companies.find(c => c.id === activeCompId) || { name: 'ELIZA INFOTECH', tagline: 'Enterprise CCTV ERP' };

  // Core Management Items
  const coreNavItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      badge: null
    },
    {
      id: 'calculators',
      label: 'System Calculators',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>`,
      badge: '7 Tools'
    },
    {
      id: 'quotation',
      label: 'Quotation Generator',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
      badge: 'GST'
    },
    {
      id: 'crm',
      label: 'CRM & Pipeline',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      badge: `${kpis.totalLeadsCount} Leads`
    },
    {
      id: 'projects',
      label: 'Project Costing P&L',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
      badge: `${Math.round(kpis.grossMarginPct)}% Mgn`
    },
    {
      id: 'inventory',
      label: 'Inventory & Vendors',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
      badge: kpis.reorderAlertsCount > 0 ? `${kpis.reorderAlertsCount} Alerts` : 'In Stock',
      badgeClass: kpis.reorderAlertsCount > 0 ? 'badge-alert' : 'badge-info'
    },
    {
      id: 'reports',
      label: 'Reports & Accounts Hub',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
      badge: '10 Reports'
    }
  ];

  // New Group: FIELD OPERATIONS (Job Sheets, Job Board, Service Tickets & SLA, Payouts & Ledgers, Team)
  const fieldOpsNavItems = [
    {
      id: 'jobs',
      label: 'Job Sheets',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
      badge: `${kpis.openJobsCount} Active`,
      badgeClass: kpis.overdueJobsCount > 0 ? 'badge-alert' : 'badge-info'
    },
    {
      id: 'job-board',
      label: 'Job Board (Kanban)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="18" rx="1"></rect><rect x="10" y="3" width="5" height="11" rx="1"></rect><rect x="17" y="3" width="5" height="15" rx="1"></rect></svg>`,
      badge: 'Board'
    },
    {
      id: 'tickets',
      label: 'Service Tickets & SLA',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
      badge: kpis.breachedTicketsCount > 0 ? `${kpis.breachedTicketsCount} Breached` : `${kpis.openTicketsCount} Open`,
      badgeClass: kpis.breachedTicketsCount > 0 ? 'badge-alert' : (kpis.urgentAmcRenewals > 0 ? 'badge-alert' : 'badge-info')
    },
    {
      id: 'payouts',
      label: 'Payouts & Ledgers',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
      badge: `₹${Math.round(kpis.techBalanceDue / 1000)}k Due`
    },
    {
      id: 'team',
      label: 'Team (Employees)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      badge: `${(store.state.employees || []).length} Staff`
    }
  ];

  // System & Master Items
  const systemNavItems = [
    {
      id: 'items',
      label: 'Item Master',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
      badge: `${(store.state.items || []).length} SKUs`
    },
    {
      id: 'parties',
      label: 'Parties Master',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      badge: `${(store.state.parties || []).length} Accounts`
    },
    {
      id: 'audit',
      label: 'System Audit Logs',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      badge: 'Security'
    },
    {
      id: 'settings',
      label: 'Settings & Config',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      badge: null
    }
  ];

  container.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-wrapper">
          <div class="brand-logo-icon">${(currentCompany.name || 'E')[0].toUpperCase()}</div>
          <div class="brand-info">
            <span class="brand-title">${currentCompany.name || 'ELIZA INFOTECH'}</span>
            <span class="brand-sub">${currentCompany.tagline || 'Enterprise CCTV ERP'}</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <span class="nav-section-title">Commercial & Management</span>
        ${coreNavItems.map(item => `
          <div class="nav-item ${activeModule === item.id ? 'active' : ''}" data-nav="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge ${item.badgeClass || 'badge-info'}">${item.badge}</span>` : ''}
          </div>
        `).join('')}

        <span class="nav-section-title" style="margin-top: 10px; color: #38bdf8; display: flex; align-items: center; justify-content: space-between;">
          <span>FIELD OPERATIONS</span>
          <span style="font-size: 9px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 1px 6px; border-radius: 4px; font-weight: 700;">SUITE</span>
        </span>
        ${fieldOpsNavItems.map(item => `
          <div class="nav-item ${activeModule === item.id ? 'active' : ''}" data-nav="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge ${item.badgeClass || 'badge-info'}">${item.badge}</span>` : ''}
          </div>
        `).join('')}

        <span class="nav-section-title" style="margin-top: 10px;">Master & System</span>
        ${systemNavItems.map(item => `
          <div class="nav-item ${activeModule === item.id ? 'active' : ''}" data-nav="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge ${item.badgeClass || 'badge-info'}">${item.badge}</span>` : ''}
          </div>
        `).join('')}

        ${auth.isSuperAdmin() ? `
          <span class="nav-section-title" style="margin-top: 10px; color: #818cf8; display: flex; align-items: center; justify-content: space-between;">
            <span>ADMINISTRATION</span>
            <span style="font-size: 9px; background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 1px 6px; border-radius: 4px; font-weight: 700;">APEX</span>
          </span>
          <div class="nav-item ${activeModule === 'admin-users' ? 'active' : ''}" data-nav="admin-users">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
            </span>
            <span>User Management</span>
            <span class="nav-badge" style="background: rgba(99, 102, 241, 0.25); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4);">Super Admin</span>
          </div>
          <div class="nav-item ${activeModule === 'developer-tools' ? 'active' : ''}" data-nav="developer-tools">
            <span class="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            </span>
            <span>Developer Tools</span>
            <span class="nav-badge" style="background: rgba(16, 185, 129, 0.25); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);">Console</span>
          </div>
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-quick-profile" id="sidebarUserProfileBtn" title="Click to view User Profile & Access Control">
          <div class="user-avatar-circle" style="background: ${user?.badgeColor || '#2563eb'};">
            ${user?.avatar || 'AS'}
          </div>
          <div class="user-meta-info">
            <span class="user-meta-name">${user?.name || 'Aditya Sharma'}</span>
            <span class="user-meta-role">${user?.role || 'Super Admin'}</span>
          </div>
        </div>
      </div>
    </aside>
  `;

  // Attach navigation events
  container.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-nav');
      // Close mobile drawer if open
      const sidebar = document.querySelector('.sidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        backdrop?.classList.remove('active');
        document.body.classList.remove('sidebar-drawer-open');
      }
      if (target) onNavigate(target);
    });
  });

  document.getElementById('sidebarUserProfileBtn')?.addEventListener('click', () => {
    openProfileDrawer(user);
  });
}
