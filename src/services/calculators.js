// CCTV System Engineering & Sizing Algorithms Engine

export const BITRATE_PRESETS = {
  '2.4MP_HD': { name: 'CP Plus 2.4MP @ 15fps Color+Mic', h264: 4.00, h265: 2.20, powerWatts: 5.5 },
  '4MP_STQC': { name: 'CP Plus 4MP @ 20fps STQC Certified', h264: 6.50, h265: 3.40, powerWatts: 6.5 },
  '5MP_SUPER': { name: 'CP Plus 5MP @ 25fps Super HD', h264: 8.00, h265: 4.20, powerWatts: 7.5 },
  '8MP_4K': { name: 'CP Plus 4K UHD @ 25fps Ultra HD', h264: 16.00, h265: 8.00, powerWatts: 9.5 }
};

export function calculateSystemMetrics(zones, options = {}) {
  const {
    codec = 'H.265', // 'H.264' or 'H.265'
    motionDuty = 0.70, // 70% motion recording
    retentionDays = 30, // 30 days
    fsOverhead = 0.10, // 10% RAID/FS buffer
    cableSlack = 0.15, // 15% drop/slack allowance
    rollLength = 90, // 90 meters per standard roll
    nvrBaseWatts = 40.0, // NVR console base power
    upsPf = 0.65, // UPS power factor
    upsHeadroom = 0.25 // 25% safety margin
  } = options;

  // 1. Zone Totals
  const totalCams = zones.reduce((sum, z) => sum + (Number(z.qty) || 0), 0);
  const totalArea = zones.reduce((sum, z) => sum + (Number(z.area) || 0), 0);
  const rawCableMtr = zones.reduce((sum, z) => sum + (Number(z.cableMtr) || 0), 0);
  const domeCount = zones
    .filter(z => (z.camType || '').toLowerCase().includes('dome'))
    .reduce((sum, z) => sum + (Number(z.qty) || 0), 0);
  const bulletCount = zones
    .filter(z => (z.camType || '').toLowerCase().includes('bullet'))
    .reduce((sum, z) => sum + (Number(z.qty) || 0), 0);
  const stqcCount = zones
    .filter(z => (z.res || '').includes('4MP'))
    .reduce((sum, z) => sum + (Number(z.qty) || 0), 0);

  const coverageDensity = totalCams > 0 ? Math.round(totalArea / totalCams) : 0;

  // 2. Bitrates & Streams
  let totalBitrateH264 = 0;
  let totalBitrateH265 = 0;
  let totalCamPowerWatts = 0;

  zones.forEach(z => {
    const qty = Number(z.qty) || 0;
    const resUpper = (z.res || '').toUpperCase();
    let preset = BITRATE_PRESETS['2.4MP_HD'];
    if (resUpper.includes('8MP') || resUpper.includes('4K')) {
      preset = BITRATE_PRESETS['8MP_4K'];
    } else if (resUpper.includes('5MP')) {
      preset = BITRATE_PRESETS['5MP_SUPER'];
    } else if (resUpper.includes('4MP')) {
      preset = BITRATE_PRESETS['4MP_STQC'];
    }
    totalBitrateH264 += preset.h264 * qty;
    totalBitrateH265 += preset.h265 * qty;
    totalCamPowerWatts += preset.powerWatts * qty;
  });

  const activeBitrate = codec === 'H.265' ? totalBitrateH265 : totalBitrateH264;

  // 3. Storage Calculation
  // Daily GB = (Bitrate_Mbps * 3600 * 24 * motionDuty) / (8 * 1024)
  const dailyGb = Number(((activeBitrate * 3600 * 24 * motionDuty) / (8 * 1024)).toFixed(2));
  const rawStorageGb = Number((dailyGb * retentionDays).toFixed(2));
  const usableTbRequired = Number(((rawStorageGb * (1 + fsOverhead)) / 1024).toFixed(2));

  // Hard Drive Recommendation
  let recommendedHdd = 'Surveillance Hard Disk 2TB';
  let recommendedHddSku = 'SKU-HDD-001';
  if (usableTbRequired <= 2) {
    recommendedHdd = 'Surveillance Hard Disk 2TB';
    recommendedHddSku = 'SKU-HDD-001';
  } else if (usableTbRequired <= 4) {
    recommendedHdd = 'Surveillance Hard Disk 4TB';
    recommendedHddSku = 'SKU-HDD-002';
  } else if (usableTbRequired <= 6) {
    recommendedHdd = 'Surveillance Hard Disk 6TB (24/7 Continuous)';
    recommendedHddSku = 'SKU-HDD-004';
  } else if (usableTbRequired <= 8) {
    recommendedHdd = 'Surveillance Hard Disk 8TB (High Density)';
    recommendedHddSku = 'SKU-HDD-005';
  } else {
    recommendedHdd = 'Surveillance Hard Disk 10TB / Dual 6TB Enterprise Array';
    recommendedHddSku = 'SKU-HDD-004';
  }

  // Remote Substream Bandwidth & Dedicated Upload
  const substreamMbps = Number((totalCams * 0.35).toFixed(2));
  const recommendedUploadMbps = Math.ceil(substreamMbps * 1.5);

  // 4. Cabling & Cable Rolls
  const grossCableMtr = Math.round(rawCableMtr * (1 + cableSlack));
  const cableRolls = Math.ceil(grossCableMtr / rollLength);

  // 5. Power Supply & PoE Switch
  let recommendedSmps = 'Central Power Supply Unit (12V 5A SMPS)';
  if (totalCamPowerWatts > 100) {
    recommendedSmps = 'Central Power Supply Unit (16-Ch 12V 20A SMPS)';
  } else if (totalCamPowerWatts > 50) {
    recommendedSmps = 'Central Power Supply Unit (Heavy Duty 12V 10A SMPS)';
  }

  let recommendedPoe = 'PoE Switch (4+2 Ports Fast Ethernet)';
  if (totalCams <= 4) {
    recommendedPoe = 'PoE Switch (4+2 Ports Fast Ethernet)';
  } else if (totalCams <= 8) {
    recommendedPoe = 'PoE Switch (8+2 Ports Gigabit Uplink)';
  } else {
    recommendedPoe = '16-Port Gigabit PoE+ Switch (250W)';
  }

  // 6. UPS Sizing
  const totalSystemWatts = Number((totalCamPowerWatts + nvrBaseWatts).toFixed(1));
  const calculatedUpsVa = Math.ceil((totalSystemWatts / upsPf) * (1 + upsHeadroom));

  let recommendedUps = '600VA / 360W Line-Interactive UPS';
  if (calculatedUpsVa <= 600) {
    recommendedUps = '600VA / 360W Line-Interactive UPS';
  } else if (calculatedUpsVa <= 800) {
    recommendedUps = '800VA / 480W Line-Interactive UPS';
  } else if (calculatedUpsVa <= 1200) {
    recommendedUps = '1100VA / 660W Line-Interactive UPS';
  } else {
    recommendedUps = '2000VA / 1600W Online Pure Sine Wave UPS';
  }

  // 7. Recorder Channel Allocation
  let recorderChannels = 4;
  let recommendedRecorder = '4 CH 4K NVR / HD DVR';
  if (totalCams <= 4) {
    recorderChannels = 4;
    recommendedRecorder = '4 CH 4K NVR / HD DVR Console';
  } else if (totalCams <= 8) {
    recorderChannels = 8;
    recommendedRecorder = '8 CH 4K NVR / HD DVR Console';
  } else if (totalCams <= 16) {
    recorderChannels = 16;
    recommendedRecorder = '16 CH DVR 2.4MP / 16-Channel 4K NVR Console';
  } else {
    recorderChannels = 32;
    recommendedRecorder = '32-Channel 4K Ultra HD Enterprise NVR';
  }

  return {
    totalCams,
    totalArea,
    coverageDensity,
    domeCount,
    bulletCount,
    stqcCount,
    totalBitrateH264: Number(totalBitrateH264.toFixed(1)),
    totalBitrateH265: Number(totalBitrateH265.toFixed(1)),
    activeBitrate: Number(activeBitrate.toFixed(1)),
    dailyGb,
    rawStorageGb,
    usableTbRequired,
    recommendedHdd,
    recommendedHddSku,
    substreamMbps,
    recommendedUploadMbps,
    rawCableMtr,
    grossCableMtr,
    cableRolls,
    totalCamPowerWatts: Number(totalCamPowerWatts.toFixed(1)),
    totalSystemWatts,
    calculatedUpsVa,
    recommendedSmps,
    recommendedPoe,
    recommendedUps,
    recorderChannels,
    recommendedRecorder
  };
}

