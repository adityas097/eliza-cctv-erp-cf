// Main Application Bootstrap & Client-Side Router
import './styles/main.css';
import { auth } from './services/auth.js';
import { store } from './services/store.js';
import { peopleService } from './services/peopleService.js';
import { permissionService } from './services/permissionService.js';

import { renderNavbar } from './components/Navbar.js';
import { renderSidebar } from './components/Sidebar.js';
import { openAuthModal } from './components/AuthModal.js';
import { openSearchModal } from './components/GlobalSearchModal.js';
import { initGlobalShortcuts } from './services/shortcuts.js';

import { renderDashboardModule } from './modules/DashboardModule.js';
import { renderCalculatorsModule } from './modules/CalculatorsModule.js';
import { renderQuotationModule } from './modules/QuotationModule.js';
import { renderCrmModule } from './modules/CrmModule.js';
import { renderProjectsModule } from './modules/ProjectsModule.js';
import { renderInventoryModule } from './modules/InventoryModule.js';
import { renderItemMasterModule } from './modules/ItemMasterModule.js';
import { renderAuditLogsModule } from './modules/AuditLogsModule.js';
import { renderSettingsModule } from './modules/SettingsModule.js';

// Super Admin User Governance & Developer Console
import { renderAdminUsersModule } from './modules/admin-users/AdminUsersModule.js';
import { renderDeveloperToolsModule } from './modules/developer/DeveloperToolsModule.js';
import { openProfileDrawer } from './modules/profile/MyProfileModule.js';

// Field Operations Suite Modules
import { renderJobSheetsModule } from './modules/jobs/JobSheetsModule.js';
import { renderJobBoardModule } from './modules/kanban/JobBoardModule.js';
import { renderTicketsModule } from './modules/tickets/TicketsModule.js';
import { renderPayoutsModule } from './modules/payouts/PayoutsModule.js';
import { renderTeamModule } from './modules/team/TeamModule.js';
import { renderReportsHubModule } from './modules/reports/ReportsHubModule.js';
import { renderLegalPagesModule } from './modules/legal/LegalPagesModule.js';
import { errorHandler } from './services/errorHandler.js';
import { periodStore } from './store/periodStore.js';

let currentModule = 'dashboard';
let deniedRouteInfo = null;

// Initialize Theme
const savedTheme = localStorage.getItem('ELIZA_THEME') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function getInitialModule() {
  const path = window.location.pathname.replace(/^\/|\/$/g, '');
  if (path === 'admin/users' || path === 'admin-users' || path === 'users' || path === 'admin') return 'admin-users';
  if (path === 'admin/developer' || path === 'developer-tools' || path === 'developer') return 'developer-tools';
  if (path && path !== 'index.html') return path;
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'admin/users' || hash === 'admin-users' || hash === 'users') return 'admin-users';
  if (hash === 'admin/developer' || hash === 'developer-tools' || hash === 'developer') return 'developer-tools';
  if (hash) return hash;
  return 'dashboard';
}

