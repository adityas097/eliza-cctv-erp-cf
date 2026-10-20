// Vitest Test Suite for Optional & Editable GST, Discounts, and Accounting Variables
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateQuotationTotals, generateAutoSyncedTerms, getEffectiveQuotationTerms } from '../src/services/calculators.js';
import { store } from '../src/services/store.js';
import { db } from '../src/store/db.js';


describe('Accounting & Commercial Variables Engine', () => {
  beforeEach(() => {
    db.resetFactory();
  });

  describe('1. Optional & Editable GST Calculation', () => {
    const baseItems = [
      { sl: 1, sku: 'SKU-CAM-001', name: '4MP IP Bullet Camera', qty: 10, rate: 2500 }, // 25,000
      { sl: 2, sku: 'SKU-REC-001', name: '16 CH NVR 4K', qty: 1, rate: 15000 }         // 15,000
    ]; // Gross: 40,000

    it('should calculate standard 18% intra-state GST (9% CGST + 9% SGST) by default', () => {
      const quote = {
        items: baseItems,
        placeOfSupply: 'Haryana (06) - Intra-State GST Supply',
        gstEnabled: true,
        gstRate: 18,
        isInterstate: false
      };

      const result = calculateQuotationTotals(quote);
      expect(result.grossSubtotal).toBe(40000);
      expect(result.taxableSubtotal).toBe(40000);
      expect(result.gstEnabled).toBe(true);
      expect(result.gstRate).toBe(18);
      expect(result.isInterstate).toBe(false);
      expect(result.cgst).toBe(3600); // 9% of 40,000
      expect(result.sgst).toBe(3600); // 9% of 40,000
      expect(result.igst).toBe(0);
      expect(result.totalGst).toBe(7200);
      expect(result.grandTotal).toBe(47200);
    });

    it('should support making GST optional (disabling GST completely for tax-exempt/composite quotes)', () => {
      const nonGstQuote = {
        items: baseItems,
        gstEnabled: false,
        placeOfSupply: 'Haryana (06) - Intra-State GST Supply'
      };

      const result = calculateQuotationTotals(nonGstQuote);
      expect(result.grossSubtotal).toBe(40000);
      expect(result.taxableSubtotal).toBe(40000);
      expect(result.gstEnabled).toBe(false);
      expect(result.gstRate).toBe(0);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(0);
      expect(result.totalGst).toBe(0);
      expect(result.grandTotal).toBe(40000); // Grand total equals taxable subtotal
    });

    it('should support editable GST rate (e.g. 28% for commercial displays or 12% for IT hardware)', () => {
      const displayQuote = {
        items: [{ sl: 1, sku: 'SKU-DIS-001', name: 'Commercial Display Monitor 55"', qty: 2, rate: 50000 }], // 100,000
        gstEnabled: true,
        gstRate: 28,
        isInterstate: false
      };

      const result = calculateQuotationTotals(displayQuote);
      expect(result.taxableSubtotal).toBe(100000);
      expect(result.gstRate).toBe(28);
      expect(result.cgst).toBe(14000); // 14%
      expect(result.sgst).toBe(14000); // 14%
      expect(result.totalGst).toBe(28000);
      expect(result.grandTotal).toBe(128000);
    });

    it('should support inter-state supply charging full GST as IGST without CGST/SGST split', () => {
      const interQuote = {
        items: baseItems, // 40,000
        gstEnabled: true,
        gstRate: 18,
        isInterstate: true,
        placeOfSupply: 'Delhi (07) - Inter-State Supply'
      };

      const result = calculateQuotationTotals(interQuote);
      expect(result.isInterstate).toBe(true);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(7200); // 18% of 40,000
      expect(result.totalGst).toBe(7200);
      expect(result.grandTotal).toBe(47200);
    });
  });

  describe('2. Optional & Editable Discounts', () => {
    const items = [
      { sl: 1, sku: 'SKU-CAM-001', name: 'Bullet Camera', qty: 20, rate: 2000 } // Gross: 40,000
    ];

    it('should apply percentage discount before tax and reduce taxable base', () => {
      const quote = {
        items,
        gstEnabled: true,
        gstRate: 18,
        discountType: 'percent',
        discountValue: 10 // 10% discount = 4,000
      };

      const result = calculateQuotationTotals(quote);
      expect(result.grossSubtotal).toBe(40000);
      expect(result.overallDiscount).toBe(4000);
      expect(result.taxableGoodsSubtotal).toBe(36000);
      expect(result.taxableSubtotal).toBe(36000);
      expect(result.cgst).toBe(3240); // 9% of 36,000
      expect(result.sgst).toBe(3240); // 9% of 36,000
      expect(result.totalGst).toBe(6480);
      expect(result.grandTotal).toBe(42480);
    });

    it('should apply flat lump-sum discount (₹) before tax', () => {
      const quote = {
        items,
        gstEnabled: true,
        gstRate: 18,
        discountType: 'flat',
        discountValue: 5000 // ₹5,000 flat discount
      };

      const result = calculateQuotationTotals(quote);
      expect(result.grossSubtotal).toBe(40000);
      expect(result.overallDiscount).toBe(5000);
      expect(result.taxableSubtotal).toBe(35000);
      expect(result.cgst).toBe(3150); // 9% of 35,000
      expect(result.sgst).toBe(3150); // 9% of 35,000
      expect(result.totalGst).toBe(6300);
      expect(result.grandTotal).toBe(41300);
    });

    it('should handle item-level discount percentage when specified', () => {
      const quoteWithItemDisc = {
        items: [
          { sl: 1, sku: 'SKU-01', name: 'Camera', qty: 10, rate: 2000, discountPct: 10 }, // 20,000 - 2,000 = 18,000
          { sl: 2, sku: 'SKU-02', name: 'DVR', qty: 1, rate: 10000, discountPct: 0 }        // 10,000
        ],
        gstEnabled: true,
        gstRate: 18,
        discountType: 'percent',
        discountValue: 0
      };

      const result = calculateQuotationTotals(quoteWithItemDisc);
      expect(result.grossSubtotal).toBe(30000);
      expect(result.totalItemDiscount).toBe(2000);
      expect(result.netItemsSubtotal).toBe(28000);
      expect(result.taxableSubtotal).toBe(28000);
      expect(result.totalGst).toBe(5040); // 18% of 28,000
      expect(result.grandTotal).toBe(33040);
    });
  });

  describe('3. Additional Accounting Variables: Freight, Installation, Round-Off & Advance', () => {
    it('should include freight and installation in taxable subtotal and compute round-off', () => {
      const quote = {
        items: [{ sl: 1, sku: 'SKU-01', name: 'Setup', qty: 1, rate: 10000.35 }],
        shippingCharges: 1250,
        installationCharges: 3500,
        packagingCharges: 250,
        gstEnabled: true,
        gstRate: 18,
        roundOffEnabled: true,
        advancePct: 50
      };

      const result = calculateQuotationTotals(quote);
      expect(result.shippingCharges).toBe(1250);
      expect(result.installationCharges).toBe(3500);
      expect(result.packagingCharges).toBe(250);
      expect(result.extraCharges).toBe(5000);
      // Taxable = 10000.35 + 5000 = 15000.35
      expect(result.taxableSubtotal).toBe(15000.35);
      // GST 18% = 2700.06
      expect(result.totalGst).toBe(2700.06);
      // Unrounded total = 17700.41
      expect(result.unroundedTotal).toBe(17700.41);
      // Grand total rounded to nearest rupee = 17700
      expect(result.grandTotal).toBe(17700);
      expect(result.roundOff).toBe(-0.41);
      // Advance: 50% of 17700 = 8850
      expect(result.advanceAmount).toBe(8850);
      expect(result.balanceAmount).toBe(8850);
    });

    it('should preserve exact decimals when round-off is disabled', () => {
      const quote = {
        items: [{ sl: 1, sku: 'SKU-01', name: 'Item', qty: 1, rate: 1000.50 }],
        gstEnabled: true,
        gstRate: 18,
        roundOffEnabled: false
      };

      const result = calculateQuotationTotals(quote);
      expect(result.roundOffEnabled).toBe(false);
      expect(result.roundOff).toBe(0);
      expect(result.grandTotal).toBe(1180.6);
    });
  });

  describe('4. Store & Persistence Integration', () => {
    it('should update quotation accounting variables in active draft and emit update', () => {
      store.newQuotation();
      store.addQuotationItem({ sku: 'TEST-SKU', desc: 'Test Camera', qty: 5, rate: 2000, hsn: '85258090', unit: 'Nos' });

      store.updateQuotationAccounting({
        gstEnabled: false,
        discountType: 'percent',
        discountValue: 5,
        shippingCharges: 500,
        installationCharges: 1000
      });

      expect(store.state.quotation.gstEnabled).toBe(false);
      expect(store.state.quotation.discountValue).toBe(5);
      expect(store.state.quotation.shippingCharges).toBe(500);
      expect(store.state.quotation.installationCharges).toBe(1000);
    });

    it('should preserve all accounting variables when saving and re-loading from storage archive', () => {
      store.newQuotation();
      store.updateQuotation({ clientName: 'Delhi Commercial Mall', placeOfSupply: 'Delhi (07) - Inter-State Supply' });
      store.addQuotationItem({ sku: 'TEST-REC', desc: '4K NVR', qty: 2, rate: 12000, hsn: '85219090', unit: 'Nos' });

      store.updateQuotationAccounting({
        gstEnabled: true,
        gstRate: 28,
        isInterstate: true,
        discountType: 'flat',
        discountValue: 2000,
        shippingCharges: 800,
        installationCharges: 2500,
        advancePct: 60
      });

      const saved = store.saveCurrentQuotation({ status: 'Sent to Client', notes: 'Includes 28% IGST and flat discount' });
      expect(saved.id).toBeDefined();
      expect(saved.gstRate).toBe(28);
      expect(saved.isInterstate).toBe(true);
      expect(saved.discountValue).toBe(2000);
      expect(saved.advancePct).toBe(60);

      // Clear draft then reload
      store.newQuotation();
      expect(store.state.quotation.clientName).toBe('');

      const loaded = store.loadQuotation(saved.id);
      expect(loaded).toBeDefined();
      expect(loaded.clientName).toBe('Delhi Commercial Mall');
      expect(loaded.gstRate).toBe(28);
      expect(loaded.isInterstate).toBe(true);
      expect(loaded.discountValue).toBe(2000);
      expect(loaded.shippingCharges).toBe(800);
      expect(loaded.installationCharges).toBe(2500);
      expect(loaded.advancePct).toBe(60);
    });

    it('should allow configuring accounting defaults in Settings and inherit on new quotes', () => {
      db.state.settings.accounting = {
        gstEnabled: false,
        defaultGstRate: 12,
        defaultTaxType: 'inter',
        defaultDiscountPct: 7.5,
        defaultShippingCharge: 350,
        enableRoundOff: true,
        defaultAdvancePct: 40
      };

      const freshQuote = store.newQuotation();
      expect(freshQuote.gstEnabled).toBe(false);
      expect(freshQuote.gstRate).toBe(12);
      expect(freshQuote.isInterstate).toBe(true);
      expect(freshQuote.discountValue).toBe(7.5);
      expect(freshQuote.shippingCharges).toBe(350);
      expect(freshQuote.advancePct).toBe(40);
    });

    it('should save and update custom GST rate in Item Master SKU', () => {
      const skuData = {
        sku: 'SKU-CUSTOM-TAX',
        category: 'IP Cameras',
        name: 'STQC 4K Camera',
        brand: 'CP Plus',
        hsn: '85258090',
        dealerCost: 5000,
        retailSelling: 8000,
        unit: 'Nos',
        gstRate: 0.28,
        minReorder: 5,
        notes: '28% GST rate test'
      };

      store.addItem(skuData);
      const retrieved = store.state.items.find(i => i.sku === 'SKU-CUSTOM-TAX');
      expect(retrieved).toBeDefined();
      expect(retrieved.gstRate).toBe(0.28);
    });
  });

  describe('6. Commercial Terms & Statutory Conditions Editing', () => {
    it('should generate auto-synced statutory terms reflecting advance % and intra-state GST', () => {
      const totals = {
        advancePct: 40,
        advanceAmount: 40000,
        balanceAmount: 60000,
        gstEnabled: true,
        gstRate: 18,
        isInterstate: false
      };

      const terms = generateAutoSyncedTerms(totals);
      expect(terms).toHaveLength(5);
      expect(terms[0]).toContain('Payment: 40% advance');
      expect(terms[0]).toContain('₹40,000');
      expect(terms[0]).toContain('balance 60%');
      expect(terms[0]).toContain('₹60,000');
      expect(terms[1]).toContain('18% (9.0% CGST + 9.0% SGST)');
      expect(terms[4]).toContain('Panipat, Haryana');
    });

    it('should generate auto-synced terms reflecting tax-exempt / 0% GST condition', () => {
      const totals = {
        advancePct: 30,
        advanceAmount: 30000,
        balanceAmount: 70000,
        gstEnabled: false,
        gstRate: 0,
        isInterstate: false
      };

      const terms = generateAutoSyncedTerms(totals);
      expect(terms[0]).toContain('30% advance');
      expect(terms[1]).toContain('Commercial supply exempt from GST');
    });

    it('should generate inter-state IGST clause when isInterstate is true', () => {
      const totals = {
        advancePct: 50,
        advanceAmount: 50000,
        balanceAmount: 50000,
        gstEnabled: true,
        gstRate: 28,
        isInterstate: true
      };

      const terms = generateAutoSyncedTerms(totals);
      expect(terms[1]).toContain('28% (IGST) as statutory inter-state supply');
    });

    it('should resolve effective terms prioritizing explicit quote terms, then company defaults, then auto-synced', () => {
      const customTerms = ['Custom Clause 1: 100% upfront', 'Custom Clause 2: 5 years warranty'];
      const defaultTerms = ['Company Default 1', 'Company Default 2'];
      const totals = { advancePct: 50, advanceAmount: 5000, balanceAmount: 5000, gstEnabled: true, gstRate: 18 };

      // 1. Explicit quote terms present
      const quoteWithTerms = { terms: customTerms };
      expect(getEffectiveQuotationTerms(quoteWithTerms, totals, defaultTerms)).toEqual(customTerms);

      // 2. Empty quote terms, falls back to default terms
      const quoteWithoutTerms = { terms: [] };
      expect(getEffectiveQuotationTerms(quoteWithoutTerms, totals, defaultTerms)).toEqual(defaultTerms);

      // 3. Neither present, falls back to auto-synced
      expect(getEffectiveQuotationTerms(quoteWithoutTerms, totals, null)[0]).toContain('Payment: 50% advance');
    });

    it('should allow in-place editing of quotation terms and persist across save/load', () => {
      const q = store.newQuotation();
      expect(q.terms).toBeDefined();
      expect(Array.isArray(q.terms)).toBe(true);

      const modifiedTerms = [
        'Milestone 1: 60% mobilization advance upon PO.',
        'Milestone 2: 40% post successful CCTV demo and testing sign-off.',
        'Extended SLA: 3-Year comprehensive 24x7 support with 4-hour MTTR.',
        'Arbitration: New Delhi Chamber of Commerce.'
      ];

      // Update terms directly on quotation
      store.updateQuotationTerms(modifiedTerms);
      expect(store.state.quotation.terms).toEqual(modifiedTerms);

      // Save to archive
      const saved = store.saveCurrentQuotation({ status: 'Draft' });
      expect(saved.terms).toEqual(modifiedTerms);

      // Clear active quote and reload from archive
      store.newQuotation();
      expect(store.state.quotation.terms).not.toEqual(modifiedTerms);

      const reloaded = store.loadQuotation(saved.id);
      expect(reloaded.terms).toEqual(modifiedTerms);
    });

    it('should update saved quotation terms directly via updateSavedQuotation', () => {
      const quote = store.saveCurrentQuotation({ status: 'Sent' });
      const updatedTerms = ['Clause A: Updated term on proposal preview', 'Clause B: Updated warranty'];

      store.updateSavedQuotation(quote.id, { terms: updatedTerms });
      const found = store.state.quotations.find(q => q.id === quote.id);
      expect(found.terms).toEqual(updatedTerms);
    });
  });
});

