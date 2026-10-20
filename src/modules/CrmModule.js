// CRM & Sales Pipeline Module
import { store } from '../services/store.js';
import { openJobDrawer } from './jobs/JobSheetsModule.js';
import { periodStore } from '../store/periodStore.js';
import { inRange } from '../services/periodService.js';
import { renderPagePeriodHeader } from '../components/PeriodPicker/PeriodPicker.js';

export function renderCrmModule(container) {
  let viewType = 'kanban'; // 'kanban' or 'table'
  let filterRep = 'all';
  let crmDateBasis = 'surveyDate';

  function updateView() {
    const allLeads = store.state.leads || [];
    const period = periodStore.getPagePeriod('crm');

    const periodLeads = allLeads.filter(l => {
      if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
        const rawDate = l[crmDateBasis] || l.surveyDate || l.createdAt;
        if (!rawDate) return false;
        const dateStr = String(rawDate).slice(0, 10);
        if (!inRange(dateStr, period)) return false;
      }
      return true;
    });

    const filteredLeads = filterRep === 'all' ? periodLeads : periodLeads.filter(l => l.assignedRep === filterRep);

    const totalQuoted = filteredLeads.reduce((sum, l) => sum + (Number(l.quotedValue) || 0), 0);
    const totalWeighted = filteredLeads.reduce((sum, l) => sum + ((Number(l.quotedValue) || 0) * (Number(l.winProb) || 0)), 0);
    const wonCount = filteredLeads.filter(l => l.stage === 'Won - Order Booked').length;

    const stages = [
      { id: 'New Inquiry', title: 'New Inquiry', prob: '10%' },
      { id: 'Site Survey Scheduled', title: 'Site Survey', prob: '30%' },
      { id: 'Quote Prepared', title: 'Quote Prepared', prob: '50%' },
      { id: 'Under Negotiation', title: 'Negotiation', prob: '75%' },
      { id: 'Won - Order Booked', title: 'Won - Booked', prob: '100%' },
      { id: 'Lost - Dropped', title: 'Lost / Dropped', prob: '0%' }
    ];

    container.innerHTML = `
      <div class="crm-module-view">
        <!-- Top Page Period Header -->
        <div id="crmPagePeriodContainer"></div>

        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(59, 130, 246, 0.25); color: #60a5fa; margin-bottom: 6px;">
                ● SALES & BIDDING TELEMETRY
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                CRM LEAD PIPELINE, WIN PROBABILITY & SALES FORECASTING
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Commercial & Government Opportunities across Panipat, Sonipat & Karnal districts.
              </p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="addNewLeadBtn" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Create New Lead
              </button>
            </div>
          </div>
        </div>

        <!-- Pipeline KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card">
            <span class="kpi-label">Total Quoted Pipeline</span>
            <div class="kpi-value" style="color: #38bdf8;">₹${totalQuoted.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">${filteredLeads.length} Tracked Leads</div>
          </div>
          <div class="kpi-card teal">
            <span class="kpi-label">Weighted Expected Value</span>
            <div class="kpi-value" style="color: #2dd4bf;">₹${Math.round(totalWeighted).toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Risk-Adjusted Probability</div>
          </div>
          <div class="kpi-card green">
            <span class="kpi-label">Won Orders Booked</span>
            <div class="kpi-value" style="color: #34d399;">${wonCount} Deals</div>
            <div class="kpi-subtitle">100% Win Probability</div>
          </div>
          <div class="kpi-card amber">
            <span class="kpi-label">Negotiation Stage</span>
            <div class="kpi-value" style="color: #fbbf24;">
              ${filteredLeads.filter(l => l.stage === 'Under Negotiation').length} Active
            </div>
            <div class="kpi-subtitle">75% Probability Closure</div>
          </div>
        </div>

        <!-- Controls Bar: View Toggle & Filters -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 3px;">
              <button id="viewKanbanBtn" class="btn btn-sm ${viewType === 'kanban' ? 'btn-primary' : 'btn-secondary'}" style="border: none;">
                Kanban Board
              </button>
              <button id="viewTableBtn" class="btn btn-sm ${viewType === 'table' ? 'btn-primary' : 'btn-secondary'}" style="border: none;">
                Ledger List
              </button>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; color: var(--text-dim); font-weight: 600;">Rep:</span>
              <select id="filterRepSelect" class="form-control" style="width: auto; padding: 4px 10px; font-size: 12.5px;">
                <option value="all">All Sales Executives</option>
                <option value="Aditya Sharma" ${filterRep === 'Aditya Sharma' ? 'selected' : ''}>Aditya Sharma</option>
                <option value="Sunil Verma" ${filterRep === 'Sunil Verma' ? 'selected' : ''}>Sunil Verma</option>
                <option value="Amit Sharma" ${filterRep === 'Amit Sharma' ? 'selected' : ''}>Amit Sharma</option>
                <option value="Deepak Saini" ${filterRep === 'Deepak Saini' ? 'selected' : ''}>Deepak Saini</option>
              </select>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11.5px; color: var(--text-muted);">
              Showing <strong>${filteredLeads.length}</strong> of ${allLeads.length} leads in period
            </span>
            ${(periodLeads.length < allLeads.length && period?.preset !== 'all_time') ? `
              <button id="clearCrmDateFilterBtn" class="btn btn-secondary btn-sm" style="padding: 2px 7px; font-size: 10.5px;">Clear / All Time</button>
            ` : ''}
          </div>
        </div>

        ${viewType === 'kanban' ? `
          <!-- Kanban Pipeline Board -->
          <div class="kanban-board">
            ${stages.map(st => {
              const stageLeads = filteredLeads.filter(l => l.stage === st.id);
              const stageTotal = stageLeads.reduce((s, l) => s + (Number(l.quotedValue) || 0), 0);
              return `
                <div class="kanban-column" data-stage-id="${st.id}">
                  <div class="kanban-header">
                    <div>
                      <div class="kanban-title">${st.title}</div>
                      <div style="font-size: 11px; color: var(--text-dim);">₹${Math.round(stageTotal / 1000)}k &bull; ${st.prob} Win</div>
                    </div>
                    <span class="kanban-count-pill">${stageLeads.length}</span>
                  </div>
                  <div class="kanban-cards-list">
                    ${stageLeads.map(lead => `
                      <div class="lead-card" draggable="true" data-lead-id="${lead.id}" title="Drag this card to move between pipeline stages">
                        <div class="lead-card-header">
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: var(--text-dim); cursor: grab; font-size: 11px;" title="Drag card">⠿</span>
                            <span class="lead-id-pill">${lead.id}</span>
                          </div>
                          <span class="status-pill status-progress" style="font-size: 10px;">${lead.source}</span>
                        </div>
                        <div class="lead-title">${lead.customer}</div>
                        <div class="lead-contact-line">
                          <span>${lead.contactPerson}</span> &bull; <span>${lead.phone}</span>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
                          Cams: <strong>${lead.estCams}</strong> | Rep: ${lead.assignedRep}
                        </div>
                        <div style="font-size: 11px; color: var(--text-dim); background: var(--bg-card-subtle); padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                          ${lead.actionItem}
                        </div>
                        <div class="lead-card-footer">
                          <div class="lead-value">₹${lead.quotedValue.toLocaleString('en-IN')}</div>
                          <div style="display: flex; gap: 4px;">
                            ${lead.stage === 'Won - Order Booked' ? `
                              <button class="btn btn-primary btn-sm convert-to-job-btn" data-lead-id="${lead.id}" title="Convert to Field Operations Job Sheet" style="padding: 2px 7px; font-size: 11px; background: #059669; border-color: #10b981;">
                                + Job
                              </button>
                            ` : `
                              <button class="btn btn-secondary btn-sm quick-advance-btn" data-lead-id="${lead.id}" title="Advance to Next Stage" style="padding: 2px 7px; font-size: 11px;">
                                &rarr;
                              </button>
                            `}
                            <button class="btn btn-secondary btn-sm edit-lead-btn" data-lead-id="${lead.id}" style="padding: 2px 7px; font-size: 11px;">
                              Edit
                            </button>
                            <button class="btn btn-secondary btn-sm delete-lead-row-btn" data-lead-id="${lead.id}" style="padding: 2px 6px; font-size: 11px; color: var(--red-accent);" title="Delete Opportunity">
                              &times;
                            </button>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                    ${stageLeads.length === 0 ? `
                      <div style="text-align: center; color: var(--text-dim); font-size: 12px; padding: 24px 0;">
                        No opportunities in this stage
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- Full Table Ledger View -->
          <div class="table-card">
            <div class="table-responsive">
              <table class="erp-table">
                <thead>
                  <tr>
                    <th>Lead ID</th>
                    <th>Customer Organization</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Source</th>
                    <th class="text-center">Cams</th>
                    <th class="text-right">Quoted Value (₹)</th>
                    <th class="text-center">Stage</th>
                    <th class="text-center">Win %</th>
                    <th class="text-right">Weighted (₹)</th>
                    <th>Next Follow-Up</th>
                    <th>Assigned Rep</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredLeads.map(l => {
                    const weighted = (Number(l.quotedValue) || 0) * (Number(l.winProb) || 0);
                    return `
                      <tr>
                        <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${l.id}</td>
                        <td style="font-weight: 600;">${l.customer}</td>
                        <td>${l.contactPerson}</td>
                        <td style="font-family: monospace; font-size: 11.5px;">${l.phone}</td>
                        <td><span class="status-pill status-progress" style="font-size: 11px;">${l.source}</span></td>
                        <td class="text-center" style="font-weight: 700;">${l.estCams}</td>
                        <td class="text-right" style="font-weight: 700; color: #38bdf8;">₹${l.quotedValue.toLocaleString('en-IN')}</td>
                        <td class="text-center"><span class="status-pill status-progress">${l.stage}</span></td>
                        <td class="text-center" style="font-weight: 700;">${Math.round(l.winProb * 100)}%</td>
                        <td class="text-right" style="font-weight: 700; color: #34d399;">₹${Math.round(weighted).toLocaleString('en-IN')}</td>
                        <td>${l.nextFollowUp}</td>
                        <td style="font-weight: 500;">${l.assignedRep}</td>
                        <td class="text-center" style="white-space: nowrap;">
                          ${l.stage === 'Won - Order Booked' ? `
                            <button class="btn btn-primary btn-sm convert-to-job-btn" data-lead-id="${l.id}" title="Convert to Field Operations Job Sheet" style="padding: 3px 7px; font-size: 11px; margin-right: 4px; background: #059669; border-color: #10b981;">
                              + Job
                            </button>
                          ` : ''}
                          <button class="btn btn-secondary btn-sm edit-lead-btn" data-lead-id="${l.id}" style="padding: 3px 7px; font-size: 11px;">Edit</button>
                          <button class="btn btn-secondary btn-sm delete-lead-row-btn" data-lead-id="${l.id}" style="padding: 3px 6px; font-size: 11px; color: var(--red-accent);" title="Delete Lead">&times;</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="6" class="text-right" style="font-weight: 700;">TOTAL PIPELINE REVENUE:</td>
                    <td class="text-right" style="font-size: 14px; font-weight: 800; color: #38bdf8;">₹${totalQuoted.toLocaleString('en-IN')}</td>
                    <td colspan="2"></td>
                    <td class="text-right" style="font-size: 14px; font-weight: 800; color: #34d399;">₹${Math.round(totalWeighted).toLocaleString('en-IN')}</td>
                    <td colspan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `}
      </div>
    `;

    const headerContainer = document.getElementById('crmPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'crm', {
      dateBasisOptions: [
        { key: 'surveyDate', label: 'Site Survey Date' },
        { key: 'createdAt', label: 'Lead Creation Date' },
        { key: 'nextFollowUp', label: 'Next Follow-up' }
      ],
      currentDateBasis: crmDateBasis,
      onDateBasisChange: (newBasis) => {
        crmDateBasis = newBasis;
        updateView();
      },
      onPeriodChange: () => {
        updateView();
      }
    });

    document.getElementById('clearCrmDateFilterBtn')?.addEventListener('click', () => {
      periodStore.setPagePeriod('crm', { preset: 'all_time' });
      updateView();
    });

    // Attach view listeners
    document.getElementById('viewKanbanBtn')?.addEventListener('click', () => {
      viewType = 'kanban';
      updateView();
    });

    document.getElementById('viewTableBtn')?.addEventListener('click', () => {
      viewType = 'table';
      updateView();
    });

    document.getElementById('filterRepSelect')?.addEventListener('change', (e) => {
      filterRep = e.target.value;
      updateView();
    });

    document.getElementById('addNewLeadBtn')?.addEventListener('click', () => {
      openLeadFormModal(null, () => updateView());
    });

    // Convert Won Lead to Field Job Sheet
    container.querySelectorAll('.convert-to-job-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-lead-id');
        const lead = store.state.leads.find(l => l.id === id);
        if (lead) {
          openJobDrawer({
            isPrefill: true,
            title: `Installation: ${lead.customer}`,
            clientName: lead.customer,
            camsCount: lead.estCams || 4,
            pointsCount: lead.estCams || 4,
            type: 'New Install',
            priority: 'High',
            notes: `Converted from CRM Won Lead ${lead.id}. Contact: ${lead.contactPerson} (${lead.phone})`
          }, () => updateView());
        }
      });
    });

    // Edit button listeners
    container.querySelectorAll('.edit-lead-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-lead-id');
        const lead = store.state.leads.find(l => l.id === id);
        if (lead) openLeadFormModal(lead, () => updateView());
      });
    });

    // Delete lead button listeners
    container.querySelectorAll('.delete-lead-row-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-lead-id');
        const lead = store.state.leads.find(l => l.id === id);
        if (lead && confirm(`Are you sure you want to delete lead ${id} for ${lead.customer}?`)) {
          store.deleteLead(id);
          updateView();
        }
      });
    });

    // Quick advance stage listener
    container.querySelectorAll('.quick-advance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-lead-id');
        const lead = store.state.leads.find(l => l.id === id);
        if (lead) {
          const stageOrder = [
            'New Inquiry',
            'Site Survey Scheduled',
            'Quote Prepared',
            'Under Negotiation',
            'Won - Order Booked'
          ];
          const currIdx = stageOrder.indexOf(lead.stage);
          if (currIdx !== -1 && currIdx < stageOrder.length - 1) {
            store.updateLeadStage(id, stageOrder[currIdx + 1]);
            updateView();
          }
        }
      });
    });

    // -------------------------------------------------------------------------
    // HTML5 DRAG & DROP FOR KANBAN CARDS
    // -------------------------------------------------------------------------
    container.querySelectorAll('.lead-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const leadId = card.getAttribute('data-lead-id');
        e.dataTransfer.setData('text/plain', leadId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.classList.add('is-dragging'), 0);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        container.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('kanban-dragover'));
      });
    });

    container.querySelectorAll('.kanban-column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      column.addEventListener('dragenter', (e) => {
        e.preventDefault();
        column.classList.add('kanban-dragover');
      });

      column.addEventListener('dragleave', (e) => {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove('kanban-dragover');
        }
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('kanban-dragover');
        const leadId = e.dataTransfer.getData('text/plain');
        const targetStage = column.getAttribute('data-stage-id');
        const lead = store.state.leads.find(l => l.id === leadId);

        if (lead && targetStage && lead.stage !== targetStage) {
          store.updateLeadStage(leadId, targetStage);
          updateView();
        }
      });
    });
  }

  updateView();
}

