// Role-Based Access Control (RBAC) Permission Matrix & Resource Definitions
// Single source of truth for module access, data actions, and UI constraints.

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  ACCOUNTS: 'ACCOUNTS',
  SALES_EXEC: 'SALES_EXEC',
  TECHNICIAN: 'TECHNICIAN',
  HELPER: 'HELPER',
  VIEWER: 'VIEWER'
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.ACCOUNTS]: 'Accounts',
  [ROLES.SALES_EXEC]: 'Sales Executive',
  [ROLES.TECHNICIAN]: 'Technician',
  [ROLES.HELPER]: 'Helper',
  [ROLES.VIEWER]: 'Viewer'
};

export const ROLE_BADGE_COLORS = {
  [ROLES.SUPER_ADMIN]: '#3b82f6',
  [ROLES.ADMIN]: '#10b981',
  [ROLES.SUPERVISOR]: '#06b6d4',
  [ROLES.ACCOUNTS]: '#8b5cf6',
  [ROLES.SALES_EXEC]: '#f59e0b',
  [ROLES.TECHNICIAN]: '#ec4899',
  [ROLES.HELPER]: '#64748b',
  [ROLES.VIEWER]: '#94a3b8'
};

// Normalize any incoming string (e.g. 'Super Admin', 'ADMIN', 'ops') to canonical role enum
export function normalizeRole(roleStr) {
  if (!roleStr) return ROLES.VIEWER;
  const s = String(roleStr).trim().toUpperCase().replace(/[\s-]/g, '_');
  if (ROLES[s]) return ROLES[s];
  if (s.includes('SUPER') && s.includes('ADMIN')) return ROLES.SUPER_ADMIN;
  if (s.includes('ADMIN')) return ROLES.ADMIN;
  if (s.includes('SUPERVISOR') || s.includes('OPS') || s.includes('MANAGER')) return ROLES.SUPERVISOR;
  if (s.includes('ACCOUNT')) return ROLES.ACCOUNTS;
  if (s.includes('SALES')) return ROLES.SALES_EXEC;
  if (s.includes('TECH') || s.includes('ENGINEER')) return ROLES.TECHNICIAN;
  if (s.includes('HELP')) return ROLES.HELPER;
  return ROLES.VIEWER;
}

// Canonical Default Permissions Matrix (Resource x Action)
export const DEFAULT_PERMISSION_MATRIX = {
  user_management: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: [],
    [ROLES.SUPERVISOR]: [],
    [ROLES.ACCOUNTS]: [],
    [ROLES.SALES_EXEC]: [],
    [ROLES.TECHNICIAN]: [],
    [ROLES.HELPER]: [],
    [ROLES.VIEWER]: []
  },
  team_directory: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['read', 'update'], // Read + edit non-sensitive
    [ROLES.SUPERVISOR]: ['read'],
    [ROLES.ACCOUNTS]: ['read'],
    [ROLES.SALES_EXEC]: ['read'],
    [ROLES.TECHNICIAN]: ['read_limited'],
    [ROLES.HELPER]: ['read_limited'],
    [ROLES.VIEWER]: ['read_limited']
  },
  own_profile: {
    [ROLES.SUPER_ADMIN]: ['read', 'update'],
    [ROLES.ADMIN]: ['read', 'update'],
    [ROLES.SUPERVISOR]: ['read', 'update'],
    [ROLES.ACCOUNTS]: ['read', 'update'],
    [ROLES.SALES_EXEC]: ['read', 'update'],
    [ROLES.TECHNICIAN]: ['read', 'update'],
    [ROLES.HELPER]: ['read', 'update'],
    [ROLES.VIEWER]: ['read', 'update']
  },
  pay_rates: {
    [ROLES.SUPER_ADMIN]: ['read', 'update'],
    [ROLES.ADMIN]: ['read'],
    [ROLES.SUPERVISOR]: [],
    [ROLES.ACCOUNTS]: ['read', 'update'],
    [ROLES.SALES_EXEC]: [],
    [ROLES.TECHNICIAN]: ['read_own'],
    [ROLES.HELPER]: ['read_own'],
    [ROLES.VIEWER]: []
  },
  jobs_kanban: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.SUPERVISOR]: ['create', 'read', 'update', 'delete'],
    [ROLES.ACCOUNTS]: ['read'],
    [ROLES.SALES_EXEC]: ['read'],
    [ROLES.TECHNICIAN]: ['read_own', 'update_own'],
    [ROLES.HELPER]: ['read_own'],
    [ROLES.VIEWER]: ['read']
  },
  tickets: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.SUPERVISOR]: ['create', 'read', 'update', 'delete'],
    [ROLES.ACCOUNTS]: ['read'],
    [ROLES.SALES_EXEC]: ['read'],
    [ROLES.TECHNICIAN]: ['read_own', 'update_own'],
    [ROLES.HELPER]: ['read_own'],
    [ROLES.VIEWER]: ['read']
  },
  payouts_ledgers: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.SUPERVISOR]: ['read'],
    [ROLES.ACCOUNTS]: ['create', 'read', 'update', 'delete'],
    [ROLES.SALES_EXEC]: [],
    [ROLES.TECHNICIAN]: ['read_own'],
    [ROLES.HELPER]: ['read_own'],
    [ROLES.VIEWER]: []
  },
  crm_quotations: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.SUPERVISOR]: ['read'],
    [ROLES.ACCOUNTS]: ['read'],
    [ROLES.SALES_EXEC]: ['create', 'read', 'update', 'delete'],
    [ROLES.TECHNICIAN]: [],
    [ROLES.HELPER]: [],
    [ROLES.VIEWER]: ['read']
  },
  settings_roles: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['read'],
    [ROLES.SUPERVISOR]: [],
    [ROLES.ACCOUNTS]: [],
    [ROLES.SALES_EXEC]: [],
    [ROLES.TECHNICIAN]: [],
    [ROLES.HELPER]: [],
    [ROLES.VIEWER]: []
  }
};

// Map legacy or sidebar module names to permissions resources
export const MODULE_TO_RESOURCE = {
  'admin-users': 'user_management',
  'team': 'team_directory',
  'my-profile': 'own_profile',
  'payouts': 'payouts_ledgers',
  'technicians': 'payouts_ledgers',
  'jobs': 'jobs_kanban',
  'job-board': 'jobs_kanban',
  'tickets': 'tickets',
  'amc': 'tickets',
  'crm': 'crm_quotations',
  'quotation': 'crm_quotations',
  'projects': 'jobs_kanban',
  'settings': 'settings_roles',
  'dashboard': null, // Open to all authenticated users
  'calculators': null, // Open to all authenticated users
  'inventory': 'jobs_kanban',
  'items': 'crm_quotations',
  'parties': 'crm_quotations',
  'reports': 'payouts_ledgers',
  'audit': 'user_management'
};