/**
 * Commercial & Accounting Calculation Engine
 * Handles optional & editable GST rates (intra/inter-state), discounts (percentage/flat),
 * installation, freight, round-off, and payment advance terms.
 */
export function calculateQuotationTotals(quote = {}, options = {}) {
  const items = quote.items || [];

  // 1. Gross Items Subtotal & Item-Level Discounts
  let grossSubtotal = 0;
  let totalItemDiscount = 0;

  const computedItems = items.map((item, idx) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const lineGross = Math.round(qty * rate * 100) / 100;
    const itemDiscPct = Math.max(0, Math.min(100, Number(item.discountPct) || 0));
    const itemDiscAmount = itemDiscPct > 0 ? Math.round((lineGross * (itemDiscPct / 100)) * 100) / 100 : 0;
    const lineNet = Math.round((lineGross - itemDiscAmount) * 100) / 100;

    grossSubtotal += lineGross;
    totalItemDiscount += itemDiscAmount;

    return {
      ...item,
      sl: item.sl || (idx + 1),
      qty,
      rate,
      lineGross,
      itemDiscountPct: itemDiscPct,
      itemDiscountAmount: itemDiscAmount,
      lineNet
    };
  });

  grossSubtotal = Math.round(grossSubtotal * 100) / 100;
  totalItemDiscount = Math.round(totalItemDiscount * 100) / 100;
  const netItemsSubtotal = Math.round((grossSubtotal - totalItemDiscount) * 100) / 100;

  // 2. Overall Quotation Discount (Optional & Editable)
  const discountType = quote.discountType === 'flat' ? 'flat' : 'percent';
  const discountValue = Math.max(0, Number(quote.discountValue) || 0);
  let overallDiscount = 0;

  if (discountValue > 0) {
    if (discountType === 'percent') {
      const effectivePct = Math.min(100, discountValue);
      overallDiscount = Math.round((netItemsSubtotal * (effectivePct / 100)) * 100) / 100;
    } else {
      overallDiscount = Math.min(netItemsSubtotal, Math.round(discountValue * 100) / 100);
    }
  }

  const totalDiscount = Math.round((totalItemDiscount + overallDiscount) * 100) / 100;
  const taxableGoodsSubtotal = Math.max(0, Math.round((netItemsSubtotal - overallDiscount) * 100) / 100);

  // 3. Other Accounting Variables: Shipping, Installation, Misc Charges
  const shippingCharges = Math.max(0, Number(quote.shippingCharges) || 0);
  const installationCharges = Math.max(0, Number(quote.installationCharges) || 0);
  const packagingCharges = Math.max(0, Number(quote.packagingCharges) || 0);
  const extraCharges = Math.round((shippingCharges + installationCharges + packagingCharges) * 100) / 100;

  // Taxable subtotal (goods after discount + extra commercial charges)
  const taxableSubtotal = Math.round((taxableGoodsSubtotal + extraCharges) * 100) / 100;

  // 4. GST Variables (Optional & Editable)
  // GST is enabled by default unless explicitly set to false or 'false'
  const gstEnabled = quote.gstEnabled !== false && quote.gstEnabled !== 'false';
  
  // Rate: default 18%, or 0 if gst is disabled, or explicit quote.gstRate
  let gstRate = 18;
  if (!gstEnabled) {
    gstRate = 0;
  } else if (quote.gstRate !== undefined && quote.gstRate !== null && quote.gstRate !== '') {
    gstRate = Math.max(0, Number(quote.gstRate) || 0);
  }

  // Inter-state supply check (IGST vs CGST+SGST)
  // True if explicitly marked isInterstate, or placeOfSupply does not contain Haryana
  const isInterstate = Boolean(
    quote.isInterstate === true ||
    quote.isInterstate === 'true' ||
    (quote.taxType === 'inter') ||
    (quote.placeOfSupply && !quote.placeOfSupply.toLowerCase().includes('haryana'))
  );

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstEnabled && gstRate > 0) {
    if (isInterstate) {
      igst = Math.round(taxableSubtotal * (gstRate / 100) * 100) / 100;
    } else {
      const halfRate = gstRate / 2;
      cgst = Math.round(taxableSubtotal * (halfRate / 100) * 100) / 100;
      sgst = Math.round(taxableSubtotal * (halfRate / 100) * 100) / 100;
    }
  }

  const totalGst = Math.round((cgst + sgst + igst) * 100) / 100;

  // 5. Round-Off (Optional & Editable)
  const unroundedTotal = Math.round((taxableSubtotal + totalGst) * 100) / 100;
  const roundOffEnabled = quote.roundOffEnabled !== false && quote.roundOffEnabled !== 'false';

  let grandTotal = unroundedTotal;
  let roundOff = 0;

  if (roundOffEnabled) {
    grandTotal = Math.round(unroundedTotal);
    roundOff = Math.round((grandTotal - unroundedTotal) * 100) / 100;
  }

  // 6. Payment Terms (Advance & Balance Breakdown)
  const advancePct = Math.max(0, Math.min(100, Number(quote.advancePct) || 50));
  const advanceAmount = Math.round(grandTotal * (advancePct / 100));
  const balanceAmount = grandTotal - advanceAmount;

  return {
    grossSubtotal,
    totalItemDiscount,
    netItemsSubtotal,
    discountType,
    discountValue,
    overallDiscount,
    totalDiscount,
    taxableGoodsSubtotal,
    shippingCharges,
    installationCharges,
    packagingCharges,
    extraCharges,
    taxableSubtotal,
    gstEnabled,
    gstRate,
    isInterstate,
    cgst,
    sgst,
    igst,
    totalGst,
    roundOffEnabled,
    roundOff,
    unroundedTotal,
    grandTotal,
    advancePct,
    advanceAmount,
    balanceAmount,
    computedItems
  };
}

