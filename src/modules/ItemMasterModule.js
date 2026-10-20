// Central Item Master & Client/Vendor Party Master Suite (Full CRUD)
import { store } from '../services/store.js';

export function renderItemMasterModule(container, initialTab = 'items') {
  let activeTab = initialTab; // 'items' | 'parties'
  let activeCategory = 'All';
  let searchTerm = '';
  let partySearchTerm = '';

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.erp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'erp-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${type === 'success' ? '#34d399' : '#38bdf8'}" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function updateView() {
    const items = store.state.items || [];
    const parties = store.state.parties || [];
    const categories = ['All', ...new Set(items.map(i => i.category).filter(Boolean))];

    // =========================================================================
    // RENDER PARTIES MASTER TAB
    // =========================================================================
    if (activeTab === 'parties') {
      const filteredParties = parties.filter(p => {
        if (!partySearchTerm) return true;
        const q = partySearchTerm.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) ||
          (p.contactPerson || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.site || '').toLowerCase().includes(q) ||
          (p.gstin || '').toLowerCase().includes(q) ||
          (p.department || '').toLowerCase().includes(q);
      });

      container.innerHTML = `
        <div class="item-master-module-view">
          <!-- Master Switcher Tabs -->
          <div class="quotation-tabs-nav">
            <button id="tabToItemsBtn" class="quotation-tab-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              Hardware & Items Master (${items.length} SKUs)
            </button>
            <button id="tabToPartiesBtn" class="quotation-tab-btn active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Client & Vendor Parties Master (${parties.length} Registered)
            </button>
          </div>

          <!-- Hero Banner -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div>
                <span class="status-pill status-instock" style="background: rgba(37, 99, 235, 0.25); color: #60a5fa; margin-bottom: 6px;">
                  ● CORPORATE ENTITY REPOSITORY • FULL CRUD
                </span>
                <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                  CLIENT, PSU & VENDOR PARTIES MASTER DIRECTORY
                </h2>
                <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                  Centrally manage statutory GST details, site locations, procurement representatives & commercial terms.
                </p>
              </div>
              <button id="addNewPartyBtn" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                + Register New Party
              </button>
            </div>
          </div>

          <!-- Metrics Strip -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Total Registered Parties</div>
              <div style="font-size: 24px; font-weight: 800; color: #38bdf8; margin-top: 4px;">${parties.length} Accounts</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Panipat & Sonipat Territory</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Government / Utilities</div>
              <div style="font-size: 24px; font-weight: 800; color: #34d399; margin-top: 4px;">3 PSUs</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">UHBVN, HSAMB, Sugar Mills</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Industrial & Cold Chain</div>
              <div style="font-size: 24px; font-weight: 800; color: #fbbf24; margin-top: 4px;">5 Facilities</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Textiles, Steel, Food Parks</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Intra-State GST Compliant</div>
              <div style="font-size: 24px; font-weight: 800; color: #a855f7; margin-top: 4px;">100% (06)</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Haryana Supply Place</div>
            </div>
          </div>

          <!-- Search & Filter Bar -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="flex: 1; min-width: 280px; position: relative;">
              <input type="text" id="partySearchInput" class="form-control" placeholder="Search party by name, representative, GSTIN, phone, site..." value="${partySearchTerm}">
            </div>
            <span style="font-size: 12.5px; color: var(--text-muted); font-weight: 600;">
              Showing ${filteredParties.length} of ${parties.length} Registered Accounts
            </span>
          </div>

          <!-- Parties Table -->
          <div class="table-card">
            <div class="table-responsive">
              <table class="erp-table">
                <thead>
                  <tr>
                    <th>Party ID</th>
                    <th>Client / Organization Name</th>
                    <th>Contact Representative & Phone</th>
                    <th>Department / Wing</th>
                    <th>Installation Site Premises</th>
                    <th class="text-center">GSTIN</th>
                    <th>Place of Supply</th>
                    <th class="text-center" style="width: 140px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredParties.length === 0 ? `
                    <tr>
                      <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        No registered parties match your search query.
                      </td>
                    </tr>
                  ` : filteredParties.map(p => `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${p.id}</td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">${p.name}</div>
                        <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${p.notes || 'Registered Account'}</div>
                      </td>
                      <td>
                        <div style="font-weight: 600; color: #f8fafc; font-size: 12.5px;">${p.contactPerson || 'Authorized Rep'}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); font-family: monospace;">${p.phone || '+91 98000-00000'}</div>
                        ${p.email ? `<div style="font-size: 11px; color: var(--text-dim);">${p.email}</div>` : ''}
                      </td>
                      <td style="font-size: 12px; color: var(--text-muted);">${p.department || 'Operations'}</td>
                      <td style="font-size: 12px; color: var(--text-main); max-width: 220px;">${p.site || 'Haryana'}</td>
                      <td class="text-center" style="font-family: monospace; font-size: 11.5px; color: #38bdf8;">
                        ${p.gstin || 'UNREGISTERED'}
                      </td>
                      <td style="font-size: 11.5px; color: var(--text-dim);">${p.placeOfSupply || 'Haryana (06)'}</td>
                      <td class="text-center">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                          <button class="btn btn-secondary btn-sm edit-party-btn" data-id="${p.id}" title="Edit Party Details" style="padding: 4px 8px; font-size: 11.5px;">
                            Edit
                          </button>
                          <button class="btn btn-secondary btn-sm delete-party-btn" data-id="${p.id}" title="Delete Party" style="padding: 4px 8px; font-size: 11.5px; color: var(--red-accent);">
                            &times;
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Event Listeners for Parties Tab
      document.getElementById('tabToItemsBtn')?.addEventListener('click', () => {
        activeTab = 'items';
        updateView();
      });

      document.getElementById('partySearchInput')?.addEventListener('input', (e) => {
        partySearchTerm = e.target.value;
        updateView();
        const inp = document.getElementById('partySearchInput');
        if (inp) {
          inp.focus();
          inp.setSelectionRange(partySearchTerm.length, partySearchTerm.length);
        }
      });

      document.getElementById('addNewPartyBtn')?.addEventListener('click', () => {
        openPartyFormModal(null, () => updateView());
      });

      container.querySelectorAll('.edit-party-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const party = parties.find(p => p.id === id);
          if (party) openPartyFormModal(party, () => updateView());
        });
      });

      container.querySelectorAll('.delete-party-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const party = parties.find(p => p.id === id);
          if (confirm(`Are you sure you want to delete party "${party ? party.name : id}"?`)) {
            store.deleteParty(id);
            showToast('Party deleted successfully', 'info');
            updateView();
          }
        });
      });

      return;
    }

    // =========================================================================
    // RENDER ITEMS MASTER TAB
    // =========================================================================
    const filteredItems = items.filter(i => {
      const matchCat = activeCategory === 'All' || i.category === activeCategory;
      const matchSearch = !searchTerm ||
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.hsn.includes(searchTerm);
      return matchCat && matchSearch;
    });

    container.innerHTML = `
      <div class="item-master-module-view">
        <!-- Master Switcher Tabs -->
        <div class="quotation-tabs-nav">
          <button id="tabToItemsBtn" class="quotation-tab-btn active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            Hardware & Items Master (${items.length} SKUs)
          </button>
          <button id="tabToPartiesBtn" class="quotation-tab-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Client & Vendor Parties Master (${parties.length} Registered)
          </button>
        </div>

        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(59, 130, 246, 0.25); color: #60a5fa; margin-bottom: 6px;">
                ● AUTHENTIC DOSSIER PRICE BOOK • FULL CRUD
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                CENTRAL SKU & SERVICES MASTER CATALOG (${items.length} VERIFIED SKUS)
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Panipat & Sonipat commercial dossier rates matching CP Plus, Western Digital, D-Link, Finolex & custom signage.
              </p>
            </div>
            <button id="addNewSkuBtn" class="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              + Add New SKU
            </button>
          </div>
        </div>

        <!-- Search & Category Filters Bar -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 260px; position: relative;">
              <input type="text" id="skuSearchInput" class="form-control" placeholder="Search by SKU, product name, brand, or HSN code..." value="${searchTerm}">
            </div>
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
              Showing ${filteredItems.length} of ${items.length} SKUs
            </span>
          </div>

          <!-- Category Chips -->
          <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
            ${categories.map(cat => `
              <button class="btn btn-sm category-chip-btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}" data-cat="${cat}" style="white-space: nowrap; font-size: 11.5px; padding: 4px 12px;">
                ${cat} (${cat === 'All' ? items.length : items.filter(i => i.category === cat).length})
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Master Items Table -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Category</th>
                  <th>Item Description & Specification</th>
                  <th>Brand / Model</th>
                  <th class="text-center">HSN/SAC</th>
                  <th class="text-right">Dealer Cost (₹)</th>
                  <th class="text-right">Retail Selling (₹)</th>
                  <th class="text-right">Margin %</th>
                  <th class="text-center">GST %</th>
                  <th class="text-center">Unit</th>
                  <th class="text-center">Min Reorder</th>
                  <th>Compliance & Dossier Notes</th>
                  <th class="text-center" style="width: 130px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${filteredItems.map(i => {
                  const marginPct = i.retailSelling > 0 ? ((i.retailSelling - i.dealerCost) / i.retailSelling) * 100 : 0;
                  return `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700; white-space: nowrap;">${i.sku}</td>
                      <td><span class="status-pill status-progress" style="font-size: 10.5px;">${i.category}</span></td>
                      <td style="font-weight: 600; min-width: 220px;">${i.name}</td>
                      <td style="font-size: 12px; color: var(--text-dim);">${i.brand}</td>
                      <td class="text-center" style="font-family: monospace; font-size: 11.5px;">${i.hsn}</td>
                      <td class="text-right" style="color: var(--text-muted);">₹${Number(i.dealerCost).toLocaleString('en-IN')}</td>
                      <td class="text-right" style="font-weight: 700; color: #38bdf8;">₹${Number(i.retailSelling).toLocaleString('en-IN')}</td>
                      <td class="text-right" style="font-weight: 700; color: ${marginPct >= 30 ? '#34d399' : '#fbbf24'};">${marginPct.toFixed(1)}%</td>
                      <td class="text-center" style="font-weight: 600;">${Math.round(i.gstRate * 100)}%</td>
                      <td class="text-center">${i.unit}</td>
                      <td class="text-center" style="font-weight: 600;">${i.minReorder}</td>
                      <td style="font-size: 11.5px; color: var(--text-dim); max-width: 260px;">${i.notes}</td>
                      <td class="text-center">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                          <button class="btn btn-secondary btn-sm edit-sku-btn" data-sku="${i.sku}" style="padding: 3px 8px; font-size: 11.5px;">Edit</button>
                          <button class="btn btn-secondary btn-sm delete-sku-row-btn" data-sku="${i.sku}" style="padding: 3px 8px; font-size: 11.5px; color: var(--red-accent);" title="Delete SKU">&times;</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Tab switchers
    document.getElementById('tabToPartiesBtn')?.addEventListener('click', () => {
      activeTab = 'parties';
      updateView();
    });

    // Search input
    document.getElementById('skuSearchInput')?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      updateView();
      const inp = document.getElementById('skuSearchInput');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    });

    // Category chips
    container.querySelectorAll('.category-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat') || 'All';
        updateView();
      });
    });

    // Add SKU
    document.getElementById('addNewSkuBtn')?.addEventListener('click', () => {
      openSkuFormModal(null, () => updateView());
    });

    // Edit SKU
    container.querySelectorAll('.edit-sku-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const item = items.find(i => i.sku === sku);
        if (item) openSkuFormModal(item, () => updateView());
      });
    });

    // Delete SKU directly from row
    container.querySelectorAll('.delete-sku-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        if (confirm(`Are you sure you want to delete SKU "${sku}" from the Master Catalog?`)) {
          store.deleteItem(sku);
          showToast(`Deleted SKU ${sku}`, 'info');
          updateView();
        }
      });
    });
  }

  // ===========================================================================
  // MODAL 1: SKU CREATE / EDIT FORM MODAL
  // ===========================================================================
  function openSkuFormModal(itemToEdit, onSaved) {
    const isEdit = !!itemToEdit;
    const suggestedSku = `SKU-${Math.floor(100 + Math.random() * 900)}`;

    const modalHtml = `
      <div id="skuFormModalOverlay" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit SKU ' + itemToEdit.sku : 'Add New Hardware SKU'}</h3>
            <button id="closeSkuFormModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="skuModalForm">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">SKU Code</label>
                  <input type="text" id="itemSku" class="form-control" value="${isEdit ? itemToEdit.sku : suggestedSku}" ${isEdit ? 'readonly' : ''} required style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">
                </div>
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <input type="text" id="itemCat" class="form-control" value="${isEdit ? itemToEdit.category : 'IP Cameras'}" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Item Nomenclature & Specification</label>
                <input type="text" id="itemName" class="form-control" value="${isEdit ? itemToEdit.name : ''}" placeholder="e.g. 4.0 MP IP Bullet Camera ColorVu" required>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Brand / Model</label>
                  <input type="text" id="itemBrand" class="form-control" value="${isEdit ? itemToEdit.brand : 'CP Plus'}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">HSN/SAC Code</label>
                  <input type="text" id="itemHsn" class="form-control" value="${isEdit ? itemToEdit.hsn : '85258090'}" required style="font-family: monospace;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Wholesale Dealer Cost (₹)</label>
                  <input type="number" id="itemCost" class="form-control" value="${isEdit ? itemToEdit.dealerCost : 2000}" step="0.01" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Retail Selling Price (₹)</label>
                  <input type="number" id="itemRetail" class="form-control" value="${isEdit ? itemToEdit.retailSelling : 3000}" step="0.01" required>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Unit of Measure (UOM)</label>
                  <input type="text" id="itemUnit" class="form-control" value="${isEdit ? itemToEdit.unit : 'Nos'}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Statutory GST (%)</label>
                  <select id="itemGstRate" class="form-control">
                    <option value="18" ${!isEdit || Math.round((itemToEdit.gstRate ?? 0.18) * 100) === 18 ? 'selected' : ''}>18% (CCTV Std)</option>
                    <option value="28" ${isEdit && Math.round((itemToEdit.gstRate ?? 0.18) * 100) === 28 ? 'selected' : ''}>28% (Monitors)</option>
                    <option value="12" ${isEdit && Math.round((itemToEdit.gstRate ?? 0.18) * 100) === 12 ? 'selected' : ''}>12% (IT / Turnkey)</option>
                    <option value="5" ${isEdit && Math.round((itemToEdit.gstRate ?? 0.18) * 100) === 5 ? 'selected' : ''}>5% (Solar / Low-V)</option>
                    <option value="0" ${isEdit && Math.round((itemToEdit.gstRate ?? 0.18) * 100) === 0 ? 'selected' : ''}>0% (Tax-Exempt)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Min Safety Reorder</label>
                  <input type="number" id="itemReorder" class="form-control" value="${isEdit ? itemToEdit.minReorder : 10}" min="1" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Technical Notes & Compliance</label>
                <input type="text" id="itemNotes" class="form-control" value="${isEdit ? itemToEdit.notes : 'STQC certified, 2-Year OEM Warranty'}">
              </div>
            </div>
            <div class="modal-footer">
              ${isEdit ? `
                <button type="button" id="deleteSkuBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                  Delete SKU
                </button>
              ` : ''}
              <button type="button" id="cancelSkuFormBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Item'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('skuFormModalOverlay');
    const close = () => overlay.remove();

    document.getElementById('closeSkuFormModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelSkuFormBtn')?.addEventListener('click', close);

    if (isEdit) {
      document.getElementById('deleteSkuBtn')?.addEventListener('click', () => {
        if (confirm(`Delete SKU ${itemToEdit.sku}?`)) {
          store.deleteItem(itemToEdit.sku);
          showToast(`Deleted SKU ${itemToEdit.sku}`, 'info');
          close();
          if (onSaved) onSaved();
        }
      });
    }

    document.getElementById('skuModalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        sku: document.getElementById('itemSku').value.trim(),
        category: document.getElementById('itemCat').value.trim(),
        name: document.getElementById('itemName').value.trim(),
        brand: document.getElementById('itemBrand').value.trim(),
        hsn: document.getElementById('itemHsn').value.trim(),
        dealerCost: Number(document.getElementById('itemCost').value) || 0,
        retailSelling: Number(document.getElementById('itemRetail').value) || 0,
        unit: document.getElementById('itemUnit').value.trim(),
        gstRate: (Number(document.getElementById('itemGstRate').value) || 18) / 100,
        minReorder: Number(document.getElementById('itemReorder').value) || 5,
        notes: document.getElementById('itemNotes').value.trim()
      };

      if (isEdit) {
        store.updateItem(itemToEdit.sku, data);
        showToast(`Updated SKU ${itemToEdit.sku}`);
      } else {
        store.addItem(data);
        showToast(`Created new SKU ${data.sku}`);
      }

      close();
      if (onSaved) onSaved();
    });
  }

  // ===========================================================================
  // MODAL 2: PARTY CREATE / EDIT FORM MODAL
  // ===========================================================================
  function openPartyFormModal(partyToEdit, onSaved) {
    const isEdit = !!partyToEdit;

    const modalHtml = `
      <div id="partyFormModalOverlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 580px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Client / Party ' + partyToEdit.name : 'Register New Corporate Party'}</h3>
            <button id="closePartyFormModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="partyModalForm">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Party / Organization Name *</label>
                <input type="text" id="partyNameInput" class="form-control" value="${isEdit ? partyToEdit.name : ''}" required placeholder="e.g. Haryana Warehousing Corporation">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Contact Person Name</label>
                  <input type="text" id="partyContactInput" class="form-control" value="${isEdit ? partyToEdit.contactPerson : ''}" placeholder="e.g. Er. Rajesh Malik">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number *</label>
                  <input type="text" id="partyPhoneInput" class="form-control" value="${isEdit ? partyToEdit.phone : ''}" placeholder="+91 94160-00000" required>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" id="partyEmailInput" class="form-control" value="${isEdit ? partyToEdit.email : ''}" placeholder="procurement@corp.com">
                </div>
                <div class="form-group">
                  <label class="form-label">GSTIN Identification</label>
                  <input type="text" id="partyGstinInput" class="form-control" value="${isEdit ? partyToEdit.gstin : ''}" placeholder="06AAACU1234F1Z5" style="text-transform: uppercase; font-family: monospace;">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Department / Wing / Sector</label>
                <input type="text" id="partyDeptInput" class="form-control" value="${isEdit ? partyToEdit.department : ''}" placeholder="e.g. Substation Works & Technical Distribution">
              </div>

              <div class="form-group">
                <label class="form-label">Site / Delivery Premises Address</label>
                <input type="text" id="partySiteInput" class="form-control" value="${isEdit ? partyToEdit.site : ''}" placeholder="e.g. Jattal Road Substation Premises, Panipat">
              </div>

              <div class="form-group">
                <label class="form-label">Place of Supply (Statutory GST)</label>
                <select id="partySupplyInput" class="form-control">
                  <option value="Haryana (06) - Intra-State GST Supply" ${isEdit && (partyToEdit.placeOfSupply || '').includes('Haryana') ? 'selected' : ''}>Haryana (06) - Intra-State GST Supply (CGST 9% + SGST 9%)</option>
                  <option value="Delhi (07) - Inter-State Supply" ${isEdit && (partyToEdit.placeOfSupply || '').includes('Delhi') ? 'selected' : ''}>Delhi (07) - Inter-State Supply (IGST 18%)</option>
                  <option value="Punjab (03) - Inter-State Supply" ${isEdit && (partyToEdit.placeOfSupply || '').includes('Punjab') ? 'selected' : ''}>Punjab (03) - Inter-State Supply (IGST 18%)</option>
                  <option value="Uttar Pradesh (09) - Inter-State Supply" ${isEdit && (partyToEdit.placeOfSupply || '').includes('Uttar') ? 'selected' : ''}>Uttar Pradesh (09) - Inter-State Supply (IGST 18%)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Credit Terms & Commercial Remarks</label>
                <input type="text" id="partyNotesInput" class="form-control" value="${isEdit ? (partyToEdit.notes || '') : ''}" placeholder="e.g. 30-day payment cycle, government treasury approval required">
              </div>
            </div>
            <div class="modal-footer">
              ${isEdit ? `
                <button type="button" id="deletePartyFromModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                  Delete Party
                </button>
              ` : ''}
              <button type="button" id="cancelPartyFormModalBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Register Party'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('partyFormModalOverlay');
    const close = () => overlay.remove();

    document.getElementById('closePartyFormModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelPartyFormModalBtn')?.addEventListener('click', close);

    if (isEdit) {
      document.getElementById('deletePartyFromModalBtn')?.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete party "${partyToEdit.name}"?`)) {
          store.deleteParty(partyToEdit.id);
          showToast(`Deleted party ${partyToEdit.name}`, 'info');
          close();
          if (onSaved) onSaved();
        }
      });
    }

    document.getElementById('partyModalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('partyNameInput').value.trim(),
        contactPerson: document.getElementById('partyContactInput').value.trim(),
        phone: document.getElementById('partyPhoneInput').value.trim(),
        email: document.getElementById('partyEmailInput').value.trim(),
        gstin: document.getElementById('partyGstinInput').value.trim(),
        department: document.getElementById('partyDeptInput').value.trim(),
        site: document.getElementById('partySiteInput').value.trim(),
        placeOfSupply: document.getElementById('partySupplyInput').value,
        notes: document.getElementById('partyNotesInput').value.trim()
      };

      if (isEdit) {
        store.updateParty(partyToEdit.id, data);
        showToast(`Updated party ${data.name}`);
      } else {
        const newParty = store.addParty(data);
        showToast(`Registered new party ${newParty.name}`);
      }

      close();
      if (onSaved) onSaved();
    });
  }

  updateView();
}
