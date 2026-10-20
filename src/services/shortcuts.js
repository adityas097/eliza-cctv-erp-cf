// Keyboard Shortcuts Management Service & Cheat Sheet Registry
import { store } from './store.js';

export const SHORTCUTS_REGISTRY = [
  {
    category: 'Global Navigation & General',
    icon: '🌐',
    items: [
      { key: 'Esc', desc: 'Close active modal / dialog (confirms if unsaved changes exist)' },
      { key: 'Ctrl + S', desc: 'Save current quotation to repository / submit active dialog form' },
      { key: '?', desc: 'Open interactive Keyboard Shortcuts cheat sheet' },
      { key: 'Ctrl + K  /  /', desc: 'Focus and open Global System Search' },
      { key: 'Alt + 1..9', desc: 'Direct module jump (1: Dashboard, 3: Quotation, 4: CRM, 9: Masters)' }
    ]
  },
  {
    category: 'Quotation Proposal Studio',
    icon: '📋',
    items: [
      { key: 'Alt + N', desc: 'Add new line item and focus embedded master search' },
      { key: '↓  /  ↑', desc: 'Navigate up/down through item catalog suggestions' },
      { key: 'Enter', desc: 'Select highlighted SKU and auto-populate rates & taxes' },
      { key: 'Alt + P', desc: 'Open Official Certified A4 Proposal Print view' },
      { key: 'Ctrl + S', desc: 'Save draft snapshot directly into Quotation Storage' }
    ]
  },
  {
    category: 'CRM Sales & Bidding Pipeline',
    icon: '📊',
    items: [
      { key: 'Drag & Drop', desc: 'Drag lead cards between columns to change stages' },
      { key: 'Alt + N', desc: 'Quickly open Create New Lead modal' },
      { key: '→', desc: 'Advance opportunity to the next pipeline stage' }
    ]
  },
  {
    category: 'Dialogs & Record Management',
    icon: '⚡',
    items: [
      { key: 'Enter', desc: 'Submit and save current form modal' },
      { key: 'Esc', desc: 'Prompt and safely close dialog without saving' },
      { key: 'Tab', desc: 'Move to next input field sequentially' }
    ]
  }
];