/**
 * Generates dynamic commercial terms & statutory conditions reflecting active accounting variables
 * @param {Object} totals - Output of calculateQuotationTotals
 * @returns {string[]} Array of condition clauses
 */
export function generateAutoSyncedTerms(totals = {}) {
  const advancePct = totals.advancePct !== undefined ? totals.advancePct : 50;
  const advanceAmount = totals.advanceAmount !== undefined ? totals.advanceAmount : 0;
  const balanceAmount = totals.balanceAmount !== undefined ? totals.balanceAmount : 0;
  const gstEnabled = totals.gstEnabled !== false;
  const gstRate = totals.gstRate !== undefined ? totals.gstRate : 18;
  const isInterstate = Boolean(totals.isInterstate);

  const paymentClause = `Payment: ${advancePct}% advance along with confirmed work order (₹${advanceAmount.toLocaleString('en-IN')}), balance ${100 - advancePct}% (₹${balanceAmount.toLocaleString('en-IN')}) upon installation sign-off.`;

  const taxesClause = gstEnabled && gstRate > 0
    ? (isInterstate
        ? `Taxes: Goods & Services Tax (GST) charged @ ${gstRate}% (IGST) as statutory inter-state supply.`
        : `Taxes: Goods & Services Tax (GST) charged @ ${gstRate}% (${(gstRate / 2).toFixed(1)}% CGST + ${(gstRate / 2).toFixed(1)}% SGST) as statutory intra-state supply.`)
    : `Taxes: Commercial supply exempt from GST under non-taxable / composite turnover schedule.`;

  return [
    paymentClause,
    taxesClause,
    'Warranty: Comprehensive 2-Year On-Site Manufacturer Warranty on CP Plus Cams, DVR/NVR & WD Hard Disks.',
    'Delivery: Complete hardware mobilization within 3-5 business days upon order confirmation.',
    'Jurisdiction: All disputes subject to Panipat, Haryana jurisdiction only.'
  ];
}

/**
 * Resolves effective commercial terms with priority:
 * 1. Explicit quote-level terms (if non-empty array)
 * 2. Company default statutory terms from settings (if non-empty array)
 * 3. Auto-synced statutory terms calculated from accounting variables
 * @param {Object} quote
 * @param {Object} totals
 * @param {string[]} [defaultStatutoryTerms]
 * @returns {string[]}
 */
export function getEffectiveQuotationTerms(quote = {}, totals = {}, defaultStatutoryTerms = null) {
  if (Array.isArray(quote?.terms) && quote.terms.length > 0) {
    return [...quote.terms];
  }
  if (Array.isArray(defaultStatutoryTerms) && defaultStatutoryTerms.length > 0) {
    return [...defaultStatutoryTerms];
  }
  return generateAutoSyncedTerms(totals);
}