export function navigateTo(moduleKey) {
  // Graceful redirect for merged legacy modules
  if (moduleKey === 'amc') moduleKey = 'tickets';
  if (moduleKey === 'technicians') moduleKey = 'payouts';
  if (moduleKey === 'workspace-access' || moduleKey === 'users' || moduleKey === 'admin/users') moduleKey = 'admin-users';
  if (moduleKey === 'admin/developer' || moduleKey === 'developer') moduleKey = 'developer-tools';

  // Direct profile drawer trigger
  if (moduleKey === 'my-profile') {
    openProfileDrawer(auth.getCurrentUser());
    return;
  }

  // Runtime Route Guard check
  const user = auth.getCurrentUser();
  const routeCheck = permissionService.assertRouteAccess(user, moduleKey);

  if (!routeCheck.allowed) {
    currentModule = '403';
    deniedRouteInfo = {
      moduleKey,
      error: routeCheck.error,
      user
    };
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  currentModule = moduleKey;
  deniedRouteInfo = null;
  try {
    const newPath = moduleKey === 'dashboard' ? '/' : `/${moduleKey}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  } catch (e) {}
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleOpenAuth() {
  openAuthModal(null, () => renderApp());
}

function handleOpenSearch() {
  openSearchModal(navigateTo);
}

function render403View(container, info, onNavigate) {
  const actor = info?.user || auth.getCurrentUser() || { name: 'Current User', role: 'Staff' };
  const target = (info?.moduleKey || 'Restricted').toUpperCase();

  container.innerHTML = `
    <div style="padding: 48px 24px; text-align: center; max-width: 600px; margin: 40px auto; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid rgba(239, 68, 68, 0.35); box-shadow: 0 16px 36px rgba(0,0,0,0.35);">
      <div style="width: 68px; height: 68px; background: rgba(239, 68, 68, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #ef4444;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <h2 style="font-size: 24px; font-weight: 800; color: #ef4444; margin-bottom: 8px;">
        403 Access Denied: Unauthorized Route
      </h2>
      <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
        Your current session identity <strong>${actor.name} (${actor.role})</strong> does not possess the required RBAC capability to access the <strong>${target}</strong> console.
        This access rejection has been registered in the security audit ledger.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button id="btnReturnDashboard" class="btn btn-primary btn-sm" style="padding: 8px 20px;">
          Return to Executive Dashboard
        </button>
        <button id="btnOpenAuthSwitch" class="btn btn-secondary btn-sm" style="padding: 8px 20px;">
          Switch Workspace / Role
        </button>
      </div>
    </div>
  `;

  document.getElementById('btnReturnDashboard')?.addEventListener('click', () => {
    navigateTo('dashboard');
  });

  document.getElementById('btnOpenAuthSwitch')?.addEventListener('click', () => {
    handleOpenAuth();
  });
}

function renderApp() {
  const sidebarContainer = document.getElementById('sidebarContainer');
  const navbarContainer = document.getElementById('navbarContainer');
  const contentContainer = document.getElementById('mainContentContainer');

  if (!sidebarContainer || !navbarContainer || !contentContainer) return;

  renderSidebar(sidebarContainer, currentModule, navigateTo, handleOpenAuth);
  renderNavbar(navbarContainer, navigateTo, handleOpenSearch, handleOpenAuth);

  contentContainer.innerHTML = '';

  switch (currentModule) {
    case 'dashboard':
      renderDashboardModule(contentContainer, navigateTo);
      break;
    case 'calculators':
      renderCalculatorsModule(contentContainer, navigateTo);
      break;
    case 'quotation':
      renderQuotationModule(contentContainer);
      break;
    case 'crm':
      renderCrmModule(contentContainer);
      break;
    case 'projects':
      renderProjectsModule(contentContainer);
      break;
    case 'inventory':
      renderInventoryModule(contentContainer);
      break;
    case 'items':
      renderItemMasterModule(contentContainer, 'items');
      break;
    case 'parties':
      renderItemMasterModule(contentContainer, 'parties');
      break;
    case 'audit':
      renderAuditLogsModule(contentContainer);
      break;
    case 'settings':
      renderSettingsModule(contentContainer);
      break;

    // Super Admin User Governance & Developer Console
    case 'admin-users':
      renderAdminUsersModule(contentContainer, navigateTo);
      break;
    case 'developer-tools':
      renderDeveloperToolsModule(contentContainer, navigateTo);
      break;

    // 403 Forbidden Screen
    case '403':
      render403View(contentContainer, deniedRouteInfo, navigateTo);
      break;

    // Field Operations Suite
    case 'jobs':
      renderJobSheetsModule(contentContainer, navigateTo);
      break;
    case 'job-board':
      renderJobBoardModule(contentContainer, navigateTo);
      break;
    case 'tickets':
    case 'amc':
      renderTicketsModule(contentContainer, navigateTo);
      break;
    case 'payouts':
    case 'technicians':
      renderPayoutsModule(contentContainer, navigateTo);
      break;
    case 'team':
      renderTeamModule(contentContainer, navigateTo);
      break;
    case 'reports':
      renderReportsHubModule(contentContainer);
      break;
    case 'legal':
    case 'privacy':
    case 'terms':
      renderLegalPagesModule(contentContainer, currentModule === 'terms' ? 'terms' : 'privacy');
      break;

    default:
      renderDashboardModule(contentContainer, navigateTo);
      break;
  }
}

// Global Keyboard Shortcuts
initGlobalShortcuts(navigateTo, handleOpenSearch);

// Subscribe to store & auth changes
store.subscribe('state-changed', () => {
  const sidebarContainer = document.getElementById('sidebarContainer');
  const navbarContainer = document.getElementById('navbarContainer');
  if (sidebarContainer && navbarContainer) {
    renderSidebar(sidebarContainer, currentModule, navigateTo, handleOpenAuth);
    renderNavbar(navbarContainer, navigateTo, handleOpenSearch, handleOpenAuth);
  }
});

auth.subscribe(() => {
  renderApp();
});

// Re-render when Global Period & Date Range changes
periodStore.subscribe(() => {
  renderApp();
});

// App Entry Init
document.addEventListener('DOMContentLoaded', async () => {
  errorHandler.init();
  await peopleService.init();
  navigateTo(getInitialModule());
});

// Register PWA Service Worker in production / supported environments
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('PWA ServiceWorker registration failed:', err);
    });
  });
}

// Global Escape Key to dismiss mobile drawer and overlay
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      backdrop?.classList.remove('active');
      document.body.classList.remove('sidebar-drawer-open');
    }
  }
});
