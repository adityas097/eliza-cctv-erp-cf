// Quotation Generator, Party Autocomplete, Master Catalog Integration & Quotation Storage
import { store } from '../services/store.js';
import { openJobDrawer } from './jobs/JobSheetsModule.js';
import { periodStore } from '../store/periodStore.js';
import { inRange } from '../services/periodService.js';
import { calculateQuotationTotals, generateAutoSyncedTerms, getEffectiveQuotationTerms } from '../services/calculators.js';
import { numberToWordsIndian, db } from '../store/db.js';

export function renderQuotationModule(container) {
  let activeTab = 'studio'; // 'studio' | 'storage' | 'preview'
  let previewQuoteId = null; // if viewing a specific archived quote in A4 preview

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
    }, 3200);
  }

  function updateView() {
    const company = store.state.company;
    const masterItems = store.state.items;
    const parties = store.state.parties || [];
    const savedQuotations = store.state.quotations || [];

    // Determine target quote for preview
    let targetQuote = store.state.quotation;
    if (activeTab === 'preview' && previewQuoteId) {
      const found = savedQuotations.find(q => q.id === previewQuoteId || q.refNo === previewQuoteId);
      if (found) targetQuote = found;
    }

    // Calculate totals for active/target quote using unified calculation engine
    const qTotals = calculateQuotationTotals(targetQuote);

    // Resolve effective statutory and commercial terms
    const defaultStatutoryTerms = db.state.settings?.accounting?.statutoryTerms;
    const effectiveTerms = getEffectiveQuotationTerms(targetQuote, qTotals, defaultStatutoryTerms);
    if (!Array.isArray(targetQuote.terms) || targetQuote.terms.length === 0) {
      targetQuote.terms = [...effectiveTerms];
    }

    const grossSubtotal = qTotals.grossSubtotal;
    const totalItemDiscount = qTotals.totalItemDiscount;
    const netItemsSubtotal = qTotals.netItemsSubtotal;
    const discountType = qTotals.discountType;
    const discountValue = qTotals.discountValue;
    const overallDiscount = qTotals.overallDiscount;
    const totalDiscount = qTotals.totalDiscount;
    const taxableGoodsSubtotal = qTotals.taxableGoodsSubtotal;
    const shippingCharges = qTotals.shippingCharges;
    const installationCharges = qTotals.installationCharges;
    const packagingCharges = qTotals.packagingCharges;
    const extraCharges = qTotals.extraCharges;
    const taxableSubtotal = qTotals.taxableSubtotal;
    const gstEnabled = qTotals.gstEnabled;
    const gstRate = qTotals.gstRate;
    const isInterstate = qTotals.isInterstate;
    const cgst = qTotals.cgst;
    const sgst = qTotals.sgst;
    const igst = qTotals.igst;
    const totalGst = qTotals.totalGst;
    const roundOffEnabled = qTotals.roundOffEnabled;
    const roundOff = qTotals.roundOff;
    const grandTotal = qTotals.grandTotal;
    const advancePct = qTotals.advancePct;
    const advanceAmount = qTotals.advanceAmount;
    const balanceAmount = qTotals.balanceAmount;

    // Calculate estimated quote cost & margin
    let estimatedCost = 0;
    (targetQuote.items || []).forEach(item => {
      const match = masterItems.find(m => m.sku === item.sku);
      const unitCost = match ? match.dealerCost : item.rate * 0.65;
      estimatedCost += unitCost * (Number(item.qty) || 0);
    });
    const estProfit = taxableSubtotal - estimatedCost;
    const estMarginPct = taxableSubtotal > 0 ? (estProfit / taxableSubtotal) * 100 : 0;

    // =========================================================================
    // VIEW 1: A4 OFFICIAL PROPOSAL PREVIEW
    // =========================================================================
    if (activeTab === 'preview') {
      container.innerHTML = `
        <div class="quotation-module-view">
          <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; gap: 10px;">
              <button id="backToStudioBtn" class="btn btn-secondary">
                &larr; Return to BOQ Studio
              </button>
              <button id="viewStorageBtnFromPreview" class="btn btn-secondary">
                📂 Quotation Storage (${savedQuotations.length})
              </button>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="printQuoteBtn" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save as PDF
              </button>
            </div>
          </div>

          <!-- Formal A4 Official GST Proposal Document -->
          <div class="print-quotation-wrapper">
            <div class="proposal-banner">
              <div>
                <div class="proposal-brand-title">${company.name}</div>
                <div class="proposal-brand-sub">${company.tagline}</div>
                <div style="font-size: 11px; margin-top: 4px; color: #64748b;">${company.address}</div>
                <div style="font-size: 11px; font-weight: 600; color: #0f172a; margin-top: 2px;">
                  GSTIN: ${company.gstin} | PAN: ${company.pan} | Phone: ${company.phone} | Email: ${company.email}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 800; color: #1e3a8a;">COMMERCIAL PROPOSAL</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Ref: ${targetQuote.refNo}</div>
                <div style="font-size: 11.5px; color: #475569;">Date: ${targetQuote.date}</div>
                <div style="font-size: 11px; color: #64748b;">Validity: ${targetQuote.validityDays || 15} Days</div>
              </div>
            </div>

            <!-- Client & Metadata Block -->
            <div class="proposal-meta-grid">
              <div>
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b;">CLIENT / BILLED TO:</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${targetQuote.clientName || 'General Client'}</div>
                <div style="font-size: 11.5px; color: #334155;">Department: ${targetQuote.department || 'Commercial & Technical Operations'}</div>
                <div style="font-size: 11.5px; color: #334155;">Site / Location: ${targetQuote.site || 'Haryana Region'}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Place of Supply: ${targetQuote.placeOfSupply || 'Haryana (06) - Intra-State'}</div>
              </div>
              <div>
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b;">SCOPE & COMPLIANCE:</div>
                <div style="font-size: 12.5px; font-weight: 600; color: #0f172a; margin-top: 2px;">${targetQuote.scopeOfWork}</div>
                <div style="font-size: 11.5px; color: #334155;">Tender/Inquiry Ref: ${targetQuote.govtRef || 'Direct Commercial Quotation'}</div>
                <div style="font-size: 11.5px; color: #334155;">Bank: ${company.bankName} (A/c: ${company.accountNo} | IFSC: ${company.ifscCode})</div>
                <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 4px;">✔ Authorized Certified Proposal</div>
              </div>
            </div>

            <!-- Items Table -->
            <table class="print-boq-table">
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th>Item Nomenclature & Technical Specifications</th>
                  <th style="text-align: center; width: 80px;">HSN/SAC</th>
                  <th style="text-align: center; width: 50px;">Qty</th>
                  <th style="text-align: center; width: 50px;">Unit</th>
                  <th style="text-align: right; width: 100px;">Rate (₹)</th>
                  <th style="text-align: right; width: 120px;">Taxable (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${(targetQuote.items || []).map((item, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                    <td>
                      <div style="font-weight: 600; color: #0f172a;">${item.desc || item.name}</div>
                      <div style="font-size: 10px; color: #64748b;">SKU: ${item.sku}</div>
                    </td>
                    <td style="text-align: center; font-family: monospace;">${item.hsn || '85258090'}</td>
                    <td style="text-align: center; font-weight: 600;">${item.qty}</td>
                    <td style="text-align: center;">${item.unit || 'Nos'}</td>
                    <td style="text-align: right;">₹${Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right; font-weight: 700;">₹${(Number(item.qty) * Number(item.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Summary Box -->
            <div class="proposal-totals-box">
              <div class="proposal-totals-row">
                <span style="color: #475569;">Gross Items Total:</span>
                <span style="font-weight: 600;">₹${grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              ${overallDiscount > 0 ? `
                <div class="proposal-totals-row" style="color: #059669;">
                  <span>Special Commercial Discount (${discountType === 'percent' ? discountValue + '%' : 'Flat'}):</span>
                  <span style="font-weight: 700;">-₹${overallDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              ${shippingCharges > 0 ? `
                <div class="proposal-totals-row">
                  <span style="color: #475569;">Freight, Shipping & Logistics:</span>
                  <span>₹${shippingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              ${installationCharges > 0 ? `
                <div class="proposal-totals-row">
                  <span style="color: #475569;">Installation & Testing Charges:</span>
                  <span>₹${installationCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              ${packagingCharges > 0 ? `
                <div class="proposal-totals-row">
                  <span style="color: #475569;">Packaging & Handling:</span>
                  <span>₹${packagingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ` : ''}
              <div class="proposal-totals-row" style="border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                <span style="color: #0f172a; font-weight: 600;">Taxable Value:</span>
                <span style="font-weight: 700;">₹${taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              ${gstEnabled && gstRate > 0 ? (
                isInterstate ? `
                  <div class="proposal-totals-row">
                    <span style="color: #475569;">Integrated GST (IGST @ ${gstRate}%):</span>
                    <span>₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="proposal-totals-row">
                    <span style="color: #475569;">Total Statutory GST (${gstRate}%):</span>
                    <span style="font-weight: 600;">₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : `
                  <div class="proposal-totals-row">
                    <span style="color: #475569;">Central GST (CGST @ ${(gstRate/2).toFixed(1)}%):</span>
                    <span>₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="proposal-totals-row">
                    <span style="color: #475569;">State GST (SGST @ ${(gstRate/2).toFixed(1)}%):</span>
                    <span>₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="proposal-totals-row">
                    <span style="color: #475569;">Total Statutory GST (${gstRate}%):</span>
                    <span style="font-weight: 600;">₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                `
              ) : `
                <div class="proposal-totals-row" style="color: #64748b; font-style: italic;">
                  <span>Statutory GST:</span>
                  <span>Exempt / Non-Taxable Supply (0%)</span>
                </div>
              `}
              ${roundOff !== 0 ? `
                <div class="proposal-totals-row" style="font-size: 11px; color: #64748b;">
                  <span>Round-Off Adjustment:</span>
                  <span>${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="proposal-totals-row proposal-net-row">
                <span>NET PAYABLE TOTAL:</span>
                <span style="color: #1e3a8a !important;">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="font-size: 10px; color: #475569; text-align: right; padding-top: 3px; font-weight: 600;">
                (In Words: ${numberToWordsIndian(grandTotal)})
              </div>
              <div class="proposal-totals-row" style="margin-top: 4px; font-size: 11px; color: #0284c7; background: #f0f9ff; padding: 4px 8px; border-radius: 4px;">
                <span>Payment Terms (${advancePct}% Advance / ${100 - advancePct}% on Sign-off):</span>
                <span>Advance: ₹${advanceAmount.toLocaleString('en-IN')} | Balance: ₹${balanceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <!-- Commercial Terms & Signatures -->
            <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">COMMERCIAL TERMS & STATUTORY CONDITIONS:</div>
                <div class="no-print">
                  <button type="button" id="togglePreviewTermsEditBtn" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 3px 10px; height: 26px; display: inline-flex; align-items: center; gap: 5px;" title="Edit commercial terms directly on this proposal">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    ✏️ Edit Terms
                  </button>
                </div>
              </div>

              <!-- Static Presentation on A4 Proposal -->
              <div id="previewTermsStaticWrap">
                <ol id="previewTermsList" style="font-size: 11px; color: #475569; padding-left: 18px; line-height: 1.6; margin: 0;">
                  ${effectiveTerms.map((t, idx) => `
                    <li style="margin-bottom: 3px;" class="preview-term-item" data-idx="${idx}">${t}</li>
                  `).join('')}
                </ol>
              </div>

              <!-- In-Place Interactive Edit Mode on A4 Sheet (Hidden until clicking 'Edit Terms') -->
              <div id="previewTermsEditWrap" class="no-print" style="display: none; margin-top: 10px; background: #f8fafc; border: 1.5px dashed #0284c7; border-radius: 8px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <span style="font-size: 12px; font-weight: 700; color: #0369a1; display: flex; align-items: center; gap: 6px;">
                    <span>📝</span> Edit Commercial Terms on Proposal
                  </span>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button type="button" id="previewAutoSyncTermsBtn" class="btn btn-secondary btn-sm" style="font-size: 10.5px; padding: 2px 8px; height: 24px;" title="Auto-recompute advance % and GST clauses">⚡ Auto-Sync</button>
                    <button type="button" id="previewResetDefaultTermsBtn" class="btn btn-secondary btn-sm" style="font-size: 10.5px; padding: 2px 8px; height: 24px;" title="Reset to Company Defaults">🔄 Defaults</button>
                    <button type="button" id="previewAddTermBtn" class="btn btn-secondary btn-sm" style="font-size: 10.5px; padding: 2px 8px; height: 24px;">+ Add Clause</button>
                  </div>
                </div>

                <div id="previewTermsInputsContainer" style="display: flex; flex-direction: column; gap: 8px;">
                  ${effectiveTerms.map((t, idx) => `
                    <div class="preview-term-edit-row" data-idx="${idx}" style="display: flex; gap: 8px; align-items: flex-start;">
                      <span style="font-size: 11px; font-weight: 700; color: #0284c7; width: 20px; text-align: center; margin-top: 6px;">${idx + 1}.</span>
                      <textarea class="form-control preview-term-input" rows="2" style="font-size: 11.5px; padding: 4px 8px; flex: 1; resize: vertical; line-height: 1.4;">${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                      <button type="button" class="btn btn-secondary btn-sm preview-del-term-btn" data-idx="${idx}" style="color: #ef4444; padding: 4px 8px; height: 28px; margin-top: 2px;" title="Delete this clause">✕</button>
                    </div>
                  `).join('')}
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
                  <button type="button" id="previewCancelTermsEditBtn" class="btn btn-secondary btn-sm" style="font-size: 11px;">Cancel</button>
                  <button type="button" id="previewSaveTermsEditBtn" class="btn btn-primary btn-sm" style="font-size: 11px; font-weight: 600;">💾 Save & Update Proposal</button>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; padding-top: 20px;">
              <div style="text-align: center;">
                <div style="border-top: 1px solid #94a3b8; width: 180px; padding-top: 4px; font-size: 11px; font-weight: 600; color: #475569;">
                  Customer Acceptance / Seal
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">For ${company.name}</div>
                <div style="height: 40px;"></div>
                <div style="border-top: 1px solid #0f172a; width: 220px; padding-top: 4px; font-size: 11px; font-weight: 600; color: #0f172a;">
                  Authorized Signatory (${company.authorizedPerson})
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Preview Navigation
      document.getElementById('backToStudioBtn')?.addEventListener('click', () => {
        activeTab = 'studio';
        previewQuoteId = null;
        updateView();
      });

      document.getElementById('viewStorageBtnFromPreview')?.addEventListener('click', () => {
        activeTab = 'storage';
        previewQuoteId = null;
        updateView();
      });

      document.getElementById('printQuoteBtn')?.addEventListener('click', () => {
        window.print();
      });

      // Preview Commercial Terms Editing Handlers
      const toggleBtn = document.getElementById('togglePreviewTermsEditBtn');
      const staticWrap = document.getElementById('previewTermsStaticWrap');
      const editWrap = document.getElementById('previewTermsEditWrap');

      toggleBtn?.addEventListener('click', () => {
        const isEditing = editWrap && editWrap.style.display !== 'none';
        if (isEditing) {
          editWrap.style.display = 'none';
          staticWrap.style.display = 'block';
          toggleBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            ✏️ Edit Terms
          `;
        } else if (editWrap && staticWrap) {
          editWrap.style.display = 'block';
          staticWrap.style.display = 'none';
          toggleBtn.innerHTML = '✕ Close Editor';
        }
      });

      document.getElementById('previewCancelTermsEditBtn')?.addEventListener('click', () => {
        if (editWrap && staticWrap) {
          editWrap.style.display = 'none';
          staticWrap.style.display = 'block';
          if (toggleBtn) {
            toggleBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              ✏️ Edit Terms
            `;
          }
        }
      });

      function reindexPreviewRows() {
        const rows = document.querySelectorAll('#previewTermsInputsContainer .preview-term-edit-row');
        rows.forEach((r, i) => {
          r.dataset.idx = i;
          const badge = r.querySelector('span');
          if (badge) badge.textContent = `${i + 1}.`;
        });
      }

      function attachPreviewDelEvents() {
        document.querySelectorAll('.preview-del-term-btn').forEach(btn => {
          btn.onclick = (e) => {
            const row = e.target.closest('.preview-term-edit-row');
            if (row) {
              row.remove();
              reindexPreviewRows();
            }
          };
        });
      }
      attachPreviewDelEvents();

      document.getElementById('previewAddTermBtn')?.addEventListener('click', () => {
        const container = document.getElementById('previewTermsInputsContainer');
        if (!container) return;
        const currentRows = container.querySelectorAll('.preview-term-edit-row');
        const nextIdx = currentRows.length;
        const row = document.createElement('div');
        row.className = 'preview-term-edit-row';
        row.dataset.idx = nextIdx;
        row.style.cssText = 'display: flex; gap: 8px; align-items: flex-start;';
        row.innerHTML = `
          <span style="font-size: 11px; font-weight: 700; color: #0284c7; width: 20px; text-align: center; margin-top: 6px;">${nextIdx + 1}.</span>
          <textarea class="form-control preview-term-input" rows="2" style="font-size: 11.5px; padding: 4px 8px; flex: 1; resize: vertical; line-height: 1.4;" placeholder="Enter commercial/statutory condition..."></textarea>
          <button type="button" class="btn btn-secondary btn-sm preview-del-term-btn" data-idx="${nextIdx}" style="color: #ef4444; padding: 4px 8px; height: 28px; margin-top: 2px;" title="Delete this clause">✕</button>
        `;
        container.appendChild(row);
        attachPreviewDelEvents();
        row.querySelector('textarea')?.focus();
      });

      function renderPreviewEditorRows(termsList) {
        const container = document.getElementById('previewTermsInputsContainer');
        if (!container) return;
        container.innerHTML = termsList.map((t, idx) => `
          <div class="preview-term-edit-row" data-idx="${idx}" style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="font-size: 11px; font-weight: 700; color: #0284c7; width: 20px; text-align: center; margin-top: 6px;">${idx + 1}.</span>
            <textarea class="form-control preview-term-input" rows="2" style="font-size: 11.5px; padding: 4px 8px; flex: 1; resize: vertical; line-height: 1.4;">${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            <button type="button" class="btn btn-secondary btn-sm preview-del-term-btn" data-idx="${idx}" style="color: #ef4444; padding: 4px 8px; height: 28px; margin-top: 2px;" title="Delete this clause">✕</button>
          </div>
        `).join('');
        attachPreviewDelEvents();
      }

      document.getElementById('previewAutoSyncTermsBtn')?.addEventListener('click', () => {
        const synced = generateAutoSyncedTerms(qTotals);
        renderPreviewEditorRows(synced);
        showToast('Generated clauses from active accounting totals');
      });

      document.getElementById('previewResetDefaultTermsBtn')?.addEventListener('click', () => {
        const defaults = getEffectiveQuotationTerms({}, qTotals, defaultStatutoryTerms);
        renderPreviewEditorRows(defaults);
        showToast('Loaded company default statutory terms');
      });

      document.getElementById('previewSaveTermsEditBtn')?.addEventListener('click', () => {
        const inputs = Array.from(document.querySelectorAll('#previewTermsInputsContainer .preview-term-input'));
        const newTerms = inputs.map(inp => inp.value.trim()).filter(Boolean);
        if (newTerms.length === 0) {
          alert('Please enter at least one commercial or statutory condition.');
          return;
        }

        if (previewQuoteId) {
          store.updateSavedQuotation(previewQuoteId, { terms: newTerms });
          if (store.state.quotation.id === previewQuoteId || store.state.quotation.refNo === previewQuoteId) {
            store.updateQuotation({ terms: newTerms });
          }
        } else {
          store.updateQuotation({ terms: newTerms });
        }

        showToast('Commercial terms saved & updated on proposal!');
        updateView();
      });

      return;
    }

    // =========================================================================
    // VIEW 2: QUOTATION STORAGE & ARCHIVES
    // =========================================================================
    if (activeTab === 'storage') {
      const getQuoteTotal = (q) => {
        if (q.grandTotal && Number(q.grandTotal) > 0) return Number(q.grandTotal);
        if (q.items && q.items.length) {
          const t = calculateQuotationTotals(q);
          return t.grandTotal;
        }
        return 0;
      };

      const totalStoredVal = savedQuotations.reduce((sum, q) => sum + getQuoteTotal(q), 0);
      const approvedQuotes = savedQuotations.filter(q => (q.status || '').includes('Approved') || (q.status || '').includes('Converted'));
      const approvedVal = approvedQuotes.reduce((sum, q) => sum + getQuoteTotal(q), 0);

      container.innerHTML = `
        <div class="quotation-module-view">
          <!-- Navigation Tabs -->
          <div class="quotation-tabs-nav">
            <button id="tabToStudioBtn" class="quotation-tab-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              BOQ Proposal Studio
            </button>
            <button id="tabToStorageBtn" class="quotation-tab-btn active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              Quotation Storage & Archives (${savedQuotations.length})
            </button>
            <button id="tabToPreviewBtn" class="quotation-tab-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              View Official A4 Proposal
            </button>
          </div>

          <!-- Hero Banner -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div>
                <span class="status-pill status-instock" style="background: rgba(37, 99, 235, 0.25); color: #60a5fa; margin-bottom: 6px;">
                  ● CENTRAL COMMERCIAL ARCHIVE
                </span>
                <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                  SAVED QUOTATIONS & PROPOSAL STORAGE REPOSITORY
                </h2>
                <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                  Directly inspect, reload, modify, duplicate, or print previously created client proposals.
                </p>
              </div>
              <button id="storageNewQuoteBtn" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                + Create New Proposal
              </button>
            </div>
          </div>

          <!-- Metrics Strip -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Stored Proposals</div>
              <div style="font-size: 24px; font-weight: 800; color: #38bdf8; margin-top: 4px;">${savedQuotations.length} Quotes</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Persisted in Local Storage</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Total Quoted Portfolio</div>
              <div style="font-size: 24px; font-weight: 800; color: #60a5fa; margin-top: 4px;">₹${totalStoredVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Gross Quotation Value (Inc. GST)</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Approved / Won Value</div>
              <div style="font-size: 24px; font-weight: 800; color: #34d399; margin-top: 4px;">₹${approvedVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div style="font-size: 11px; color: #34d399; margin-top: 2px;">${approvedQuotes.length} Proposals Confirmed</div>
            </div>
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Active Working Quote</div>
              <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-top: 8px;">${store.state.quotation.refNo}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${store.state.quotation.clientName || 'Unassigned'}</div>
            </div>
          </div>

          <!-- Stored Quotations Table -->
          <div class="table-card">
            <div class="table-header-bar" style="flex-wrap: wrap; gap: 12px;">
              <div class="table-title-group">
                <h3>Archived Commercial Proposals Ledger</h3>
                <p>Click "Load into Studio" to edit, or "View A4" to print directly</p>
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <input type="text" id="storageSearchInput" class="form-control" placeholder="Search Ref No, Client, Site..." style="width: 250px; font-size: 12.5px;">
                <select id="storageStatusFilter" class="form-control" style="width: 170px; font-size: 12.5px;">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent to Client">Sent to Client</option>
                  <option value="Approved / PO Received">Approved / PO Received</option>
                  <option value="Converted to Project">Converted to Project</option>
                </select>
              </div>
            </div>

            <div class="table-responsive">
              <table class="erp-table" id="storageQuotationsTable">
                <thead>
                  <tr>
                    <th>Ref No & Date</th>
                    <th>Client Organization & Site</th>
                    <th>Scope of Work</th>
                    <th class="text-center">BOQ Items</th>
                    <th class="text-right">Grand Total (₹)</th>
                    <th class="text-center">Status</th>
                    <th>Created By</th>
                    <th class="text-center" style="width: 220px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="storageTableBody">
                  ${renderStorageRows(savedQuotations)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      function renderStorageRows(list) {
        if (!list || list.length === 0) {
          return `
            <tr>
              <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                No stored quotations match your search criteria.
              </td>
            </tr>
          `;
        }

        return list.map(q => {
          let badgeClass = 'status-pending';
          if ((q.status || '').includes('Approved') || (q.status || '').includes('Converted')) badgeClass = 'status-instock';
          else if ((q.status || '').includes('Draft')) badgeClass = 'status-low';

          const itemCount = (q.items || []).length;
          const totalAmt = getQuoteTotal(q);

          return `
            <tr>
              <td>
                <div style="font-weight: 700; color: #38bdf8; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${q.refNo}</div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Date: ${q.date}</div>
              </td>
              <td>
                <div style="font-weight: 600; color: var(--text-main); font-size: 13.5px;">${q.clientName || 'General Client'}</div>
                <div style="font-size: 11.5px; color: var(--text-dim);">${q.site || q.department || 'Panipat / Sonipat'}</div>
              </td>
              <td style="max-width: 240px; font-size: 12px; color: var(--text-muted);">
                ${q.scopeOfWork || 'CCTV Surveillance System'}
              </td>
              <td class="text-center">
                <span class="status-pill status-instock" style="background: rgba(30, 58, 138, 0.3); color: #93c5fd; font-weight: 700;">
                  ${itemCount} Items
                </span>
              </td>
              <td class="text-right" style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 14.5px; color: #34d399;">
                ₹${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td class="text-center">
                <span class="status-pill ${badgeClass}">${q.status || 'Draft'}</span>
              </td>
              <td style="font-size: 12px; color: var(--text-main); font-weight: 500;">
                ${q.createdBy || 'Aditya Sharma'}
              </td>
              <td class="text-center">
                <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                  <button class="btn btn-secondary btn-sm storage-quick-edit-btn" data-id="${q.id}" title="Quick Edit proposal metadata & status" style="padding: 3px 6px; font-size: 11px; color: #fbbf24;">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-secondary btn-sm storage-load-btn" data-id="${q.id}" title="Load into BOQ Studio for editing" style="padding: 3px 6px; font-size: 11px;">
                    🛠️ Studio
                  </button>
                  <button class="btn btn-secondary btn-sm storage-preview-btn" data-id="${q.id}" title="View official A4 printable proposal" style="padding: 3px 6px; font-size: 11px; color: #38bdf8;">
                    👁️ A4
                  </button>
                  <button class="btn btn-secondary btn-sm storage-convert-job-btn" data-id="${q.id}" title="Convert to Field Operations Job Sheet" style="padding: 3px 6px; font-size: 11px; color: #34d399; border-color: rgba(52, 211, 153, 0.4);">
                    ⚡ Job
                  </button>
                  <button class="btn btn-secondary btn-sm storage-clone-btn" data-id="${q.id}" title="Duplicate this quotation as a new draft" style="padding: 3px 6px; font-size: 11px;">
                    📋 Clone
                  </button>
                  <button class="btn btn-secondary btn-sm storage-delete-btn" data-id="${q.id}" title="Delete quotation" style="padding: 3px 6px; font-size: 11px; color: var(--red-accent);">
                    &times;
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      // Filter events
      const searchInput = document.getElementById('storageSearchInput');
      const statusFilter = document.getElementById('storageStatusFilter');
      const tableBody = document.getElementById('storageTableBody');

      function filterStorage() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const status = statusFilter?.value || '';
        const period = periodStore.getPagePeriod('quotations');

        const filtered = savedQuotations.filter(q => {
          if (period && period.preset !== 'all_time' && period.from !== '1970-01-01') {
            const dateStr = String(q.date || q.createdAt || '').slice(0, 10);
            if (dateStr && !inRange(dateStr, period)) return false;
          }

          const matchQuery = !query || 
            (q.refNo || '').toLowerCase().includes(query) ||
            (q.clientName || '').toLowerCase().includes(query) ||
            (q.site || '').toLowerCase().includes(query) ||
            (q.scopeOfWork || '').toLowerCase().includes(query);

          const matchStatus = !status || (q.status === status);
          return matchQuery && matchStatus;
        });

        if (tableBody) tableBody.innerHTML = renderStorageRows(filtered);
        attachStorageRowEvents();
      }

      searchInput?.addEventListener('input', filterStorage);
      statusFilter?.addEventListener('change', filterStorage);

      function attachStorageRowEvents() {
        container.querySelectorAll('.storage-load-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const loaded = store.loadQuotation(id);
            if (loaded) {
              showToast(`Loaded ${loaded.refNo} into BOQ Studio`);
              activeTab = 'studio';
              updateView();
            }
          });
        });

        container.querySelectorAll('.storage-preview-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            previewQuoteId = btn.getAttribute('data-id');
            activeTab = 'preview';
            updateView();
          });
        });

        container.querySelectorAll('.storage-convert-job-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const q = savedQuotations.find(item => item.id === id);
            if (q) {
              const camCount = (q.items || []).filter(i => (i.description || '').toLowerCase().includes('camera')).reduce((s, i) => s + (Number(i.qty) || 0), 0) || 4;
              openJobDrawer({
                isPrefill: true,
                title: `${q.scopeOfWork || 'CCTV Installation'} - ${q.clientName}`,
                clientName: q.clientName,
                siteAddress: q.site || q.clientAddress,
                type: 'New Install',
                priority: 'High',
                camsCount: camCount,
                pointsCount: camCount,
                notes: `Converted from Quotation ${q.refNo}. Total: ₹${getQuoteTotal(q).toLocaleString('en-IN')}`
              }, () => updateView());
            }
          });
        });

        container.querySelectorAll('.storage-clone-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const cloned = store.duplicateQuotation(id);
            if (cloned) {
              showToast(`Cloned proposal as draft ${cloned.refNo}`);
              activeTab = 'studio';
              updateView();
            }
          });
        });

        // Quick edit quotation modal
        container.querySelectorAll('.storage-quick-edit-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const quote = savedQuotations.find(q => q.id === id);
            if (quote) openQuotationQuickEditModal(quote);
          });
        });

        container.querySelectorAll('.storage-delete-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`Are you sure you want to delete stored quotation ${id}?`)) {
              store.deleteSavedQuotation(id);
              showToast(`Deleted quotation from storage`, 'info');
              updateView();
            }
          });
        });
      }

      function openQuotationQuickEditModal(quote) {
        const existing = document.getElementById('quotationQuickEditModal');
        if (existing) existing.remove();

        const html = `
          <div id="quotationQuickEditModal" class="modal-overlay" style="z-index: 10020;">
            <div class="modal-card" style="max-width: 620px;">
              <div class="modal-header">
                <h3 class="modal-title">Quick Edit Quotation: ${quote.refNo}</h3>
                <button id="closeQuickEditModalBtn" class="modal-close-btn">&times;</button>
              </div>
              <form id="quotationQuickEditForm">
                <div class="modal-body">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="form-group">
                      <label class="form-label">Quotation Ref No</label>
                      <input type="text" id="qeRefNo" class="form-control" value="${quote.refNo}" required style="font-family: monospace; font-weight: 700;">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Quotation Date</label>
                      <input type="date" id="qeDate" class="form-control" value="${quote.date || new Date().toISOString().split('T')[0]}" required>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Client Organization Name</label>
                    <input type="text" id="qeClientName" class="form-control" value="${quote.clientName || ''}" required>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="form-group">
                      <label class="form-label">Premises / Site Address</label>
                      <input type="text" id="qeSite" class="form-control" value="${quote.site || quote.clientAddress || ''}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Department / Wing</label>
                      <input type="text" id="qeDept" class="form-control" value="${quote.department || ''}">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Scope of Work</label>
                    <input type="text" id="qeScope" class="form-control" value="${quote.scopeOfWork || 'CCTV Surveillance Sizing & Installation'}">
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="form-group">
                      <label class="form-label">Proposal Status</label>
                      <select id="qeStatus" class="form-control">
                        <option value="Draft" ${quote.status === 'Draft' ? 'selected' : ''}>Draft</option>
                        <option value="Sent to Client" ${quote.status === 'Sent to Client' ? 'selected' : ''}>Sent to Client</option>
                        <option value="Under Negotiation" ${quote.status === 'Under Negotiation' ? 'selected' : ''}>Under Negotiation</option>
                        <option value="Approved / PO Received" ${quote.status === 'Approved / PO Received' ? 'selected' : ''}>Approved / PO Received</option>
                        <option value="Converted to Project" ${quote.status === 'Converted to Project' ? 'selected' : ''}>Converted to Project</option>
                        <option value="Lost - Dropped" ${quote.status === 'Lost - Dropped' ? 'selected' : ''}>Lost - Dropped</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Validity (Days)</label>
                      <input type="number" id="qeValidity" class="form-control" value="${quote.validityDays || 15}" min="1">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Commercial Notes & Remarks</label>
                    <textarea id="qeNotes" class="form-control" rows="2" placeholder="Special payment terms or remarks...">${quote.notes || ''}</textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" id="deleteQeModalBtn" class="btn btn-secondary" style="color: var(--red-accent); margin-right: auto;">
                    Delete Quotation
                  </button>
                  <button type="button" id="cancelQuickEditBtn" class="btn btn-secondary">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        const modal = document.getElementById('quotationQuickEditModal');
        const close = () => modal.remove();

        document.getElementById('closeQuickEditModalBtn')?.addEventListener('click', close);
        document.getElementById('cancelQuickEditBtn')?.addEventListener('click', close);

        document.getElementById('deleteQeModalBtn')?.addEventListener('click', () => {
          if (confirm(`Are you sure you want to delete quotation ${quote.refNo}?`)) {
            store.deleteSavedQuotation(quote.id);
            close();
            showToast(`Deleted quotation ${quote.refNo}`, 'info');
            updateView();
          }
        });

        document.getElementById('quotationQuickEditForm')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const updates = {
            refNo: document.getElementById('qeRefNo').value.trim(),
            date: document.getElementById('qeDate').value,
            clientName: document.getElementById('qeClientName').value.trim(),
            site: document.getElementById('qeSite').value.trim(),
            department: document.getElementById('qeDept').value.trim(),
            scopeOfWork: document.getElementById('qeScope').value.trim(),
            status: document.getElementById('qeStatus').value,
            validityDays: Number(document.getElementById('qeValidity').value) || 15,
            notes: document.getElementById('qeNotes').value.trim()
          };

          store.updateSavedQuotation(quote.id, updates);
          close();
          showToast(`Updated quotation ${updates.refNo}`);
          updateView();
        });
      }

      attachStorageRowEvents();

      // Tab switcher events
      document.getElementById('tabToStudioBtn')?.addEventListener('click', () => {
        activeTab = 'studio';
        updateView();
      });
      document.getElementById('tabToPreviewBtn')?.addEventListener('click', () => {
        activeTab = 'preview';
        updateView();
      });
      document.getElementById('storageNewQuoteBtn')?.addEventListener('click', () => {
        store.newQuotation();
        showToast('Created new blank proposal draft');
        activeTab = 'studio';
        updateView();
      });

      return;
    }

    // =========================================================================
    // VIEW 3: BOQ PROPOSAL STUDIO (PRIMARY BUILDER)
    // =========================================================================
    const qtn = store.state.quotation;
    const qtnTerms = Array.isArray(qtn.terms) && qtn.terms.length > 0 ? qtn.terms : effectiveTerms;
    if (!Array.isArray(qtn.terms) || qtn.terms.length === 0) {
      qtn.terms = [...qtnTerms];
      store.updateQuotation({ terms: qtn.terms });
    }

    container.innerHTML = `
      <div class="quotation-module-view">
        <!-- Navigation Tabs -->
        <div class="quotation-tabs-nav">
          <button id="tabToStudioBtn" class="quotation-tab-btn active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            BOQ Proposal Studio
          </button>
          <button id="tabToStorageBtn" class="quotation-tab-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Quotation Storage & Archives (${savedQuotations.length})
          </button>
          <button id="tabToPreviewBtn" class="quotation-tab-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            View Official A4 Proposal
          </button>
        </div>

        <!-- Studio Action Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="status-pill status-instock" style="background: rgba(37, 99, 235, 0.25); color: #60a5fa; margin-bottom: 6px;">
                ● ACTIVE WORKING PROPOSAL • ${qtn.refNo}
              </span>
              <h2 style="font-size: 22px; font-weight: 800; color: #fff;">
                COMMERCIAL PROPOSAL & GST BILL OF QUANTITIES (BOQ) STUDIO
              </h2>
              <p style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">
                Directly connected to 42+ Item Master Catalog, dynamic Party Selector with Ajax dropdown, and 18% GST statutory computation.
              </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="openMasterItemPickerBtn" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                + Pick from Item Master
              </button>
              <button id="saveToStorageBtn" class="btn btn-success btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                💾 Save to Storage
              </button>
              <button id="newProposalDraftBtn" class="btn btn-secondary btn-sm" title="Clear and start a fresh proposal">
                + New Quote
              </button>
              <button id="previewProposalBtn" class="btn btn-secondary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Official A4 View
              </button>
            </div>
          </div>
        </div>

        <!-- Margin & Profit Health Banner -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Taxable Quoted Subtotal</div>
              <div style="font-size: 18px; font-weight: 800; color: #38bdf8;">₹${taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Est. Dealer Cost</div>
              <div style="font-size: 18px; font-weight: 700; color: var(--text-muted);">₹${Math.round(estimatedCost).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Expected Gross Profit</div>
              <div style="font-size: 18px; font-weight: 800; color: #34d399;">₹${Math.round(estProfit).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Profit Margin</div>
              <div style="font-size: 18px; font-weight: 800; color: ${estMarginPct >= 30 ? '#34d399' : '#fbbf24'};">${estMarginPct.toFixed(1)}%</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="status-pill ${estMarginPct >= 30 ? 'status-instock' : 'status-pending'}">
              ${estMarginPct >= 30 ? 'High Profit Margin (>30%)' : 'Margin Below 30%'}
            </span>
          </div>
        </div>

        <!-- Proposal Metadata & Party Selector -->
        <div class="table-card" style="padding: 22px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main);">Quotation Header & Client Party Selector</h3>
              <p style="font-size: 12px; color: var(--text-muted);">Search while typing to pick an existing registered party or add a new client directly</p>
            </div>
            <button id="addPartyModalBtn" class="btn btn-secondary btn-sm" style="color: #60a5fa;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              + Add New Party to Master
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
            <!-- DYNAMIC AJAX PARTY SELECTOR -->
            <div class="form-group" style="position: relative;">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Client / Party Name <strong style="color: #38bdf8;">(Search while typing)</strong></span>
                <span id="partyMatchCount" style="font-size: 11px; color: var(--text-dim);">${parties.length} Registered</span>
              </label>
              <div class="party-autocomplete-wrap">
                <input 
                  type="text" 
                  id="qtnPartySearchInput" 
                  class="form-control" 
                  placeholder="Type party name, e.g. UHBVN, Goyal, Sugar..." 
                  value="${qtn.clientName || ''}" 
                  autocomplete="off"
                  style="padding-right: 32px;"
                >
                <div id="partyDropdownPanel" class="party-dropdown-panel" style="display: none;"></div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Quotation Ref Number</label>
              <input type="text" id="qtnRefNo" class="form-control" value="${qtn.refNo}" style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">
            </div>

            <div class="form-group">
              <label class="form-label">Proposal Date</label>
              <input type="date" id="qtnDate" class="form-control" value="${qtn.date}">
            </div>

            <div class="form-group">
              <label class="form-label">Validity Period</label>
              <select id="qtnValidity" class="form-control">
                <option value="15" ${qtn.validityDays == 15 ? 'selected' : ''}>15 Days Validity</option>
                <option value="30" ${qtn.validityDays == 30 ? 'selected' : ''}>30 Days Validity</option>
                <option value="45" ${qtn.validityDays == 45 ? 'selected' : ''}>45 Days Validity</option>
                <option value="60" ${qtn.validityDays == 60 ? 'selected' : ''}>60 Days Validity</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Client Department / Wing</label>
              <input type="text" id="qtnDept" class="form-control" placeholder="e.g. Substation Works, Commercial Yard" value="${qtn.department || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Site / Delivery Premises</label>
              <input type="text" id="qtnSite" class="form-control" placeholder="e.g. City Division West, Jattal Road, Panipat" value="${qtn.site || ''}">
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Scope of Work & Technical Assignment</label>
              <input type="text" id="qtnScope" class="form-control" value="${qtn.scopeOfWork || ''}">
            </div>
          </div>
        </div>

        <!-- Editable BOQ Items Table -->
        <div class="table-card" style="margin-bottom: 24px; overflow: visible;">
          <div class="table-header-bar" style="flex-wrap: wrap; gap: 12px;">
            <div class="table-title-group">
              <h3>Bill of Quantities (${qtn.items.length} Line Items)</h3>
              <p>Type in any item field to search Master Catalog with Ajax autocomplete or enter custom hardware</p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="addBoqLineItemBtn" class="btn btn-primary btn-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Add Line Item
              </button>
            </div>
          </div>

          <div class="table-responsive" style="overflow: visible;">
            <table class="erp-table">
              <thead>
                <tr>
                  <th class="text-center" style="width: 45px;">#</th>
                  <th style="min-width: 340px;">Item Nomenclature & Technical Specifications</th>
                  <th class="text-center" style="width: 110px;">HSN/SAC</th>
                  <th class="text-center" style="width: 80px;">Qty</th>
                  <th class="text-center" style="width: 80px;">Unit</th>
                  <th class="text-right" style="width: 140px;">Unit Rate (₹)</th>
                  <th class="text-right" style="width: 140px;">Taxable (₹)</th>
                  <th class="text-center" style="width: 50px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${qtn.items.map((item, idx) => `
                  <tr>
                    <td class="text-center" style="font-weight: 700;">${idx + 1}</td>
                    <td style="position: relative; min-width: 340px;">
                      <div class="boq-item-autocomplete-wrap" data-idx="${idx}">
                        <input type="text" 
                               class="form-control boq-desc-input" 
                               data-idx="${idx}" 
                               value="${(item.desc || item.name || '').replace(/"/g, '&quot;')}" 
                               placeholder="Search item master or enter custom (e.g. CP Plus, Dome, 6TB, Cable...)" 
                               autocomplete="off"
                               style="padding: 7px 10px; font-size: 13px; font-weight: 500;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 3px;">
                          <span style="font-size: 11px; color: var(--text-dim); font-family: monospace;">
                            SKU: <strong style="color: var(--blue-accent);">${item.sku || 'CUSTOM'}</strong>
                          </span>
                          <span style="font-size: 10px; color: #38bdf8; opacity: 0.85;">⚡ Embedded Master Search</span>
                        </div>
                        <div class="boq-item-dropdown-panel" id="boqItemDropdown_${idx}" style="display: none;"></div>
                      </div>
                    </td>
                    <td class="text-center">
                      <input type="text" class="form-control text-center boq-hsn-input" data-idx="${idx}" value="${item.hsn || '85258090'}" style="padding: 6px; font-size: 12px; font-family: monospace;">
                    </td>
                    <td class="text-center">
                      <input type="number" class="form-control text-center boq-qty-input" data-idx="${idx}" value="${item.qty}" min="1" style="padding: 6px; font-size: 13px; font-weight: 700;">
                    </td>
                    <td class="text-center">
                      <input type="text" class="form-control text-center boq-unit-input" data-idx="${idx}" value="${item.unit || 'Nos'}" style="padding: 6px; font-size: 12px;">
                    </td>
                    <td class="text-right">
                      <input type="number" class="form-control text-right boq-rate-input" data-idx="${idx}" value="${item.rate}" step="0.01" style="padding: 6px; font-size: 13px; font-weight: 700; color: #38bdf8;">
                    </td>
                    <td class="text-right" style="font-weight: 700; font-family: 'Outfit', sans-serif; font-size: 14.5px;">
                      ₹${((Number(item.qty) || 0) * (Number(item.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td class="text-center">
                      <button class="btn btn-secondary btn-sm delete-boq-item-btn" data-idx="${idx}" style="padding: 4px 8px; color: var(--red-accent);" title="Remove row">
                        &times;
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" class="text-right" style="font-weight: 600;">GROSS ITEMS SUBTOTAL:</td>
                  <td colspan="2" class="text-right" style="font-size: 15px; font-weight: 700; color: var(--text-main);">₹${grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
                ${overallDiscount > 0 ? `
                  <tr style="color: #10b981;">
                    <td colspan="5" class="text-right" style="font-weight: 600;">Special Commercial Discount (${discountType === 'percent' ? discountValue + '%' : 'Flat'}):</td>
                    <td colspan="2" class="text-right" style="font-weight: 700; color: #10b981;">-₹${overallDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                ` : ''}
                ${shippingCharges > 0 ? `
                  <tr>
                    <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-muted);">Freight, Logistics & Shipping:</td>
                    <td colspan="2" class="text-right" style="font-weight: 600;">₹${shippingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                ` : ''}
                ${installationCharges > 0 ? `
                  <tr>
                    <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-muted);">Installation, Cabling & Commissioning:</td>
                    <td colspan="2" class="text-right" style="font-weight: 600;">₹${installationCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                ` : ''}
                ${packagingCharges > 0 ? `
                  <tr>
                    <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-muted);">Packaging & Handling:</td>
                    <td colspan="2" class="text-right" style="font-weight: 600;">₹${packagingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                ` : ''}
                <tr style="border-top: 1px solid var(--border-color);">
                  <td colspan="5" class="text-right" style="font-weight: 700; color: #38bdf8;">TAXABLE VALUE:</td>
                  <td colspan="2" class="text-right" style="font-size: 15px; font-weight: 700; color: #38bdf8;">₹${taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
                ${gstEnabled && gstRate > 0 ? (
                  isInterstate ? `
                    <tr>
                      <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-muted);">Integrated GST (IGST @ ${gstRate}%):</td>
                      <td colspan="2" class="text-right" style="font-weight: 600;">₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  ` : `
                    <tr>
                      <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-muted);">Central GST (CGST @ ${(gstRate / 2).toFixed(1)}%):</td>
                      <td colspan="2" class="text-right" style="font-weight: 600;">₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-muted);">State GST (SGST @ ${(gstRate / 2).toFixed(1)}%):</td>
                      <td colspan="2" class="text-right" style="font-weight: 600;">₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  `
                ) : `
                  <tr>
                    <td colspan="5" class="text-right" style="font-weight: 500; color: var(--text-dim); font-style: italic;">Statutory GST:</td>
                    <td colspan="2" class="text-right" style="color: var(--text-dim); font-style: italic;">Exempt / Non-Taxable (0%)</td>
                    <td></td>
                  </tr>
                `}
                ${roundOff !== 0 ? `
                  <tr>
                    <td colspan="5" class="text-right" style="font-size: 12px; color: var(--text-dim);">Round-Off Adjustment:</td>
                    <td colspan="2" class="text-right" style="font-size: 12px; color: var(--text-dim);">${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}</td>
                    <td></td>
                  </tr>
                ` : ''}
                <tr>
                  <td colspan="5" class="text-right" style="font-size: 15px; font-weight: 800; color: #34d399;">
                    NET PAYABLE ESTIMATE ${gstEnabled && gstRate > 0 ? `(INCL. ${gstRate}% GST)` : '(NON-GST)'}:
                  </td>
                  <td colspan="2" class="text-right" style="font-size: 18px; font-weight: 800; color: #34d399;">
                    ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="5" class="text-right" style="font-size: 11.5px; color: #0284c7;">
                    Payment Terms (${advancePct}% Advance / ${100 - advancePct}% on Sign-off):
                  </td>
                  <td colspan="2" class="text-right" style="font-size: 12px; font-weight: 700; color: #0284c7;">
                    Adv: ₹${advanceAmount.toLocaleString('en-IN')} | Bal: ₹${balanceAmount.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Commercial, Accounting & Taxation Variables Control Panel -->
          <div style="background: var(--bg-card-subtle); border-top: 1px solid var(--border-color); padding: 20px 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h4 style="font-size: 14.5px; font-weight: 700; color: var(--text-main); margin-bottom: 3px; display: flex; align-items: center; gap: 8px;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  Commercial, Accounting & Taxation Variables
                </h4>
                <p style="font-size: 11.5px; color: var(--text-muted); margin: 0;">
                  Make GST optional or set custom rates, apply percentage or flat discounts, configure shipping and installation, and control rounding.
                </p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-pill ${gstEnabled && gstRate > 0 ? 'status-instock' : 'status-progress'}" style="font-size: 11px;">
                  ${gstEnabled && gstRate > 0 ? `● GST Active (${gstRate}% ${isInterstate ? 'IGST' : 'CGST+SGST'})` : '○ Non-GST / Tax-Exempt (0%)'}
                </span>
                ${overallDiscount > 0 ? `
                  <span class="status-pill status-instock" style="font-size: 11px; background: rgba(16, 185, 129, 0.15); color: #10b981;">
                    🏷️ Discount -₹${overallDiscount.toLocaleString('en-IN')}
                  </span>
                ` : ''}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 18px;">
              <!-- 1. GST & Taxation Configuration -->
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 12.5px; font-weight: 700; color: #38bdf8;">1. Statutory GST & Supply</span>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-main);">
                    <input type="checkbox" id="qtnGstToggle" ${gstEnabled ? 'checked' : ''}>
                    Enable GST
                  </label>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">GST Rate (%)</label>
                    <select id="qtnGstRateSelect" class="form-control" style="font-size: 12px;" ${!gstEnabled ? 'disabled' : ''}>
                      <option value="18" ${gstRate === 18 ? 'selected' : ''}>18% (Standard CCTV)</option>
                      <option value="28" ${gstRate === 28 ? 'selected' : ''}>28% (Commercial Displays)</option>
                      <option value="12" ${gstRate === 12 ? 'selected' : ''}>12% (IT / Turnkey)</option>
                      <option value="5" ${gstRate === 5 ? 'selected' : ''}>5% (Essential Solar/Low-V)</option>
                      <option value="0" ${gstRate === 0 ? 'selected' : ''}>0% (Tax-Exempt)</option>
                      <option value="custom" ${![0, 5, 12, 18, 28].includes(gstRate) ? 'selected' : ''}>Custom %...</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Supply Jurisdiction</label>
                    <select id="qtnTaxTypeSelect" class="form-control" style="font-size: 12px;" ${!gstEnabled ? 'disabled' : ''}>
                      <option value="intra" ${!isInterstate ? 'selected' : ''}>Intra-State (CGST+SGST)</option>
                      <option value="inter" ${isInterstate ? 'selected' : ''}>Inter-State (IGST Full)</option>
                    </select>
                  </div>
                </div>

                ${![0, 5, 12, 18, 28].includes(gstRate) && gstEnabled ? `
                  <div class="form-group" style="margin-top: 10px; margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Custom GST Rate (%)</label>
                    <input type="number" id="qtnGstRateCustom" class="form-control" value="${gstRate}" min="0" max="100" step="0.1">
                  </div>
                ` : ''}

                <div style="font-size: 11px; color: var(--text-dim); margin-top: 8px;">
                  ${gstEnabled && gstRate > 0 ? (
                    isInterstate ? `Inter-State supply: Full ${gstRate}% charged as IGST (₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}).` :
                    `Intra-State supply: ${(gstRate/2).toFixed(1)}% CGST (₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) + ${(gstRate/2).toFixed(1)}% SGST (₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}).`
                  ) : 'GST disabled: Quotation is generated as Non-GST / Tax-Exempt with 0 tax.'}
                </div>
              </div>

              <!-- 2. Commercial Discount -->
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 12.5px; font-weight: 700; color: #10b981;">2. Commercial Discount</span>
                  <span style="font-size: 11.5px; font-weight: 600; color: ${overallDiscount > 0 ? '#10b981' : 'var(--text-dim)'};">
                    ${overallDiscount > 0 ? `-₹${overallDiscount.toLocaleString('en-IN')}` : 'No discount'}
                  </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Discount Mode</label>
                    <select id="qtnDiscountType" class="form-control" style="font-size: 12px;">
                      <option value="percent" ${discountType === 'percent' ? 'selected' : ''}>Percentage (%)</option>
                      <option value="flat" ${discountType === 'flat' ? 'selected' : ''}>Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Discount Value (${discountType === 'percent' ? '%' : '₹'})</label>
                    <input type="number" id="qtnDiscountValue" class="form-control" value="${discountValue}" min="0" step="${discountType === 'percent' ? '0.5' : '100'}" style="font-weight: 700; color: #10b981; font-size: 12px;">
                  </div>
                </div>

                <div style="font-size: 11px; color: var(--text-dim); margin-top: 8px;">
                  Applied before tax on net items total (₹${grossSubtotal.toLocaleString('en-IN')}). Reduces taxable subtotal to ₹${taxableGoodsSubtotal.toLocaleString('en-IN')}.
                </div>
              </div>

              <!-- 3. Additional Accounting Variables & Rounding -->
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 12.5px; font-weight: 700; color: #f59e0b;">3. Logistics, Labour & Terms</span>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-main);">
                    <input type="checkbox" id="qtnRoundOffToggle" ${roundOffEnabled ? 'checked' : ''}>
                    Auto Round (₹)
                  </label>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px;">Freight / Shipping (₹)</label>
                    <input type="number" id="qtnShippingCharges" class="form-control" value="${shippingCharges}" min="0" step="50" style="font-size: 12px;">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <div style="display: flex; justify-content: space-between;">
                      <label class="form-label" style="font-size: 11px;">Installation (₹)</label>
                      <button type="button" id="autoCalcInstallBtn" style="background: none; border: none; padding: 0; color: #38bdf8; font-size: 10px; cursor: pointer; font-weight: 600;" title="Auto compute ₹600/cam">⚡ Auto</button>
                    </div>
                    <input type="number" id="qtnInstallationCharges" class="form-control" value="${installationCharges}" min="0" step="100" style="font-size: 12px;">
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: var(--text-dim);">
                  <span>Advance Payment:</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" id="qtnAdvancePct" class="form-control text-center" value="${advancePct}" min="0" max="100" style="width: 50px; padding: 2px 4px; font-size: 11px; height: 24px;">
                    <span>% (₹${advanceAmount.toLocaleString('en-IN')})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Commercial Terms & Statutory Conditions Card -->
        <div class="table-card" style="padding: 22px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-pill status-instock" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; font-weight: 700;">
                  LEGAL & STATUTORY TERMS
                </span>
                <h3 style="font-size: 15.5px; font-weight: 700; color: var(--text-main); margin: 0;">
                  Commercial Terms & Statutory Conditions (${qtnTerms.length} Clauses)
                </h3>
              </div>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">
                Customize clauses for this quotation. These terms print directly on the official client proposal.
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="autoSyncTermsBtn" class="btn btn-secondary btn-sm" title="Recompute payment & GST clauses with active variables">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                Auto-Sync with Accounting
              </button>
              <button type="button" id="resetTermsDefaultBtn" class="btn btn-secondary btn-sm" title="Restore company default terms from Settings">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
                Reset to Defaults
              </button>
              <button type="button" id="toggleRawTermsBtn" class="btn btn-secondary btn-sm" title="Switch to multi-line plain text bulk editor">
                📝 Bulk Text Editor
              </button>
              <button type="button" id="addTermClauseBtn" class="btn btn-primary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Add Clause
              </button>
            </div>
          </div>

          <!-- Bulk Textarea Editor (collapsible) -->
          <div id="bulkTermsWrapper" style="display: none; margin-bottom: 16px; background: var(--bg-card-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            <label class="form-label" style="font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block;">
              Edit All Terms as Multiline Text (One clause per line):
            </label>
            <textarea id="bulkTermsTextarea" class="form-control" rows="6" style="font-size: 12px; line-height: 1.5; resize: vertical;"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
              <button type="button" id="cancelBulkTermsBtn" class="btn btn-secondary btn-sm">Cancel</button>
              <button type="button" id="applyBulkTermsBtn" class="btn btn-primary btn-sm">Apply Bulk Terms</button>
            </div>
          </div>

          <!-- Clause-by-Clause Interactive List -->
          <div id="studioTermsList" style="display: flex; flex-direction: column; gap: 10px;">
            ${qtnTerms.map((term, idx) => `
              <div class="studio-term-row" data-idx="${idx}" style="display: flex; align-items: flex-start; gap: 10px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 12px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 700; font-size: 12px; flex-shrink: 0; margin-top: 4px;">
                  ${idx + 1}
                </span>
                <div style="flex: 1;">
                  <textarea class="form-control qtn-term-input" data-idx="${idx}" rows="2" style="font-size: 12.5px; line-height: 1.4; resize: vertical; padding: 6px 10px;">${term.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <button type="button" class="btn btn-secondary btn-sm delete-qtn-term-btn" data-idx="${idx}" title="Delete this clause" style="color: #ef4444; padding: 4px 8px; height: 28px;">
                    ✕
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // =========================================================================
    // EVENT ATTACHMENTS (STUDIO)
    // =========================================================================

    // Top Tabs
    document.getElementById('tabToStorageBtn')?.addEventListener('click', () => {
      activeTab = 'storage';
      updateView();
    });
    document.getElementById('tabToPreviewBtn')?.addEventListener('click', () => {
      activeTab = 'preview';
      updateView();
    });
    document.getElementById('previewProposalBtn')?.addEventListener('click', () => {
      activeTab = 'preview';
      updateView();
    });

    // Save to Storage
    document.getElementById('saveToStorageBtn')?.addEventListener('click', () => {
      openSaveQuotationModal(() => {
        showToast(`Saved quotation ${store.state.quotation.refNo} to storage repository!`);
        updateView();
      });
    });

    // New Proposal Draft
    document.getElementById('newProposalDraftBtn')?.addEventListener('click', () => {
      if (confirm('Start a fresh blank proposal draft? Any unsaved edits will be replaced.')) {
        store.newQuotation();
        showToast('Initialized clean proposal draft');
        updateView();
      }
    });

    // Add Line Item (with immediate focus into embedded Ajax item search field)
    const handleAddLineItem = () => {
      store.addQuotationItem({
        sku: '',
        desc: '',
        hsn: '85258090',
        qty: 1,
        unit: 'Nos',
        rate: 0
      });
      updateView();
      setTimeout(() => {
        const inputs = container.querySelectorAll('.boq-desc-input');
        if (inputs.length) {
          const lastInput = inputs[inputs.length - 1];
          lastInput.focus();
          renderItemDropdownForRow(inputs.length - 1, '');
        }
      }, 50);
    };

    document.getElementById('addBoqLineItemBtn')?.addEventListener('click', handleAddLineItem);
    document.getElementById('addManualBoqRowBtn')?.addEventListener('click', handleAddLineItem);

    // Add Party Modal
    document.getElementById('addPartyModalBtn')?.addEventListener('click', () => {
      openAddPartyModal('', (newParty) => {
        store.updateQuotation({
          clientName: newParty.name,
          department: newParty.department,
          site: newParty.site,
          placeOfSupply: newParty.placeOfSupply
        });
        showToast(`Selected new party: ${newParty.name}`);
        updateView();
      });
    });

    // -------------------------------------------------------------------------
    // DYNAMIC AJAX PARTY AUTOCOMPLETE
    // -------------------------------------------------------------------------
    const partyInput = document.getElementById('qtnPartySearchInput');
    const partyDropdown = document.getElementById('partyDropdownPanel');

    function renderPartyDropdown(query) {
      if (!partyDropdown) return;
      const q = (query || '').toLowerCase().trim();
      const allParties = store.state.parties || [];

      const filtered = allParties.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.contactPerson || '').toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q) ||
        (p.site || '').toLowerCase().includes(q)
      );

      let itemsHtml = '';
      if (filtered.length > 0) {
        itemsHtml = filtered.map(p => `
          <div class="party-dropdown-item" data-id="${p.id}">
            <div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 13px;">${p.name}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                ${p.contactPerson ? `${p.contactPerson} &bull; ` : ''}${p.department || ''}
              </div>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">
                📍 ${p.site || ''} ${p.gstin ? `&bull; GSTIN: ${p.gstin}` : ''}
              </div>
            </div>
            <span class="status-pill status-instock" style="font-size: 10px; padding: 2px 6px;">Select</span>
          </div>
        `).join('');
      } else {
        itemsHtml = `
          <div style="padding: 12px 14px; font-size: 12px; color: var(--text-muted);">
            No matching registered client found for "<strong>${query}</strong>"
          </div>
        `;
      }

      // Add "Create new party" footer
      const createFooter = `
        <div class="party-dropdown-create" id="partyDropdownCreateOption">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
          <span>+ Add "<strong>${query || 'New Client Party'}</strong>" as Registered Party</span>
        </div>
      `;

      partyDropdown.innerHTML = itemsHtml + createFooter;
      partyDropdown.style.display = 'block';

      // Attach clicks to items
      partyDropdown.querySelectorAll('.party-dropdown-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
          const pId = itemEl.getAttribute('data-id');
          const p = allParties.find(x => x.id === pId);
          if (p) {
            const isInter = Boolean(p.placeOfSupply && !p.placeOfSupply.toLowerCase().includes('haryana'));
            store.updateQuotation({
              clientName: p.name,
              department: p.department || '',
              site: p.site || '',
              placeOfSupply: p.placeOfSupply || 'Haryana (06) - Intra-State GST Supply',
              isInterstate: isInter,
              taxType: isInter ? 'inter' : 'intra'
            });
            partyInput.value = p.name;
            partyDropdown.style.display = 'none';
            showToast(`Loaded details for ${p.name}`);
            updateView();
          }
        });
      });

      // Attach click to create footer
      document.getElementById('partyDropdownCreateOption')?.addEventListener('click', () => {
        partyDropdown.style.display = 'none';
        openAddPartyModal(query, (newParty) => {
          store.updateQuotation({
            clientName: newParty.name,
            department: newParty.department,
            site: newParty.site,
            placeOfSupply: newParty.placeOfSupply
          });
          showToast(`Added and selected ${newParty.name}`);
          updateView();
        });
      });
    }

    partyInput?.addEventListener('focus', () => {
      renderPartyDropdown(partyInput.value);
    });

    partyInput?.addEventListener('input', (e) => {
      store.updateQuotation({ clientName: e.target.value });
      renderPartyDropdown(e.target.value);
    });

    // Close party dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.party-autocomplete-wrap')) {
        if (partyDropdown) partyDropdown.style.display = 'none';
      }
    });

    // -------------------------------------------------------------------------
    // DYNAMIC AJAX ITEM AUTOCOMPLETE FOR BOQ TABLE
    // -------------------------------------------------------------------------
    function renderItemDropdownForRow(idx, query) {
      const dropdown = document.getElementById(`boqItemDropdown_${idx}`);
      if (!dropdown) return;

      const parentTr = dropdown.closest('tr');
      container.querySelectorAll('tbody tr').forEach(tr => tr.classList.remove('boq-row-active-dropdown'));
      if (parentTr) parentTr.classList.add('boq-row-active-dropdown');

      const q = (query || '').toLowerCase().trim();
      const allItems = store.state.items || [];

      let matches = [];
      if (q.length === 0) {
        matches = allItems.slice(0, 8);
      } else {
        matches = allItems.filter(item => 
          (item.name || '').toLowerCase().includes(q) ||
          (item.sku || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q) ||
          (item.brand || '').toLowerCase().includes(q) ||
          (item.specs || '').toLowerCase().includes(q)
        ).slice(0, 10);
      }

      container.querySelectorAll('.boq-item-dropdown-panel').forEach(d => {
        if (d !== dropdown) d.style.display = 'none';
      });

      let itemsHtml = '';
      if (matches.length > 0) {
        itemsHtml = matches.map((item, mIdx) => `
          <div class="boq-item-dropdown-row ${mIdx === 0 && q.length > 0 ? 'active' : ''}" data-sku="${item.sku}">
            <div style="flex: 1; min-width: 0;">
              <div class="item-title">${item.name}</div>
              <div class="item-sub">
                <span style="font-family: monospace; color: var(--blue-accent); font-weight: 600;">${item.sku}</span>
                <span>&bull;</span>
                <span>${item.category || 'General'}</span>
                <span>&bull;</span>
                <span>HSN: ${item.hsn || '85258090'}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="item-rate">₹${Number(item.retailSelling || item.dealerCost || 0).toLocaleString('en-IN')}</div>
              <span class="status-pill status-instock" style="font-size: 10px; padding: 2px 6px;">Select</span>
            </div>
          </div>
        `).join('');
      } else {
        itemsHtml = `
          <div style="padding: 12px 14px; font-size: 12px; color: var(--text-muted);">
            No catalog item matching "<strong>${query}</strong>"
          </div>
        `;
      }

      const createOption = `
        <div class="boq-item-dropdown-create" id="boqItemCreateNew_${idx}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>+ Add "<strong>${query || 'New SKU'}</strong>" to Item Master</span>
        </div>
      `;

      dropdown.innerHTML = itemsHtml + createOption;
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.boq-item-dropdown-row').forEach(rowEl => {
        rowEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const sku = rowEl.getAttribute('data-sku');
          const selectedItem = allItems.find(i => i.sku === sku);
          if (selectedItem) {
            store.updateQuotationItem(idx, {
              sku: selectedItem.sku,
              name: selectedItem.name,
              desc: selectedItem.name,
              hsn: selectedItem.hsn || '85258090',
              rate: Number(selectedItem.retailSelling || selectedItem.dealerCost || 0),
              unit: selectedItem.unit || 'Nos'
            });
            dropdown.style.display = 'none';
            if (parentTr) parentTr.classList.remove('boq-row-active-dropdown');
            showToast(`Selected SKU ${selectedItem.sku}: ${selectedItem.name}`);
            updateView();
          }
        });
      });

      document.getElementById(`boqItemCreateNew_${idx}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = 'none';
        if (parentTr) parentTr.classList.remove('boq-row-active-dropdown');
        openCreateMasterItemModal(query, (newItem) => {
          store.updateQuotationItem(idx, {
            sku: newItem.sku,
            name: newItem.name,
            desc: newItem.name,
            hsn: newItem.hsn || '85258090',
            rate: Number(newItem.retailSelling || 0),
            unit: newItem.unit || 'Nos'
          });
          showToast(`Added to Master & selected: ${newItem.name}`);
          updateView();
        });
      });
    }

    container.querySelectorAll('.boq-desc-input').forEach(input => {
      const idx = Number(input.getAttribute('data-idx'));

      input.addEventListener('focus', () => {
        renderItemDropdownForRow(idx, input.value);
      });

      input.addEventListener('input', (e) => {
        renderItemDropdownForRow(idx, e.target.value);
      });

      input.addEventListener('change', (e) => {
        store.updateQuotationItem(idx, { desc: e.target.value });
      });

      input.addEventListener('keydown', (e) => {
        const dropdown = document.getElementById(`boqItemDropdown_${idx}`);
        if (!dropdown || dropdown.style.display === 'none') return;

        const rows = Array.from(dropdown.querySelectorAll('.boq-item-dropdown-row'));
        const activeIdx = rows.findIndex(r => r.classList.contains('active'));

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = activeIdx < rows.length - 1 ? activeIdx + 1 : 0;
          rows.forEach((r, i) => r.classList.toggle('active', i === nextIdx));
          rows[nextIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = activeIdx > 0 ? activeIdx - 1 : rows.length - 1;
          rows.forEach((r, i) => r.classList.toggle('active', i === prevIdx));
          rows[prevIdx]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          if (activeIdx !== -1 && rows[activeIdx]) {
            e.preventDefault();
            rows[activeIdx].click();
          }
        } else if (e.key === 'Escape') {
          dropdown.style.display = 'none';
          dropdown.closest('tr')?.classList.remove('boq-row-active-dropdown');
        }
      });
    });

    // Close any open item dropdowns on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.boq-item-autocomplete-wrap')) {
        container.querySelectorAll('.boq-item-dropdown-panel').forEach(d => {
          d.style.display = 'none';
        });
        container.querySelectorAll('tbody tr').forEach(tr => {
          tr.classList.remove('boq-row-active-dropdown');
        });
      }
    });

    // -------------------------------------------------------------------------
    // INPUT LISTENERS FOR BOQ TABLE (QTY, RATE, HSN, UNIT, DELETE)
    // -------------------------------------------------------------------------
    container.querySelectorAll('.boq-qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        store.updateQuotationItem(idx, { qty: Number(e.target.value) || 1 });
        updateView();
      });
    });

    container.querySelectorAll('.boq-rate-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        store.updateQuotationItem(idx, { rate: Number(e.target.value) || 0 });
        updateView();
      });
    });

    container.querySelectorAll('.boq-hsn-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        store.updateQuotationItem(idx, { hsn: e.target.value });
      });
    });

    container.querySelectorAll('.boq-unit-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        store.updateQuotationItem(idx, { unit: e.target.value });
      });
    });

    container.querySelectorAll('.delete-boq-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        store.removeQuotationItem(idx);
        updateView();
      });
    });

    // Header inputs update
    document.getElementById('qtnRefNo')?.addEventListener('change', (e) => {
      store.updateQuotation({ refNo: e.target.value });
    });
    document.getElementById('qtnDate')?.addEventListener('change', (e) => {
      store.updateQuotation({ date: e.target.value });
    });
    document.getElementById('qtnValidity')?.addEventListener('change', (e) => {
      store.updateQuotation({ validityDays: Number(e.target.value) });
    });
    document.getElementById('qtnDept')?.addEventListener('change', (e) => {
      store.updateQuotation({ department: e.target.value });
    });
    document.getElementById('qtnSite')?.addEventListener('change', (e) => {
      store.updateQuotation({ site: e.target.value });
    });
    document.getElementById('qtnScope')?.addEventListener('change', (e) => {
      store.updateQuotation({ scopeOfWork: e.target.value });
    });

    // Accounting & Commercial Variable Listeners
    document.getElementById('qtnGstToggle')?.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      const currentRate = targetQuote.gstRate > 0 ? targetQuote.gstRate : 18;
      store.updateQuotationAccounting({
        gstEnabled: enabled,
        gstRate: enabled ? currentRate : 0
      });
      updateView();
    });

    document.getElementById('qtnGstRateSelect')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        store.updateQuotationAccounting({ gstRate: targetQuote.gstRate || 18, gstEnabled: true });
      } else {
        const rate = Number(val);
        store.updateQuotationAccounting({ gstRate: rate, gstEnabled: rate > 0 });
      }
      updateView();
    });

    document.getElementById('qtnGstRateCustom')?.addEventListener('change', (e) => {
      const rate = Math.max(0, Number(e.target.value) || 0);
      store.updateQuotationAccounting({ gstRate: rate, gstEnabled: rate > 0 });
      updateView();
    });

    document.getElementById('qtnTaxTypeSelect')?.addEventListener('change', (e) => {
      const isInter = e.target.value === 'inter';
      store.updateQuotationAccounting({
        isInterstate: isInter,
        taxType: e.target.value,
        placeOfSupply: isInter ? 'Delhi (07) - Inter-State Supply' : 'Haryana (06) - Intra-State GST Supply'
      });
      updateView();
    });

    document.getElementById('qtnDiscountType')?.addEventListener('change', (e) => {
      store.updateQuotationAccounting({ discountType: e.target.value });
      updateView();
    });

    document.getElementById('qtnDiscountValue')?.addEventListener('change', (e) => {
      store.updateQuotationAccounting({ discountValue: Math.max(0, Number(e.target.value) || 0) });
      updateView();
    });

    document.getElementById('qtnShippingCharges')?.addEventListener('change', (e) => {
      store.updateQuotationAccounting({ shippingCharges: Math.max(0, Number(e.target.value) || 0) });
      updateView();
    });

    document.getElementById('qtnInstallationCharges')?.addEventListener('change', (e) => {
      store.updateQuotationAccounting({ installationCharges: Math.max(0, Number(e.target.value) || 0) });
      updateView();
    });

    document.getElementById('autoCalcInstallBtn')?.addEventListener('click', () => {
      const camCount = (targetQuote.items || []).filter(it => (it.desc || it.name || '').toLowerCase().includes('cam')).reduce((s, it) => s + (Number(it.qty) || 0), 0) || 10;
      const ratePerCam = (db.state.settings?.accounting?.defaultInstallationRatePerCam) || 600;
      store.updateQuotationAccounting({ installationCharges: camCount * ratePerCam });
      showToast(`Auto-computed installation: ₹${ratePerCam} × ${camCount} cameras = ₹${(camCount * ratePerCam).toLocaleString('en-IN')}`);
      updateView();
    });

    document.getElementById('qtnRoundOffToggle')?.addEventListener('change', (e) => {
      store.updateQuotationAccounting({ roundOffEnabled: e.target.checked });
      updateView();
    });

    document.getElementById('qtnAdvancePct')?.addEventListener('change', (e) => {
      store.updateQuotationAccounting({ advancePct: Math.max(0, Math.min(100, Number(e.target.value) || 50)) });
      updateView();
    });

    // Studio Commercial Terms & Statutory Conditions Event Listeners
    // Clause Inputs
    document.querySelectorAll('.qtn-term-input').forEach(textarea => {
      const idx = Number(textarea.dataset.idx);
      const handleTermChange = (e) => {
        const val = e.target.value.trim();
        const currentTerms = [...(qtn.terms || [])];
        if (currentTerms[idx] !== val) {
          currentTerms[idx] = val;
          store.updateQuotation({ terms: currentTerms });
        }
      };
      textarea.addEventListener('change', handleTermChange);
      textarea.addEventListener('blur', handleTermChange);
    });

    // Delete Clause
    document.querySelectorAll('.delete-qtn-term-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const currentTerms = [...(qtn.terms || [])];
        if (idx >= 0 && idx < currentTerms.length) {
          currentTerms.splice(idx, 1);
          store.updateQuotation({ terms: currentTerms });
          showToast('Deleted clause');
          updateView();
        }
      });
    });

    // Add Clause
    document.getElementById('addTermClauseBtn')?.addEventListener('click', () => {
      const currentTerms = [...(qtn.terms || [])];
      currentTerms.push('New Condition: ');
      store.updateQuotation({ terms: currentTerms });
      showToast('Added new clause');
      updateView();
      setTimeout(() => {
        const inputs = document.querySelectorAll('.qtn-term-input');
        if (inputs.length) {
          const last = inputs[inputs.length - 1];
          last.focus();
          last.setSelectionRange(last.value.length, last.value.length);
        }
      }, 50);
    });

    // Auto-Sync Terms from Accounting
    document.getElementById('autoSyncTermsBtn')?.addEventListener('click', () => {
      const synced = generateAutoSyncedTerms(qTotals);
      store.updateQuotation({ terms: synced });
      showToast('Commercial terms auto-synced with active accounting variables!');
      updateView();
    });

    // Reset Terms to Company Defaults
    document.getElementById('resetTermsDefaultBtn')?.addEventListener('click', () => {
      const defaults = getEffectiveQuotationTerms({}, qTotals, defaultStatutoryTerms);
      store.updateQuotation({ terms: defaults });
      showToast('Commercial terms reset to company defaults!');
      updateView();
    });

    // Bulk Multi-line Terms Editor
    const bulkWrapper = document.getElementById('bulkTermsWrapper');
    const bulkTextarea = document.getElementById('bulkTermsTextarea');
    document.getElementById('toggleRawTermsBtn')?.addEventListener('click', () => {
      if (!bulkWrapper || !bulkTextarea) return;
      const isVisible = bulkWrapper.style.display !== 'none';
      if (isVisible) {
        bulkWrapper.style.display = 'none';
      } else {
        bulkWrapper.style.display = 'block';
        bulkTextarea.value = (qtn.terms || []).join('\n');
        bulkTextarea.focus();
      }
    });

    document.getElementById('cancelBulkTermsBtn')?.addEventListener('click', () => {
      if (bulkWrapper) bulkWrapper.style.display = 'none';
    });

    document.getElementById('applyBulkTermsBtn')?.addEventListener('click', () => {
      if (!bulkTextarea) return;
      const newTerms = bulkTextarea.value.split('\n').map(t => t.trim()).filter(Boolean);
      if (newTerms.length === 0) {
        alert('Please enter at least one commercial or statutory condition.');
        return;
      }
      store.updateQuotation({ terms: newTerms });
      showToast('Applied bulk commercial terms!');
      updateView();
    });
  }

  // ===========================================================================
  // MODAL 1: ADD PARTY MODAL
  // ===========================================================================
  function openAddPartyModal(initialName = '', onPartyAdded) {
    const modalHtml = `
      <div id="addPartyModalOverlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 540px;">
          <div class="modal-header">
            <h3 class="modal-title">Register New Client / Party</h3>
            <button id="closePartyModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="addPartyForm">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Party / Organization Name *</label>
                <input type="text" id="newPartyName" class="form-control" value="${initialName || ''}" required placeholder="e.g. Haryana Warehousing Corporation">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Contact Person Name</label>
                  <input type="text" id="newPartyContact" class="form-control" placeholder="e.g. Er. Rajesh Verma">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input type="text" id="newPartyPhone" class="form-control" placeholder="+91 98120-00000">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" id="newPartyEmail" class="form-control" placeholder="procurement@client.com">
                </div>
                <div class="form-group">
                  <label class="form-label">GSTIN (Optional)</label>
                  <input type="text" id="newPartyGstin" class="form-control" placeholder="06AAAAA0000A1Z5" style="text-transform: uppercase;">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Department / Operations Wing</label>
                <input type="text" id="newPartyDept" class="form-control" placeholder="e.g. Cold Chain Logistics Division">
              </div>
              <div class="form-group">
                <label class="form-label">Site / Delivery Address</label>
                <input type="text" id="newPartySite" class="form-control" placeholder="e.g. Industrial Area Phase-I, Sonipat">
              </div>
              <div class="form-group">
                <label class="form-label">Place of Supply (Statutory GST)</label>
                <select id="newPartySupply" class="form-control">
                  <option value="Haryana (06) - Intra-State GST Supply">Haryana (06) - Intra-State (CGST 9% + SGST 9%)</option>
                  <option value="Delhi (07) - Inter-State Supply">Delhi (07) - Inter-State (IGST 18%)</option>
                  <option value="Punjab (03) - Inter-State Supply">Punjab (03) - Inter-State (IGST 18%)</option>
                  <option value="Uttar Pradesh (09) - Inter-State Supply">Uttar Pradesh (09) - Inter-State (IGST 18%)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="cancelPartyModalBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Select Party</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const overlay = document.getElementById('addPartyModalOverlay');
    const close = () => overlay.remove();

    document.getElementById('closePartyModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelPartyModalBtn')?.addEventListener('click', close);

    document.getElementById('addPartyForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const party = store.addParty({
        name: document.getElementById('newPartyName').value.trim(),
        contactPerson: document.getElementById('newPartyContact').value.trim(),
        phone: document.getElementById('newPartyPhone').value.trim(),
        email: document.getElementById('newPartyEmail').value.trim(),
        gstin: document.getElementById('newPartyGstin').value.trim(),
        department: document.getElementById('newPartyDept').value.trim(),
        site: document.getElementById('newPartySite').value.trim(),
        placeOfSupply: document.getElementById('newPartySupply').value
      });
      close();
      if (onPartyAdded) onPartyAdded(party);
    });
  }

  // ===========================================================================
  // MODAL 2: ITEM MASTER PICKER (SEARCH WHILE TYPING + "ADD ITEM TO MASTER")
  // ===========================================================================
  function openItemMasterPickerModal(onAdded) {
    let selectedCategory = '';
    const masterItems = store.state.items;

    const modalHtml = `
      <div id="itemMasterPickerModalOverlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 900px; max-height: 85vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Item Master Catalog Picker</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Filter across ${masterItems.length} verified dossier items or register a new SKU directly
              </p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button id="openCreateItemModalBtn" class="btn btn-success btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                + Add Item to Master
              </button>
              <button id="closeItemPickerBtn" class="modal-close-btn">&times;</button>
            </div>
          </div>

          <div style="padding: 16px 24px; border-bottom: 1px solid var(--border-color); background: var(--bg-card-subtle);">
            <!-- Live Search Bar -->
            <div style="margin-bottom: 12px;">
              <input 
                type="text" 
                id="itemPickerSearchInput" 
                class="form-control" 
                placeholder="Search SKU code, description, brand (e.g. CP Plus, WD Purple, CAT-6, 4MP)..." 
                style="font-size: 13.5px;"
                autofocus
              >
            </div>

            <!-- Category Filter Chips -->
            <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;" id="itemCategoryChipsBar">
              <span class="item-picker-chip active" data-cat="">All (${masterItems.length})</span>
              <span class="item-picker-chip" data-cat="Storage">Storage</span>
              <span class="item-picker-chip" data-cat="IP Cameras">IP Cameras</span>
              <span class="item-picker-chip" data-cat="Analog HD">Analog HD</span>
              <span class="item-picker-chip" data-cat="Network">Network</span>
              <span class="item-picker-chip" data-cat="Cabling">Cables</span>
              <span class="item-picker-chip" data-cat="Power">Power SMPS</span>
              <span class="item-picker-chip" data-cat="Rack">Racks</span>
              <span class="item-picker-chip" data-cat="Display">Displays</span>
              <span class="item-picker-chip" data-cat="Services">Services</span>
            </div>
          </div>

          <div class="modal-body" style="padding: 0; flex: 1; overflow-y: auto;">
            <table class="erp-table" style="margin: 0;">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Product Nomenclature & Specs</th>
                  <th class="text-center">Brand</th>
                  <th class="text-right">Dealer Cost</th>
                  <th class="text-right">Selling Rate</th>
                  <th class="text-center" style="width: 75px;">Qty</th>
                  <th class="text-center" style="width: 110px;">Action</th>
                </tr>
              </thead>
              <tbody id="itemPickerTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>

          <div class="modal-footer" style="justify-content: space-between;">
            <div style="font-size: 12px; color: var(--text-muted);" id="pickerResultCount">
              Showing items
            </div>
            <button type="button" id="closePickerFooterBtn" class="btn btn-secondary">Done / Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const overlay = document.getElementById('itemMasterPickerModalOverlay');
    const searchInput = document.getElementById('itemPickerSearchInput');
    const tableBody = document.getElementById('itemPickerTableBody');
    const resultCountEl = document.getElementById('pickerResultCount');

    function renderFilteredItems() {
      const q = (searchInput?.value || '').toLowerCase().trim();
      const currentItems = store.state.items;

      const filtered = currentItems.filter(item => {
        const matchesCategory = !selectedCategory || (item.category || '').toLowerCase().includes(selectedCategory.toLowerCase());
        const matchesQuery = !q ||
          (item.sku || '').toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.brand || '').toLowerCase().includes(q) ||
          (item.hsn || '').toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      });

      if (resultCountEl) {
        resultCountEl.textContent = `Showing ${filtered.length} of ${currentItems.length} catalog items`;
      }

      if (filtered.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
              <div>No catalog SKU matches "<strong>${q}</strong>"</div>
              <button id="emptyStateCreateItemBtn" class="btn btn-primary btn-sm" style="margin-top: 14px;">
                + Add "${q}" to Master Catalog
              </button>
            </td>
          </tr>
        `;
        document.getElementById('emptyStateCreateItemBtn')?.addEventListener('click', () => {
          openCreateMasterItemModal(q, () => {
            renderFilteredItems();
            if (onAdded) onAdded();
          });
        });
        return;
      }

      tableBody.innerHTML = filtered.map(item => `
        <tr>
          <td>
            <div style="font-weight: 700; color: #38bdf8; font-family: 'JetBrains Mono', monospace; font-size: 12.5px;">
              ${item.sku}
            </div>
            <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">
              HSN: ${item.hsn || '85258090'}
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main); font-size: 13px;">${item.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.category || 'General'}</div>
          </td>
          <td class="text-center" style="font-size: 12px; color: var(--text-dim);">
            ${item.brand || 'CP Plus'}
          </td>
          <td class="text-right" style="font-size: 12.5px; color: var(--text-muted);">
            ₹${Number(item.dealerCost || 0).toLocaleString('en-IN')}
          </td>
          <td class="text-right" style="font-weight: 700; color: #34d399; font-size: 13.5px;">
            ₹${Number(item.retailSelling || 0).toLocaleString('en-IN')}
          </td>
          <td class="text-center">
            <input type="number" class="form-control text-center picker-qty-input" data-sku="${item.sku}" value="1" min="1" style="padding: 4px; font-size: 12px; font-weight: 700;">
          </td>
          <td class="text-center">
            <button class="btn btn-primary btn-sm picker-add-btn" data-sku="${item.sku}" style="padding: 5px 10px; font-size: 11.5px; white-space: nowrap;">
              + Add to BOQ
            </button>
          </td>
        </tr>
      `).join('');

      // Attach add-to-boq buttons
      tableBody.querySelectorAll('.picker-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sku = btn.getAttribute('data-sku');
          const item = store.state.items.find(m => m.sku === sku);
          const qtyInput = tableBody.querySelector(`.picker-qty-input[data-sku="${sku}"]`);
          const qty = Number(qtyInput?.value) || 1;

          if (item) {
            store.addQuotationItem({
              sku: item.sku,
              desc: item.name,
              hsn: item.hsn,
              qty: qty,
              unit: item.unit || 'Nos',
              rate: item.retailSelling
            });

            // Visual feedback on button
            btn.textContent = '✔ Added';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-success');
            setTimeout(() => {
              btn.textContent = '+ Add to BOQ';
              btn.classList.remove('btn-success');
              btn.classList.add('btn-primary');
            }, 1200);

            showToast(`Added ${qty}x ${item.name} to proposal`);
            if (onAdded) onAdded();
          }
        });
      });
    }

    renderFilteredItems();

    // Search input event
    searchInput?.addEventListener('input', renderFilteredItems);

    // Category chips
    overlay.querySelectorAll('.item-picker-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        overlay.querySelectorAll('.item-picker-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedCategory = chip.getAttribute('data-cat') || '';
        renderFilteredItems();
      });
    });

    const close = () => overlay.remove();
    document.getElementById('closeItemPickerBtn')?.addEventListener('click', close);
    document.getElementById('closePickerFooterBtn')?.addEventListener('click', close);

    // "+ Add Item to Master" header button
    document.getElementById('openCreateItemModalBtn')?.addEventListener('click', () => {
      openCreateMasterItemModal(searchInput?.value || '', () => {
        renderFilteredItems();
        if (onAdded) onAdded();
      });
    });
  }

  // ===========================================================================
  // MODAL 3: CREATE NEW ITEM IN ITEM MASTER (ACCESSIBLE FROM ITEM SELECTOR)
  // ===========================================================================
  function openCreateMasterItemModal(prefillName = '', onCreated) {
    const suggestedSku = `SKU-CUS-${Math.floor(100 + Math.random() * 900)}`;

    const modalHtml = `
      <div id="createMasterItemModalOverlay" class="modal-overlay" style="z-index: 10001;">
        <div class="modal-card" style="max-width: 580px;">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">+ Add New Item to Master Catalog</h3>
              <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                Registers SKU permanently into Central Catalog and optionally inserts into current BOQ
              </p>
            </div>
            <button id="closeCreateItemModalBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="createMasterItemForm">
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">SKU Code *</label>
                  <input type="text" id="newSkuCode" class="form-control" value="${suggestedSku}" required style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">
                </div>
                <div class="form-group">
                  <label class="form-label">Brand / Manufacturer</label>
                  <input type="text" id="newSkuBrand" class="form-control" placeholder="CP Plus / Hikvision / WD" value="CP Plus">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Item Nomenclature & Specification *</label>
                <input type="text" id="newSkuName" class="form-control" value="${prefillName}" required placeholder="e.g. 5.0 MP Smart AI ColorVu Bullet Camera">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Product Category</label>
                  <select id="newSkuCategory" class="form-control">
                    <option value="IP Cameras">IP Cameras</option>
                    <option value="Analog HD">Analog HD Cameras</option>
                    <option value="Surveillance Storage">Surveillance Storage</option>
                    <option value="Network & Switches">Network & Switches</option>
                    <option value="Structured Cabling">Structured Cabling</option>
                    <option value="Power & SMPS">Power & SMPS</option>
                    <option value="Equipment Racks">Equipment Racks</option>
                    <option value="Displays & Signage">Displays & Signage</option>
                    <option value="Accessories & Connectors">Accessories & Connectors</option>
                    <option value="Services & Labour">Services & Labour</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">HSN / SAC Code</label>
                  <input type="text" id="newSkuHsn" class="form-control" value="85258090" style="font-family: monospace;">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Unit of Measure</label>
                  <input type="text" id="newSkuUnit" class="form-control" value="Nos">
                </div>
                <div class="form-group">
                  <label class="form-label">Dealer Cost (₹) *</label>
                  <input type="number" id="newSkuCost" class="form-control" value="2200" step="0.01" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Selling Rate (₹) *</label>
                  <input type="number" id="newSkuSelling" class="form-control" value="3400" step="0.01" required>
                </div>
              </div>

              <div style="background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); padding: 12px 16px; margin-top: 10px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 0;">
                  <input type="checkbox" id="autoInsertToBoqCheck" checked style="width: 16px; height: 16px;">
                  <span style="font-size: 13px; font-weight: 600; color: #60a5fa;">
                    Immediately insert this new item into the current Quotation BOQ
                  </span>
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="cancelCreateItemBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save to Master & Apply</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const overlay = document.getElementById('createMasterItemModalOverlay');
    const close = () => overlay.remove();

    document.getElementById('closeCreateItemModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelCreateItemBtn')?.addEventListener('click', close);

    document.getElementById('createMasterItemForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const sku = document.getElementById('newSkuCode').value.trim();
      const name = document.getElementById('newSkuName').value.trim();
      const brand = document.getElementById('newSkuBrand').value.trim();
      const category = document.getElementById('newSkuCategory').value;
      const hsn = document.getElementById('newSkuHsn').value.trim();
      const unit = document.getElementById('newSkuUnit').value.trim();
      const cost = Number(document.getElementById('newSkuCost').value) || 0;
      const selling = Number(document.getElementById('newSkuSelling').value) || 0;
      const insertToBoq = document.getElementById('autoInsertToBoqCheck').checked;

      const newItem = store.addItem({
        sku,
        name,
        brand,
        category,
        hsn,
        unit,
        dealerCost: cost,
        retailSelling: selling,
        gstRate: 0.18,
        minReorder: 5,
        currentStock: 10
      });

      if (insertToBoq) {
        store.addQuotationItem({
          sku: newItem.sku,
          desc: newItem.name,
          hsn: newItem.hsn,
          qty: 1,
          unit: newItem.unit,
          rate: newItem.retailSelling
        });
      }

      showToast(`Registered SKU ${newItem.sku} in Item Master!`);
      close();
      if (onCreated) onCreated(newItem);
    });
  }

  // ===========================================================================
  // MODAL 4: SAVE QUOTATION TO STORAGE MODAL
  // ===========================================================================
  function openSaveQuotationModal(onSaved) {
    const qtn = store.state.quotation;

    const modalHtml = `
      <div id="saveQuotationModalOverlay" class="modal-overlay">
        <div class="modal-card" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">Save Proposal to Quotation Storage</h3>
            <button id="closeSaveQuoteBtn" class="modal-close-btn">&times;</button>
          </div>
          <form id="saveQuotationForm">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Quotation Ref Number</label>
                <input type="text" class="form-control" value="${qtn.refNo}" readonly style="background: var(--bg-card-subtle); font-family: 'JetBrains Mono', monospace; font-weight: 700;">
              </div>
              <div class="form-group">
                <label class="form-label">Client Name</label>
                <input type="text" class="form-control" value="${qtn.clientName || 'General Client'}" readonly style="background: var(--bg-card-subtle);">
              </div>
              <div class="form-group">
                <label class="form-label">Proposal Commercial Status</label>
                <select id="saveQuoteStatus" class="form-control">
                  <option value="Draft">Draft (Internal Review)</option>
                  <option value="Sent to Client" selected>Sent to Client (Awaiting Decision)</option>
                  <option value="Approved / PO Received">Approved / PO Received (Won)</option>
                  <option value="Converted to Project">Converted to Project</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Internal Revision / Archive Notes</label>
                <textarea id="saveQuoteNotes" class="form-control" rows="2" placeholder="e.g. Revision 2 with CP Plus 4MP and 6TB surveillance storage."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="cancelSaveQuoteBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save to Repository</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const overlay = document.getElementById('saveQuotationModalOverlay');
    const close = () => overlay.remove();

    document.getElementById('closeSaveQuoteBtn')?.addEventListener('click', close);
    document.getElementById('cancelSaveQuoteBtn')?.addEventListener('click', close);

    document.getElementById('saveQuotationForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('saveQuoteStatus').value;
      const notes = document.getElementById('saveQuoteNotes').value.trim();

      store.saveCurrentQuotation({ status, notes });
      close();
      if (onSaved) onSaved();
    });
  }

  updateView();
}
