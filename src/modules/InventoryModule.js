// Inventory Control & Supplier Payables Module (Full CRUD)
import { store } from '../services/store.js';
import { periodStore } from '../store/periodStore.js';
import { renderPagePeriodHeader } from '../components/PeriodPicker/PeriodPicker.js';

export function renderInventoryModule(container) {
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
    const inventory = store.state.inventory || [];
    const period = periodStore.getPagePeriod('inventory');

    const totalStockUnits = inventory.reduce((s, i) => s + (Number(i.currentStock) || 0), 0);
    const totalPendingPo = inventory.reduce((s, i) => s + (Number(i.pendingPoQty) || 0), 0);
    const totalDues = inventory.reduce((s, i) => s + (Number(i.outstandingDue) || 0), 0);
    const reorderCount = inventory.filter(i => (Number(i.currentStock) || 0) <= (Number(i.minReorder) || 0)).length;

    container.innerHTML = `
      <div class="inventory-module-view">
        <!-- Top Page Period Header -->
        <div id="inventoryPagePeriodContainer"></div>

        <!-- Top Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(239, 68, 68, 0.25); color: #f87171; margin-bottom: 6px;">
                ● PHYSICAL STOCK & VENDOR ACCOUNTS • FULL CRUD
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                PHYSICAL INVENTORY CONTROL, REORDER TRIGGERS & SUPPLIER ACCOUNTS PAYABLE
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Safety stock thresholds, wholesale procurement channels & credit terms tracking.
              </p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <span class="status-pill status-reorder" style="padding: 6px 12px; font-size: 12px;">
                ${reorderCount} SKUs At Reorder Level
              </span>
              <button id="addNewInvSkuBtn" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Add Inventory SKU
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card">
            <span class="kpi-label">Physical In-Stock Units</span>
            <div class="kpi-value" style="color: #38bdf8;">${totalStockUnits.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Across ${inventory.length} Warehouse SKUs</div>
          </div>
          <div class="kpi-card red">
            <span class="kpi-label">Critical Reorder Alerts</span>
            <div class="kpi-value" style="color: #f87171;">${reorderCount} Alerts</div>
            <div class="kpi-subtitle">Immediate Supplier PO Required</div>
          </div>
          <div class="kpi-card amber">
            <span class="kpi-label">Pending Inbound POs</span>
            <div class="kpi-value" style="color: #fbbf24;">${totalPendingPo} Units</div>
            <div class="kpi-subtitle">Awaiting Warehouse Inward</div>
          </div>
          <div class="kpi-card teal">
            <span class="kpi-label">Supplier Dues Payable</span>
            <div class="kpi-value" style="color: #2dd4bf;">₹${totalDues.toLocaleString('en-IN')}</div>
            <div class="kpi-subtitle">Aditya, WD Dist & Finolex</div>
          </div>
        </div>

        <!-- Inventory Ledger Table -->
        <div class="table-card">
          <div class="table-header-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div class="table-title-group">
              <h3>Authentic Dossier SKUs & Wholesale Vendor Accounts</h3>
              <p>CP Plus Aditya Infotech, WD Seagate Distributors & Cable Mills</p>
            </div>
            <div>
              <button id="tableAddSkuBtn" class="btn btn-secondary btn-sm" style="color: #38bdf8;">
                + Add New SKU
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="erp-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Item Nomenclature & Specs</th>
                  <th>Category</th>
                  <th class="text-center">Current Stock</th>
                  <th class="text-center">Min Level</th>
                  <th class="text-center">Reorder Status</th>
                  <th>Primary Wholesale Vendor</th>
                  <th class="text-center">Inbound PO</th>
                  <th class="text-right">Outstanding Due (₹)</th>
                  <th class="text-center">Credit Terms</th>
                  <th class="text-center" style="width: 170px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${inventory.length === 0 ? `
                  <tr>
                    <td colspan="11" style="text-align: center; padding: 40px; color: var(--text-dim);">
                      No inventory items found. Click "+ Add Inventory SKU" to create one.
                    </td>
                  </tr>
                ` : inventory.map(i => {
                  const isReorder = (Number(i.currentStock) || 0) <= (Number(i.minReorder) || 0);
                  return `
                    <tr>
                      <td style="font-family: 'JetBrains Mono', monospace; color: var(--blue-accent); font-weight: 700;">${i.sku}</td>
                      <td style="font-weight: 600;">${i.name}</td>
                      <td style="font-size: 12px; color: var(--text-dim);">${i.category}</td>
                      <td class="text-center" style="font-size: 14px; font-weight: 800; color: ${isReorder ? '#f87171' : 'var(--text-main)'};">
                        ${i.currentStock}
                      </td>
                      <td class="text-center" style="font-weight: 600;">${i.minReorder}</td>
                      <td class="text-center">
                        <span class="status-pill ${isReorder ? 'status-reorder' : 'status-instock'}">
                          ${isReorder ? 'Reorder Now' : 'In Stock'}
                        </span>
                      </td>
                      <td style="font-size: 12px;">${i.supplier}</td>
                      <td class="text-center" style="font-weight: 600; color: #fbbf24;">${i.pendingPoQty || 0}</td>
                      <td class="text-right" style="font-weight: 700; color: ${i.outstandingDue > 0 ? '#f87171' : '#34d399'};">
                        ₹${Number(i.outstandingDue).toLocaleString('en-IN')}
                      </td>
                      <td class="text-center">
                        <span class="status-pill ${i.paymentTerms === 'Paid in Full' ? 'status-instock' : (i.paymentTerms === 'Overdue' ? 'status-reorder' : 'status-pending')}" style="font-size: 11px;">
                          ${i.paymentTerms}
                        </span>
                      </td>
                      <td class="text-center" style="white-space: nowrap;">
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                          <button class="btn btn-secondary btn-sm adjust-stock-btn" data-sku="${i.sku}" title="Adjust Physical Stock" style="padding: 2px 5px; font-size: 11px;">
                            &plusmn;
                          </button>
                          ${i.pendingPoQty > 0 ? `
                            <button class="btn btn-primary btn-sm receive-po-btn" data-sku="${i.sku}" title="Receive Inbound PO" style="padding: 2px 5px; font-size: 11px;">
                              Recv
                            </button>
                          ` : ''}
                          ${i.outstandingDue > 0 ? `
                            <button class="btn btn-secondary btn-sm pay-vendor-btn" data-sku="${i.sku}" title="Pay Supplier Due" style="padding: 2px 5px; font-size: 11px; color: #34d399;">
                              Pay
                            </button>
                          ` : ''}
                          <button class="btn btn-secondary btn-sm edit-inv-btn" data-sku="${i.sku}" title="Edit SKU Details" style="padding: 2px 6px; font-size: 11px;">
                            Edit
                          </button>
                          <button class="btn btn-secondary btn-sm delete-inv-btn" data-sku="${i.sku}" title="Delete SKU from Inventory" style="padding: 2px 6px; font-size: 11px; color: var(--red-accent);">
                            &times;
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-right" style="font-weight: 700;">TOTAL WAREHOUSE UNITS & SUPPLIER PAYABLES:</td>
                  <td class="text-center" style="font-size: 14px; font-weight: 800; color: #38bdf8;">${totalStockUnits}</td>
                  <td></td>
                  <td class="text-center" style="font-weight: 700; color: #f87171;">${reorderCount} Alerts</td>
                  <td></td>
                  <td class="text-center" style="font-weight: 700; color: #fbbf24;">${totalPendingPo}</td>
                  <td class="text-right" style="font-size: 14px; font-weight: 800; color: #f87171;">₹${totalDues.toLocaleString('en-IN')}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    const headerContainer = document.getElementById('inventoryPagePeriodContainer');
    renderPagePeriodHeader(headerContainer, 'inventory', {
      isSnapshot: true,
      snapshotDate: period?.to || 'Current',
      onPeriodChange: () => {
        updateView();
      }
    });

    // Add SKU buttons
    document.getElementById('addNewInvSkuBtn')?.addEventListener('click', () => openInventoryModal(null));
    document.getElementById('tableAddSkuBtn')?.addEventListener('click', () => openInventoryModal(null));

    // Edit SKU buttons
    container.querySelectorAll('.edit-inv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const item = inventory.find(i => i.sku === sku);
        if (item) openInventoryModal(item);
      });
    });

    // Delete SKU buttons
    container.querySelectorAll('.delete-inv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const item = inventory.find(i => i.sku === sku);
        if (confirm(`Are you sure you want to delete SKU "${sku}" (${item ? item.name : ''}) from inventory?`)) {
          store.deleteInventoryItem(sku);
          showToast(`Deleted SKU ${sku} from inventory`, 'info');
          updateView();
        }
      });
    });

    // Adjust Stock handler
    container.querySelectorAll('.adjust-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const qtyStr = prompt(`Enter stock adjustment for ${sku} (+ to add, - to subtract):`, '+5');
        if (qtyStr !== null) {
          const delta = parseInt(qtyStr, 10);
          if (!isNaN(delta)) {
            store.updateStock(sku, delta, 'Manual Audit');
            showToast(`Stock updated for ${sku}`);
            updateView();
          }
        }
      });
    });

    // Receive PO handler
    container.querySelectorAll('.receive-po-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const item = inventory.find(i => i.sku === sku);
        if (item && item.pendingPoQty > 0) {
          if (confirm(`Receive all ${item.pendingPoQty} pending units for ${sku}?`)) {
            store.receivePo(sku, item.pendingPoQty);
            showToast(`Received ${item.pendingPoQty} units for ${sku}`);
            updateView();
          }
        }
      });
    });

    // Pay vendor due handler
    container.querySelectorAll('.pay-vendor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const item = inventory.find(i => i.sku === sku);
        if (item && item.outstandingDue > 0) {
          const amtStr = prompt(`Enter payment amount to supplier for ${sku} (Due: ₹${item.outstandingDue}):`, item.outstandingDue);
          if (amtStr !== null) {
            const amt = parseFloat(amtStr);
            if (!isNaN(amt) && amt > 0) {
              store.updateDuePayment(sku, amt);
              showToast(`Recorded payment of ₹${amt.toLocaleString('en-IN')} for ${sku}`);
              updateView();
            }
          }
        }
      });
    });
  }

  function openInventoryModal(itemToEdit = null) {
    const isEdit = !!itemToEdit;
    const existing = document.getElementById('inventoryItemModalOverlay');
    if (existing) existing.remove();

    const suggestedSku = `SKU-INV-${Math.floor(100 + Math.random() * 900)}`;

    const modalHtml = `
      <div id="inventoryItemModalOverlay" class="modal-overlay" style="z-index: 10020;">
        <div class="modal-card" style="max-width: 620px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Edit Inventory SKU: ' + itemToEdit.sku : 'Add New Inventory SKU'}</h3>
            <button id="closeInvModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="inventoryModalForm">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">SKU Code</label>
                  <input type="text" id="invSku" class="form-control" value="${isEdit ? itemToEdit.sku : suggestedSku}" ${isEdit ? 'readonly' : ''} required style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">
                </div>
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select id="invCategory" class="form-control" required>
                    <option value="Cameras" ${isEdit && itemToEdit.category === 'Cameras' ? 'selected' : ''}>Cameras</option>
                    <option value="Recorders / DVR / NVR" ${isEdit && itemToEdit.category === 'Recorders / DVR / NVR' ? 'selected' : ''}>Recorders / DVR / NVR</option>
                    <option value="Hard Disk & Storage" ${isEdit && itemToEdit.category === 'Hard Disk & Storage' ? 'selected' : ''}>Hard Disk & Storage</option>
                    <option value="Power Supply & SMPS" ${isEdit && itemToEdit.category === 'Power Supply & SMPS' ? 'selected' : ''}>Power Supply & SMPS</option>
                    <option value="Cables & Networking" ${isEdit && itemToEdit.category === 'Cables & Networking' ? 'selected' : ''}>Cables & Networking</option>
                    <option value="Accessories & Connectors" ${isEdit && itemToEdit.category === 'Accessories & Connectors' ? 'selected' : ''}>Accessories & Connectors</option>
                    <option value="Other Hardware" ${isEdit && itemToEdit.category === 'Other Hardware' ? 'selected' : ''}>Other Hardware</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Item Nomenclature & Specification</label>
                <input type="text" id="invName" class="form-control" value="${isEdit ? itemToEdit.name : ''}" placeholder="e.g. CP Plus 4MP IP Dome Camera (CP-UNC-TA41L3)" required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Current Physical Stock</label>
                  <input type="number" id="invCurrentStock" class="form-control" value="${isEdit ? itemToEdit.currentStock : 20}" min="0" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Safety Reorder Threshold</label>
                  <input type="number" id="invMinReorder" class="form-control" value="${isEdit ? itemToEdit.minReorder : 5}" min="0" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Primary Wholesale Vendor</label>
                <input type="text" id="invSupplier" class="form-control" value="${isEdit ? itemToEdit.supplier : 'Aditya Infotech Ltd. (CP Plus Dist)'}" required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Pending Inbound PO Qty</label>
                  <input type="number" id="invPendingPo" class="form-control" value="${isEdit ? (itemToEdit.pendingPoQty || 0) : 0}" min="0">
                </div>
                <div class="form-group">
                  <label class="form-label">Outstanding Due to Vendor (₹)</label>
                  <input type="number" id="invDue" class="form-control" value="${isEdit ? (itemToEdit.outstandingDue || 0) : 0}" min="0" step="0.01">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Credit & Payment Terms</label>
                <select id="invTerms" class="form-control">
                  <option value="Paid in Full" ${isEdit && itemToEdit.paymentTerms === 'Paid in Full' ? 'selected' : ''}>Paid in Full</option>
                  <option value="30 Days Net" ${isEdit && itemToEdit.paymentTerms === '30 Days Net' ? 'selected' : ''}>30 Days Net</option>
                  <option value="15 Days Net" ${isEdit && itemToEdit.paymentTerms === '15 Days Net' ? 'selected' : ''}>15 Days Net</option>
                  <option value="Advance 50%" ${isEdit && itemToEdit.paymentTerms === 'Advance 50%' ? 'selected' : ''}>Advance 50%</option>
                  <option value="Overdue" ${isEdit && itemToEdit.paymentTerms === 'Overdue' ? 'selected' : ''}>Overdue</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              ${isEdit ? `
                <button type="button" id="deleteInvModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                  Delete SKU
                </button>
              ` : ''}
              <button type="button" id="cancelInvModalBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Inventory SKU'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const overlay = document.getElementById('inventoryItemModalOverlay');
    const close = () => overlay.remove();

    document.getElementById('closeInvModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelInvModalBtn')?.addEventListener('click', close);

    if (isEdit) {
      document.getElementById('deleteInvModalBtn')?.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete SKU ${itemToEdit.sku}?`)) {
          store.deleteInventoryItem(itemToEdit.sku);
          close();
          showToast(`Deleted SKU ${itemToEdit.sku}`, 'info');
          updateView();
        }
      });
    }

    document.getElementById('inventoryModalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const sku = document.getElementById('invSku').value.trim();
      const data = {
        sku,
        name: document.getElementById('invName').value.trim(),
        category: document.getElementById('invCategory').value,
        currentStock: Number(document.getElementById('invCurrentStock').value) || 0,
        minReorder: Number(document.getElementById('invMinReorder').value) || 0,
        supplier: document.getElementById('invSupplier').value.trim(),
        pendingPoQty: Number(document.getElementById('invPendingPo').value) || 0,
        outstandingDue: Number(document.getElementById('invDue').value) || 0,
        paymentTerms: document.getElementById('invTerms').value
      };

      if (isEdit) {
        store.updateInventoryItem(itemToEdit.sku, data);
        showToast(`Updated SKU ${sku}`);
      } else {
        store.addInventoryItem(data);
        showToast(`Created new inventory item ${sku}`);
      }

      close();
      updateView();
    });
  }

  updateView();
}
