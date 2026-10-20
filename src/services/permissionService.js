// Permission Service - Runtime Guard & Capability Evaluator
import { auth } from './auth.js';
import { auditService } from './auditService.js';
import { ROLES, normalizeRole, DEFAULT_PERMISSION_MATRIX, MODULE_TO_RESOURCE } from '../config/permissions.js';

const CUSTOM_PERMISSIONS_KEY = 'ELIZA_CUSTOM_PERMISSIONS_V1';

export class PermissionService {
  constructor() {
    this.matrix = this._loadMatrix();
  }

  _loadMatrix() {
    try {
      const saved = localStorage.getItem(CUSTOM_PERMISSIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load custom permissions matrix', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX));
  }

  _persist() {
    try {
      localStorage.setItem(CUSTOM_PERMISSIONS_KEY, JSON.stringify(this.matrix));
    } catch (e) {
      console.error('Failed to save permissions matrix', e);
    }
  }

  resetToDefaults(currentUser = null) {
    this.matrix = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_MATRIX));
    this._persist();
    if (currentUser) {
      auditService.log({
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'PERMISSIONS_RESET_DEFAULTS',
        targetType: 'SYSTEM',
        details: 'Super Admin reset all role permissions to default system matrix.'
      });
    }
    return this.matrix;
  }

  togglePermission(resource, role, action, enabled, currentUser = null) {
    const canonicalRole = normalizeRole(role);
    if (!this.matrix[resource]) this.matrix[resource] = {};
    if (!this.matrix[resource][canonicalRole]) this.matrix[resource][canonicalRole] = [];

    const list = this.matrix[resource][canonicalRole];
    const exists = list.includes(action);

    if (enabled && !exists) {
      list.push(action);
    } else if (!enabled && exists) {
      this.matrix[resource][canonicalRole] = list.filter(a => a !== action);
    }
    this._persist();

    if (currentUser) {
      auditService.log({
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'PERMISSION_TOGGLED',
        targetType: 'ROLE_PERMISSION',
        details: `${enabled ? 'Granted' : 'Revoked'} '${action}' on '${resource}' for role '${canonicalRole}'`
      });
    }
    return this.matrix;
  }

  /**
   * Check if a given user can perform an action on a resource.
   */
  can(user, resource, action = 'read') {
    if (!user) return false;
    const role = (user.role && normalizeRole(user.role) === ROLES.SUPER_ADMIN)
      ? ROLES.SUPER_ADMIN
      : normalizeRole(user.role || user.roleCode);

    // Super Admin has universal capability
    if (role === ROLES.SUPER_ADMIN) return true;

    // Check custom/default matrix
    const resourceRules = this.matrix[resource];
    if (!resourceRules) return false;

    const allowedActions = resourceRules[role] || [];
    if (allowedActions.includes(action)) return true;

    // Scoped own checks
    if (action === 'read' && (allowedActions.includes('read_own') || allowedActions.includes('read_limited'))) {
      return true;
    }
    if (action === 'update' && allowedActions.includes('update_own')) {
      return true;
    }

    return false;
  }

  /**
   * Route Guard: Evaluates if a user can navigate to a specific module
   */
  canAccessRoute(user, moduleKey) {
    if (!user) return false;
    const role = (user.role && normalizeRole(user.role) === ROLES.SUPER_ADMIN)
      ? ROLES.SUPER_ADMIN
      : normalizeRole(user.role || user.roleCode);

    // Super Admin can access every route
    if (role === ROLES.SUPER_ADMIN) return true;

    // Restricted routes: user management and developer console are strictly Super Admin
    if (moduleKey === 'admin-users' || moduleKey === 'users' || moduleKey === 'developer-tools' || moduleKey === 'admin/developer') {
      return false;
    }

    const resource = MODULE_TO_RESOURCE[moduleKey];
    if (resource === null) return true; // Open modules (dashboard, calculators)
    if (!resource) return true;

    return this.can(user, resource, 'read');
  }

  /**
   * Assert route access. Throws 403 error and logs to auditService if rejected.
   */
  assertRouteAccess(user, moduleKey) {
    const allowed = this.canAccessRoute(user, moduleKey);
    if (!allowed) {
      const actorName = user?.name || 'Anonymous User';
      const actorRole = user?.role || 'Guest';

      auditService.log({
        actorName,
        actorRole,
        action: 'ACCESS_DENIED_403',
        targetType: 'ROUTE',
        targetId: moduleKey,
        targetName: `Module: ${moduleKey}`,
        details: `Unauthorized attempt by ${actorName} (${actorRole}) to access restricted route '${moduleKey}'.`,
        status: 'FORBIDDEN'
      });

      return {
        allowed: false,
        statusCode: 403,
        error: '403 Access Denied: You do not have permission to access this module.'
      };
    }
    return { allowed: true };
  }
}

export const permissionService = new PermissionService();
