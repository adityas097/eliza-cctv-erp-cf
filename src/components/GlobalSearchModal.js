// Global Quick-Search Modal Component (Ctrl+K)
import { store } from '../services/store.js';
import { periodStore } from '../store/periodStore.js';
import { inRange, formatDisplayDate } from '../services/periodService.js';

export function openSearchModal(onNavigate) {
  const existing = document.getElementById('globalSearchOverlay');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="globalSearchOverlay" class="modal-overlay">
      <div class="modal-card" style="max-width: 600px; padding: 0;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--blue-accent);">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="globalSearchInput" placeholder="Search across leads, projects, SKUs, tickets..." style="background: none; border: none; outline: none; color: var(--text-main); font-size: 15px; width: 100%; font-family: inherit;">
          <span class="search-kbd">ESC</span>
        </div>
        <div id="searchResultsContainer" style="max-height: 400px; overflow-y: auto; padding: 12px;">
          <div style="padding: 30px; text-align: center; color: var(--text-dim); font-size: 13px;">
            Type at least 2 characters to search CRM leads, projects, price book SKUs & tickets...
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('globalSearchOverlay');
  const input = document.getElementById('globalSearchInput');
  const resultsContainer = document.getElementById('searchResultsContainer');

  input.focus();

  const handleClose = () => {
    overlay.remove();
    document.removeEventListener('keydown', keydownHandler);
  };

  const keydownHandler = (e) => {
    if (e.key === 'Escape') handleClose();
  };

  document.addEventListener('keydown', keydownHandler);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) handleClose();
  });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      resultsContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-dim); font-size: 13px;">
          Type at least 2 characters to search Jobs, Tickets, Staff, Payouts, CRM leads & SKUs...
        </div>
      `;
      return;
    }

    // 1. Field Operations Jobs
    const matchedJobs = (store.state.jobs || []).filter(j =>
      (j.id || '').toLowerCase().includes(q) ||
      (j.title || '').toLowerCase().includes(q) ||
      (j.clientName || '').toLowerCase().includes(q) ||
      (j.siteAddress || '').toLowerCase().includes(q)
    ).slice(0, 4);

    // 2. Service Tickets & SLA
    const matchedTickets = (store.state.tickets || []).filter(t =>
      (t.id || t.ticketId || '').toLowerCase().includes(q) ||
      (t.clientName || t.client || '').toLowerCase().includes(q) ||
      (t.issue || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    ).slice(0, 4);

    // 3. Employees / Team Master
    const matchedEmployees = (store.state.employees || []).filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.phone || '').toLowerCase().includes(q) ||
      (e.id || '').toLowerCase().includes(q)
    ).slice(0, 4);

    // 4. Payouts & Ledgers
    const matchedPayouts = (store.state.payouts || []).filter(p =>
      (p.id || '').toLowerCase().includes(q) ||
      (p.employeeName || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q) ||
      (p.remarks || '').toLowerCase().includes(q)
    ).slice(0, 4);

    // 5. CRM Leads
    const matchedLeads = (store.state.leads || []).filter(l =>
      (l.customer || '').toLowerCase().includes(q) ||
      (l.contactPerson || '').toLowerCase().includes(q) ||
      (l.id || l.leadId || '').toLowerCase().includes(q)
    ).slice(0, 3);

    // 6. Projects P&L
    const matchedProjects = (store.state.projects || []).filter(p =>
      (p.client || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q) ||
      (p.scope || '').toLowerCase().includes(q)
    ).slice(0, 3);

    // 7. Master SKUs
    const matchedItems = (store.state.items || []).filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    ).slice(0, 3);

    const currentPeriod = periodStore.getPeriod();
    const getDateBadge = (dateStr) => {
      if (!dateStr) return '';
      const clean = String(dateStr).slice(0, 10);
      const isOutside = currentPeriod && currentPeriod.preset !== 'all_time' && !inRange(clean, currentPeriod);
      return `
        <span style="font-size: 10px; color: var(--text-dim); margin-left: 6px;">
          &bull; ${formatDisplayDate(clean)}
          ${isOutside ? `<span style="font-size: 9px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 1px 5px; border-radius: 4px; font-weight: 700; margin-left: 4px;">outside current period</span>` : ''}
        </span>
      `;
    };

    let html = '';

    if (matchedJobs.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #38bdf8; padding: 6px 10px;">Field Operations Jobs</div>`;
      matchedJobs.forEach(j => {
        html += `
          <div class="search-result-item" data-mod="jobs" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${j.title}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${j.id} &bull; ${j.clientName} &bull; ${j.type} ${getDateBadge(j.scheduledStart || j.createdAt)}</div>
            </div>
            <span class="status-pill status-instock" style="font-size: 10.5px;">${j.status}</span>
          </div>
        `;
      });
    }

    if (matchedTickets.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #fbbf24; padding: 6px 10px; margin-top: 8px;">Service Tickets & SLA</div>`;
      matchedTickets.forEach(t => {
        const tid = t.id || t.ticketId;
        const cname = t.clientName || t.client;
        html += `
          <div class="search-result-item" data-mod="tickets" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${tid}: ${t.issue}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${cname} &bull; ${t.category} &bull; ${t.status} ${getDateBadge(t.loggedAt || t.createdAt)}</div>
            </div>
            <span class="status-pill ${t.severity === 'Critical' ? 'status-urgent' : 'status-reorder'}" style="font-size: 10.5px;">${t.severity}</span>
          </div>
        `;
      });
    }

    if (matchedEmployees.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #34d399; padding: 6px 10px; margin-top: 8px;">Staff & Field Technicians</div>`;
      matchedEmployees.forEach(e => {
        html += `
          <div class="search-result-item" data-mod="team" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${e.name} (${e.role})</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${e.id} &bull; ${e.phone} &bull; ${e.payType} @ ₹${Number(e.defaultRate).toLocaleString('en-IN')}</div>
            </div>
            <span class="status-pill status-instock" style="font-size: 10.5px;">${e.active ? 'Active' : 'Inactive'}</span>
          </div>
        `;
      });
    }

    if (matchedPayouts.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #a78bfa; padding: 6px 10px; margin-top: 8px;">Payout Records & Ledgers</div>`;
      matchedPayouts.forEach(p => {
        html += `
          <div class="search-result-item" data-mod="payouts" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${p.id}: ${p.type} (${p.employeeName})</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${p.date} &bull; ${p.remarks || 'No remarks'} ${getDateBadge(p.date)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: 700; color: #34d399;">₹${Number(p.amount).toLocaleString('en-IN')}</div>
              <span class="status-pill ${p.status === 'Paid' ? 'status-completed' : 'status-progress'}" style="font-size: 10px;">${p.status}</span>
            </div>
          </div>
        `;
      });
    }

    if (matchedLeads.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); padding: 6px 10px; margin-top: 8px;">CRM Opportunities</div>`;
      matchedLeads.forEach(l => {
        html += `
          <div class="search-result-item" data-mod="crm" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${l.customer}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${l.id || l.leadId} &bull; ${l.contactPerson} &bull; Stage: ${l.stage} ${getDateBadge(l.createdAt || l.date)}</div>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #38bdf8;">₹${Number(l.quotedValue).toLocaleString('en-IN')}</div>
          </div>
        `;
      });
    }

    if (matchedProjects.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); padding: 6px 10px; margin-top: 8px;">Active Projects (P&L)</div>`;
      matchedProjects.forEach(p => {
        html += `
          <div class="search-result-item" data-mod="projects" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${p.client}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${p.id} &bull; ${p.scope} &bull; ${p.status} ${getDateBadge(p.orderDate || p.createdAt)}</div>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #34d399;">₹${Number(p.quoted).toLocaleString('en-IN')}</div>
          </div>
        `;
      });
    }

    if (matchedItems.length) {
      html += `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); padding: 6px 10px; margin-top: 8px;">Item Master & Rates</div>`;
      matchedItems.forEach(i => {
        html += `
          <div class="search-result-item" data-mod="items" style="padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s;">
            <div>
              <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main);">${i.name}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${i.sku} &bull; ${i.category} &bull; HSN: ${i.hsn}</div>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #fbbf24;">₹${Number(i.retailSelling).toLocaleString('en-IN')}</div>
          </div>
        `;
      });
    }

    if (!html) {
      html = `<div style="padding: 30px; text-align: center; color: var(--text-dim); font-size: 13px;">No results found for "${q}".</div>`;
    }

    resultsContainer.innerHTML = html;

    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-card-hover)');
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');
      item.addEventListener('click', () => {
        const mod = item.getAttribute('data-mod');
        handleClose();
        if (onNavigate && mod) onNavigate(mod);
      });
    });
  });
}
