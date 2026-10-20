// Security & Administrative Audit Logging Service
// Immutable logging of permission changes, security breaches, logins, and profile edits

const AUDIT_STORAGE_KEY = 'ELIZA_SECURITY_AUDIT_LOGS_V1';

export class AuditService {
  constructor() {
    this.logs = this._loadLogs();
  }

  _loadLogs() {
    try {
      const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    }
    return [
      {
        id: 'aud_seed_01',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        actorName: 'Aditya Sharma',
        actorRole: 'Super Admin',
        action: 'SYSTEM_INITIALIZED',
        targetType: 'SYSTEM',
        targetId: 'root',
        targetName: 'Eliza CCTV Enterprise ERP',
        details: 'Unified people and access control system initialized with Apex Super Admin safeguards.',
        ip: '127.0.0.1 (Local)',
        status: 'SUCCESS'
      }
    ];
  }

  _persist() {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to persist audit logs', e);
    }
  }

  log({ actorName, actorRole, action, targetType = 'USER', targetId = '', targetName = '', details = '', before = null, after = null, status = 'SUCCESS' }) {
    const entry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorName: actorName || 'System',
      actorRole: actorRole || 'System',
      action,
      targetType,
      targetId,
      targetName,
      details,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
      ip: '127.0.0.1 (Local)',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Test',
      status
    };

    this.logs.unshift(entry);
    // Keep max 1000 entries
    if (this.logs.length > 1000) this.logs.pop();
    this._persist();
    return entry;
  }

  getLogs(filterFn = null) {
    if (typeof filterFn === 'function') {
      return this.logs.filter(filterFn);
    }
    return [...this.logs];
  }

  exportLogsJson() {
    return JSON.stringify(this.logs, null, 2);
  }

  exportLogsCsv() {
    const headers = ['Audit ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Target', 'Details', 'Status'];
    const rows = this.logs.map(l => [
      l.id,
      l.timestamp,
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      l.actorRole,
      l.action,
      `"${(l.targetName || l.targetId || '').replace(/"/g, '""')}"`,
      `"${(typeof l.details === 'string' ? l.details : JSON.stringify(l.details)).replace(/"/g, '""')}"`,
      l.status
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const auditService = new AuditService();
