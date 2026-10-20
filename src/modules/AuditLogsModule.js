// System Security & Audit Trail Ledger Module
import { store } from '../services/store.js';

export function renderAuditLogsModule(container) {
  let filterModule = 'ALL';
  let searchTerm = '';

  function updateView() {
    const logs = store.state.auditLogs;

    const filteredLogs = logs.filter(l => {
      const matchMod = filterModule === 'ALL' || l.module === filterModule;
      const matchSearch = !searchTerm ||
        l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMod && matchSearch;
    });

    container.innerHTML = `
      <div class="audit-logs-module-view">
        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(59, 130, 246, 0.25); color: #60a5fa; margin-bottom: 6px;">
                ● SECURITY & EVENT AUDITING ENGINE
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                ENTERPRISE SYSTEM AUDIT LOGS & ACCESS AUDIT TRAIL
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Chronological immutable event ledger recording user logins, status transitions, quote generations & stock mutations.
              </p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="exportLogsCsvBtn" class="btn btn-secondary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export CSV Ledger
              </button>
            </div>
          </div>
        </div>

        <!-- Filter & Search Strip -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 280px;">
            <input type="text" id="logSearchInput" class="form-control" placeholder="Search audit logs by user, action, details..." value="${searchTerm}" style="max-width: 380px;">
            <select id="logModuleFilter" class="form-control" style="width: auto;">
              <option value="ALL" ${filterModule === 'ALL' ? 'selected' : ''}>All System Modules</option>
              <option value="AUTH" ${filterModule === 'AUTH' ? 'selected' : ''}>AUTH (Logins / Sessions)</option>
              <option value="CRM" ${filterModule === 'CRM' ? 'selected' : ''}>CRM (Leads & Pipelines)</option>
              <option value="QUOTATION" ${filterModule === 'QUOTATION' ? 'selected' : ''}>QUOTATION (BOQ Studio)</option>
              <option value="PROJECTS" ${filterModule === 'PROJECTS' ? 'selected' : ''}>PROJECTS (Costing & P&L)</option>
              <option value="AMC" ${filterModule === 'AMC' ? 'selected' : ''}>AMC (Contracts & SLA)</option>
              <option value="INVENTORY" ${filterModule === 'INVENTORY' ? 'selected' : ''}>INVENTORY (Stocks & POs)</option>
              <option value="TECHNICIANS" ${filterModule === 'TECHNICIANS' ? 'selected' : ''}>TECHNICIANS (Payouts)</option>
            </select>
          </div>
          <span style="font-size: 12px; color: var(--text-dim); font-weight: 600;">
            ${filteredLogs.length} Logged Audit Events
          </span>
        </div>

        <!-- Audit Table -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th class="text-center">Module</th>
                  <th class="text-center">Action Code</th>
                  <th>Audit Event Summary & Metadata</th>
                  <th class="text-center">Terminal IP</th>
                </tr>
              </thead>
              <tbody>
                ${filteredLogs.map(l => {
                  let badgeClass = 'status-progress';
                  if (l.action.includes('LOGIN') || l.action.includes('WON') || l.action.includes('RESOLVED')) badgeClass = 'status-instock';
                  if (l.action.includes('ALERT') || l.action.includes('EXPIRED') || l.action.includes('DELETE')) badgeClass = 'status-reorder';
                  if (l.action.includes('UPDATE') || l.action.includes('PAYOUT')) badgeClass = 'status-pending';

                  return `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--blue-accent); font-weight: 700;">${l.id}</td>
                      <td style="font-family: monospace; font-size: 11.5px; color: var(--text-dim);">${l.timestamp}</td>
                      <td style="font-weight: 600;">${l.user}</td>
                      <td><span class="status-pill status-progress" style="font-size: 10.5px;">${l.role}</span></td>
                      <td class="text-center" style="font-weight: 700; font-size: 11px;">${l.module}</td>
                      <td class="text-center"><span class="status-pill ${badgeClass}" style="font-size: 10px;">${l.action}</span></td>
                      <td style="font-size: 12.5px;">${l.details}</td>
                      <td class="text-center" style="font-family: monospace; font-size: 11px; color: var(--text-dim);">${l.ip || '192.168.1.1'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('logSearchInput')?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      updateView();
      const inp = document.getElementById('logSearchInput');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    });

    document.getElementById('logModuleFilter')?.addEventListener('change', (e) => {
      filterModule = e.target.value;
      updateView();
    });

    // CSV Export
    document.getElementById('exportLogsCsvBtn')?.addEventListener('click', () => {
      let csv = 'ID,Timestamp,User,Role,Module,Action,Details,IP\n';
      filteredLogs.forEach(l => {
        csv += `"${l.id}","${l.timestamp}","${l.user}","${l.role}","${l.module}","${l.action}","${l.details.replace(/"/g, '""')}","${l.ip}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eliza_erp_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  updateView();
}