export function openShortcutsModal() {
  const existing = document.getElementById('shortcutsHelpModalOverlay');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="shortcutsHelpModalOverlay" class="modal-overlay" style="z-index: 10010;">
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="brand-logo-icon" style="width: 32px; height: 32px; font-size: 13px;">⌨</div>
            <div>
              <h3 class="modal-title">Keyboard Shortcuts & Speed Keys</h3>
              <p style="font-size: 11.5px; color: var(--text-dim);">Eliza Infotech CCTV ERP High-Velocity Controls</p>
            </div>
          </div>
          <button id="closeShortcutsModalBtn" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <div style="display: flex; flex-direction: column; gap: 18px;">
            ${SHORTCUTS_REGISTRY.map(cat => `
              <div class="shortcut-group-card">
                <div class="shortcut-group-header">
                  <span>${cat.icon}</span>
                  <span>${cat.category}</span>
                </div>
                <div>
                  ${cat.items.map(it => `
                    <div class="shortcut-row">
                      <span style="color: var(--text-main); font-weight: 500;">${it.desc}</span>
                      <div class="shortcut-combo">
                        ${it.key.split(' ').map(part => {
                          if (part === '+' || part === '/') return `<span style="color: var(--text-dim); font-size: 11px;">${part}</span>`;
                          return `<kbd class="shortcut-key">${part}</kbd>`;
                        }).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: var(--text-dim);">Tip: Press <kbd class="shortcut-key">Esc</kbd> anytime to dismiss</span>
          <button type="button" id="dismissShortcutsBtn" class="btn btn-primary btn-sm">Got It</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const overlay = document.getElementById('shortcutsHelpModalOverlay');
  const close = () => overlay.remove();

  document.getElementById('closeShortcutsModalBtn')?.addEventListener('click', close);
  document.getElementById('dismissShortcutsBtn')?.addEventListener('click', close);
}

export function initGlobalShortcuts(navigateTo, openSearchModal) {
  const moduleMap = {
    '1': 'dashboard',
    '2': 'calculators',
    '3': 'quotation',
    '4': 'crm',
    '5': 'projects',
    '6': 'amc',
    '7': 'inventory',
    '8': 'technicians',
    '9': 'items'
  };

  window.addEventListener('keydown', (e) => {
    const isInput = document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.isContentEditable
    );

    // 1. ESCAPE: Close modal / dialogs
    if (e.key === 'Escape') {
      const overlays = document.querySelectorAll('.modal-overlay');
      if (overlays.length > 0) {
        const topModal = overlays[overlays.length - 1];
        
        // Check if modal has dirty/modified inputs
        const hasForm = topModal.querySelector('form');
        const isImportant = topModal.id && (
          topModal.id.includes('saveQuotation') ||
          topModal.id.includes('leadModal') ||
          topModal.id.includes('amcModal') ||
          topModal.id.includes('ticketModal') ||
          topModal.id.includes('editUserModal') ||
          topModal.id.includes('addUserModal') ||
          topModal.id.includes('projectModal') ||
          topModal.id.includes('siteLogModal') ||
          topModal.id.includes('createMasterItem')
        );

        if (hasForm && isImportant) {
          // Check if inputs have content
          const inputs = topModal.querySelectorAll('input:not([type="hidden"]), textarea');
          let hasContent = false;
          inputs.forEach(inp => {
            if (inp.value && inp.value.trim().length > 0 && inp.type !== 'checkbox' && inp.type !== 'radio') {
              hasContent = true;
            }
          });

          if (hasContent) {
            if (confirm('Discard unsaved changes and close this window?')) {
              topModal.remove();
            }
            return;
          }
        }

        topModal.remove();
        return;
      }

      // Close open dropdowns if any
      document.querySelectorAll('.boq-item-dropdown-panel, .party-dropdown-panel').forEach(d => {
        d.style.display = 'none';
      });
      return;
    }

    // 2. CTRL+S / CMD+S: Save current quotation or submit active modal form
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const overlays = document.querySelectorAll('.modal-overlay');
      if (overlays.length > 0) {
        const topModal = overlays[overlays.length - 1];
        const submitBtn = topModal.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return;
        }
      }

      // If in Quotation Studio
      const saveQuoteBtn = document.getElementById('saveToStorageBtn');
      if (saveQuoteBtn) {
        saveQuoteBtn.click();
        return;
      }

      // General save feedback
      store.saveState();
      const toast = document.createElement('div');
      toast.className = 'erp-toast';
      toast.innerHTML = '✔ System State Saved (Ctrl+S)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
      return;
    }

    // 3. ALT + N / CTRL + N: Add New Record contextually
    if (e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      // Quotation: Add Line Item
      const addBoqBtn = document.getElementById('addBoqLineItemBtn') || document.getElementById('addManualBoqRowBtn');
      if (addBoqBtn) {
        addBoqBtn.click();
        return;
      }
      // CRM: Add Lead
      const addLeadBtn = document.getElementById('addNewLeadBtn');
      if (addLeadBtn) {
        addLeadBtn.click();
        return;
      }
      // AMC: Add Contract
      const addAmcBtn = document.getElementById('newAmcContractBtn');
      if (addAmcBtn) {
        addAmcBtn.click();
        return;
      }
      // Technicians: Add Site Log
      const addTechBtn = document.getElementById('newSiteLogBtn');
      if (addTechBtn) {
        addTechBtn.click();
        return;
      }
      // Projects: Add Project
      const addProjBtn = document.getElementById('newProjectBtn');
      if (addProjBtn) {
        addProjBtn.click();
        return;
      }
    }

    // 4. ALT + P / CTRL + P: Official A4 Preview in Quotation
    if ((e.altKey || (e.ctrlKey && !e.shiftKey)) && e.key.toLowerCase() === 'p') {
      const previewBtn = document.getElementById('previewProposalBtn') || document.getElementById('tabToPreviewBtn');
      if (previewBtn) {
        e.preventDefault();
        previewBtn.click();
        return;
      }
    }

    // 5. ALT + 1..9: Quick module jump
    if (e.altKey && moduleMap[e.key]) {
      e.preventDefault();
      if (navigateTo) navigateTo(moduleMap[e.key]);
      return;
    }

    // 6. QUESTION MARK (?) or SHIFT + /: Open Shortcuts Cheat Sheet
    if (e.key === '?' && !isInput) {
      e.preventDefault();
      openShortcutsModal();
      return;
    }

    // 7. CTRL + K or /: Global search
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
      e.preventDefault();
      if (openSearchModal) openSearchModal();
      return;
    }
  });
}