function openLeadFormModal(leadToEdit, onSaved) {
  const isEdit = !!leadToEdit;

  const modalHtml = `
    <div id="leadModalOverlay" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Opportunity ' + leadToEdit.id : 'Create New CRM Opportunity'}</h3>
          <button id="closeLeadModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <form id="leadModalForm">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Customer Organization Name</label>
              <input type="text" id="leadCustName" class="form-control" value="${isEdit ? leadToEdit.customer : ''}" placeholder="e.g. Haryana Warehousing Terminal" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Contact Person</label>
                <input type="text" id="leadContactPerson" class="form-control" value="${isEdit ? leadToEdit.contactPerson : ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="text" id="leadPhone" class="form-control" value="${isEdit ? leadToEdit.phone : '+91 '}" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Lead Source</label>
                <select id="leadSource" class="form-control">
                  <option value="Referral" ${isEdit && leadToEdit.source === 'Referral' ? 'selected' : ''}>Referral</option>
                  <option value="Government Bid" ${isEdit && leadToEdit.source === 'Government Bid' ? 'selected' : ''}>Government Bid</option>
                  <option value="Website Form" ${isEdit && leadToEdit.source === 'Website Form' ? 'selected' : ''}>Website Form</option>
                  <option value="Direct Cold Visit" ${isEdit && leadToEdit.source === 'Direct Cold Visit' ? 'selected' : ''}>Direct Cold Visit</option>
                  <option value="Indiamart" ${isEdit && leadToEdit.source === 'Indiamart' ? 'selected' : ''}>Indiamart</option>
                  <option value="Electrical Contractor" ${isEdit && leadToEdit.source === 'Electrical Contractor' ? 'selected' : ''}>Electrical Contractor</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Estimated Cameras</label>
                <input type="number" id="leadEstCams" class="form-control" value="${isEdit ? leadToEdit.estCams : 8}" min="1" required>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Quoted Deal Value (₹)</label>
                <input type="number" id="leadQuotedVal" class="form-control" value="${isEdit ? leadToEdit.quotedValue : 150000}" step="1000" required>
              </div>
              <div class="form-group">
                <label class="form-label">Pipeline Stage</label>
                <select id="leadStage" class="form-control">
                  <option value="New Inquiry" ${isEdit && leadToEdit.stage === 'New Inquiry' ? 'selected' : ''}>New Inquiry (10%)</option>
                  <option value="Site Survey Scheduled" ${isEdit && leadToEdit.stage === 'Site Survey Scheduled' ? 'selected' : ''}>Site Survey Scheduled (30%)</option>
                  <option value="Quote Prepared" ${isEdit && leadToEdit.stage === 'Quote Prepared' ? 'selected' : ''}>Quote Prepared (50%)</option>
                  <option value="Under Negotiation" ${isEdit && leadToEdit.stage === 'Under Negotiation' ? 'selected' : ''}>Under Negotiation (75%)</option>
                  <option value="Won - Order Booked" ${isEdit && leadToEdit.stage === 'Won - Order Booked' ? 'selected' : ''}>Won - Order Booked (100%)</option>
                  <option value="Lost - Dropped" ${isEdit && leadToEdit.stage === 'Lost - Dropped' ? 'selected' : ''}>Lost - Dropped (0%)</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Next Follow-Up Date</label>
                <input type="date" id="leadFollowUp" class="form-control" value="${isEdit ? leadToEdit.nextFollowUp : new Date().toISOString().split('T')[0]}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Assigned Representative</label>
                <select id="leadRep" class="form-control">
                  <option value="Aditya Sharma" ${isEdit && leadToEdit.assignedRep === 'Aditya Sharma' ? 'selected' : ''}>Aditya Sharma</option>
                  <option value="Sunil Verma" ${isEdit && leadToEdit.assignedRep === 'Sunil Verma' ? 'selected' : ''}>Sunil Verma</option>
                  <option value="Amit Sharma" ${isEdit && leadToEdit.assignedRep === 'Amit Sharma' ? 'selected' : ''}>Amit Sharma</option>
                  <option value="Deepak Saini" ${isEdit && leadToEdit.assignedRep === 'Deepak Saini' ? 'selected' : ''}>Deepak Saini</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Action Items & Next Steps</label>
              <input type="text" id="leadAction" class="form-control" value="${isEdit ? leadToEdit.actionItem : ''}" placeholder="e.g. Schedule site demo with principal & submit technical proposal">
            </div>
          </div>
          <div class="modal-footer">
            ${isEdit ? `
              <button type="button" id="deleteLeadBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                Delete Opportunity
              </button>
            ` : ''}
            <button type="button" id="cancelLeadBtn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('leadModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeLeadModalBtn')?.addEventListener('click', close);
  document.getElementById('cancelLeadBtn')?.addEventListener('click', close);

  if (isEdit) {
    document.getElementById('deleteLeadBtn')?.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete lead ${leadToEdit.id}?`)) {
        store.deleteLead(leadToEdit.id);
        close();
        if (onSaved) onSaved();
      }
    });
  }

  document.getElementById('leadModalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      customer: document.getElementById('leadCustName').value,
      contactPerson: document.getElementById('leadContactPerson').value,
      phone: document.getElementById('leadPhone').value,
      source: document.getElementById('leadSource').value,
      estCams: Number(document.getElementById('leadEstCams').value) || 1,
      quotedValue: Number(document.getElementById('leadQuotedVal').value) || 0,
      stage: document.getElementById('leadStage').value,
      nextFollowUp: document.getElementById('leadFollowUp').value,
      assignedRep: document.getElementById('leadRep').value,
      actionItem: document.getElementById('leadAction').value || 'Pending follow-up'
    };

    if (isEdit) {
      store.updateLead(leadToEdit.id, data);
    } else {
      data.surveyDate = new Date().toISOString().split('T')[0];
      store.addLead(data);
    }

    close();
    if (onSaved) onSaved();
  });
}
