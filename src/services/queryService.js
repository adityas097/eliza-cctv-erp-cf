// Centralized Query, Filtering & Memoized Aggregation Service
// Ensures consistent date-range queries across all modules, ledgers, charts, and exports.

import { db } from '../store/db.js';
import { inRange, buckets, formatDisplayDate, daysInPeriod, parseISODateParts } from './periodService.js';
import { ENTITY_DATE_FIELDS, getRecordDate } from '../config/dateFields.js';

let dataVersion = 1;

// Invalidate memoization cache whenever underlying data mutates
if (typeof db.subscribe === 'function') {
  db.subscribe('change', () => {
    dataVersion++;
  });
  db.subscribe('companies', () => { dataVersion++; });
  db.subscribe('reset', () => { dataVersion++; });
}

export function getDataVersion() {
  return dataVersion;
}

export function invalidateQueryCache() {
  dataVersion++;
}

// Internal LRU-style cache
const queryCache = new Map();

function getCacheKey(selectorName, period, extra = '') {
  const from = period ? period.from : 'all';
  const to = period ? period.to : 'all';
  const cmp = period ? (period.compare || 'none') : 'none';
  return `${selectorName}_${from}_${to}_${cmp}_${dataVersion}_${extra}`;
}

/**
 * Filter an array of records by date period using the specified field or default entity field.
 */
export function filterByPeriod(records, dateField = null, period = null, entityType = null) {
  if (!Array.isArray(records)) return [];
  if (!period || period.preset === 'all_time' || (period.from === '1970-01-01' && period.to >= '2099-01-01')) {
    return records;
  }

  const effectiveField = dateField || (entityType && ENTITY_DATE_FIELDS[entityType] ? ENTITY_DATE_FIELDS[entityType].defaultField : 'createdAt');

  return records.filter(record => {
    const rawDate = getRecordDate(record, effectiveField, entityType);
    if (!rawDate) return false;
    return inRange(rawDate, period);
  });
}

/**
 * Categorizes records into: inPeriod, outsidePeriod, noDate
 */
export function partitionByPeriod(records, dateField = null, period = null, entityType = null) {
  if (!Array.isArray(records)) return { inPeriod: [], outsidePeriod: [], noDate: [] };
  if (!period || period.preset === 'all_time' || (period.from === '1970-01-01' && period.to >= '2099-01-01')) {
    return { inPeriod: [...records], outsidePeriod: [], noDate: [] };
  }

  const effectiveField = dateField || (entityType && ENTITY_DATE_FIELDS[entityType] ? ENTITY_DATE_FIELDS[entityType].defaultField : 'createdAt');

  const inPeriod = [];
  const outsidePeriod = [];
  const noDate = [];

  records.forEach(rec => {
    const rawDate = getRecordDate(rec, effectiveField, entityType);
    if (!rawDate) {
      noDate.push(rec);
    } else if (inRange(rawDate, period)) {
      inPeriod.push(rec);
    } else {
      outsidePeriod.push(rec);
    }
  });

  return { inPeriod, outsidePeriod, noDate };
}

/**
 * Filters records for snapshot "as-of" metrics (recordDate <= period.to)
 */
export function filterAsOf(records, dateField = null, toDate = null, entityType = null) {
  if (!Array.isArray(records)) return [];
  if (!toDate || toDate >= '2099-01-01') return records;

  const effectiveField = dateField || (entityType && ENTITY_DATE_FIELDS[entityType] ? ENTITY_DATE_FIELDS[entityType].defaultField : 'date');

  return records.filter(record => {
    const rawDate = getRecordDate(record, effectiveField, entityType);
    if (!rawDate) return true; // Keep baseline if undated
    const cleanDate = String(rawDate).slice(0, 10);
    return cleanDate <= toDate;
  });
}

/**
 * Helper to compute Delta and Percentage between current and comparison values.
 */
export function calculateDelta(currentVal, compareVal, invert = false) {
  const cur = Number(currentVal) || 0;
  const cmp = Number(compareVal) || 0;
  const diff = cur - cmp;

  let pct = 0;
  if (cmp !== 0) {
    pct = (diff / Math.abs(cmp)) * 100;
  } else if (cur > 0) {
    pct = 100;
  } else if (cur < 0) {
    pct = -100;
  }

  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  // For positive delta: normally green, but if invert=true (e.g. costs, SLA breaches), it's red
  let colorClass = 'delta-neutral';
  let arrow = '—';
  if (!isNeutral) {
    if (isPositive) {
      arrow = '▲';
      colorClass = invert ? 'delta-danger' : 'delta-positive';
    } else {
      arrow = '▼';
      colorClass = invert ? 'delta-positive' : 'delta-danger';
    }
  }

  const formattedDiff = Math.abs(diff) >= 1000 ? Math.round(diff).toLocaleString('en-IN') : diff.toFixed(1);
  const formattedPct = Math.abs(pct).toFixed(1);

  return {
    diff,
    pct,
    arrow,
    isPositive,
    isNeutral,
    colorClass,
    text: isNeutral ? '0.0%' : `${arrow} ${diff > 0 ? '+' : ''}${formattedPct}% (${formattedDiff})`
  };
}

/**
 * Builds zero-filled time series buckets for charts
 */
export function buildTimeSeries(records, dateField, period, valueExtractor = null) {
  const timeBuckets = buckets(period);
  const labels = timeBuckets.map(b => b.label);
  const values = new Array(timeBuckets.length).fill(0);

  records.forEach(rec => {
    const rawDate = getRecordDate(rec, dateField);
    if (!rawDate) return;
    const dateStr = String(rawDate).slice(0, 10);

    // Find bucket
    const bucketIdx = timeBuckets.findIndex(b => dateStr >= b.from && dateStr <= b.to);
    if (bucketIdx !== -1) {
      const val = valueExtractor ? Number(valueExtractor(rec)) || 0 : 1;
      values[bucketIdx] += val;
    }
  });

  return {
    labels,
    buckets: timeBuckets,
    values
  };
}

// --------------------------------------------------------------------------
// Memoized Selectors for Aggregates
// --------------------------------------------------------------------------
export const selectors = {
  /**
   * Revenue Booked & Gross Profit
   */
  projectFinancials(period) {
    const key = getCacheKey('projectFinancials', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allProjects = (db.state.projects || []).filter(p => (p.companyId || 'comp-eliza') === compId);
    const inPeriodProjects = filterByPeriod(allProjects, 'orderDate', period, 'projects');

    let revenueBooked = 0;
    let hwCost = 0;
    let labCost = 0;
    let consCost = 0;

    inPeriodProjects.forEach(p => {
      revenueBooked += Number(p.quoted) || 0;
      hwCost += Number(p.hardwareCost) || 0;
      labCost += Number(p.labourCost) || 0;
      consCost += Number(p.consumablesCost) || 0;
    });

    const totalCost = hwCost + labCost + consCost;
    const grossProfit = revenueBooked - totalCost;
    const marginPct = revenueBooked > 0 ? (grossProfit / revenueBooked) * 100 : 0;

    const result = {
      projects: inPeriodProjects,
      projectCount: inPeriodProjects.length,
      revenueBooked,
      hwCost,
      labCost,
      consCost,
      totalCost,
      grossProfit,
      marginPct
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * Active Sales Pipeline & Leads Breakdown
   */
  pipelineByStage(period) {
    const key = getCacheKey('pipelineByStage', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allLeads = (db.state.leads || []).filter(l => (l.companyId || 'comp-eliza') === compId);
    const inPeriodLeads = filterByPeriod(allLeads, 'createdAt', period, 'leads');

    const stages = [
      'New Inquiry',
      'Site Survey Scheduled',
      'Quote Prepared',
      'Under Negotiation',
      'Won - Order Booked',
      'Lost - Dropped'
    ];

    const countsByStage = {};
    const valueByStage = {};
    stages.forEach(st => {
      countsByStage[st] = 0;
      valueByStage[st] = 0;
    });

    let totalQuoted = 0;
    let totalWeighted = 0;

    inPeriodLeads.forEach(lead => {
      const qVal = Number(lead.quotedValue) || 0;
      const wProb = Number(lead.winProb) || 0;
      totalQuoted += qVal;
      totalWeighted += (qVal * wProb);

      if (countsByStage[lead.stage] !== undefined) {
        countsByStage[lead.stage]++;
        valueByStage[lead.stage] += qVal;
      }
    });

    const wonCount = countsByStage['Won - Order Booked'] || 0;
    const lostCount = countsByStage['Lost - Dropped'] || 0;
    const closedCount = wonCount + lostCount;
    const conversionPct = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;

    const result = {
      leads: inPeriodLeads,
      totalLeads: inPeriodLeads.length,
      stages,
      countsByStage,
      valueByStage,
      totalQuoted,
      totalWeighted,
      conversionPct
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * Field Operations Jobs Analysis
   */
  jobsMetrics(period) {
    const key = getCacheKey('jobsMetrics', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allJobs = (db.state.jobs || []).filter(j => (j.companyId || 'comp-eliza') === compId);
    const inPeriodJobs = filterByPeriod(allJobs, 'scheduledStart', period, 'jobs');

    const statuses = ['Backlog', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Verified'];
    const countsByStatus = {};
    statuses.forEach(s => { countsByStatus[s] = 0; });

    let pointsInstalled = 0;
    let completedCount = 0;
    let verifiedCount = 0;

    inPeriodJobs.forEach(job => {
      if (countsByStatus[job.status] !== undefined) {
        countsByStatus[job.status]++;
      }
      if (job.status === 'Completed' || job.status === 'Verified') {
        pointsInstalled += Number(job.pointsCount || job.camsCount) || 0;
        if (job.status === 'Completed') completedCount++;
        if (job.status === 'Verified') verifiedCount++;
      }
    });

    // Check overdue jobs (Scheduled end was prior to period end or now)
    const refToDate = period ? period.to : '2099-12-31';
    const overdueCount = inPeriodJobs.filter(j => {
      if (j.status === 'Completed' || j.status === 'Verified' || j.status === 'Cancelled') return false;
      const end = j.scheduledEnd ? String(j.scheduledEnd).slice(0, 10) : null;
      return end && end < refToDate;
    }).length;

    const onTimeRate = (completedCount + verifiedCount) > 0
      ? Math.max(0, Math.round(((completedCount + verifiedCount - overdueCount) / (completedCount + verifiedCount)) * 100))
      : 100;

    const result = {
      jobs: inPeriodJobs,
      totalJobs: inPeriodJobs.length,
      statuses,
      countsByStatus,
      completedOrVerified: completedCount + verifiedCount,
      pointsInstalled,
      overdueCount,
      onTimeRate
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * Service Tickets & SLA Metrics
   */
  ticketsMetrics(period) {
    const key = getCacheKey('ticketsMetrics', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allTickets = (db.state.tickets || []).filter(t => (t.companyId || 'comp-eliza') === compId);
    const inPeriodTickets = filterByPeriod(allTickets, 'loggedAt', period, 'tickets');

    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const countsBySeverity = {};
    severities.forEach(s => { countsBySeverity[s] = 0; });

    let resolvedCount = 0;
    let totalResolutionHours = 0;
    let breachedCount = 0;

    inPeriodTickets.forEach(ticket => {
      if (countsBySeverity[ticket.severity] !== undefined) {
        countsBySeverity[ticket.severity]++;
      }
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        resolvedCount++;
        if (ticket.resolutionHrs) {
          totalResolutionHours += Number(ticket.resolutionHrs) || 0;
        }
      }
      if (ticket.isBreached || ticket.slaStatus === 'Breached') {
        breachedCount++;
      }
    });

    const avgResolutionHrs = resolvedCount > 0 ? (totalResolutionHours / resolvedCount).toFixed(1) : '—';
    const slaCompliancePct = inPeriodTickets.length > 0
      ? Math.max(0, Math.round(((inPeriodTickets.length - breachedCount) / inPeriodTickets.length) * 100))
      : 100;

    // Snapshot: Open tickets right now (as of to)
    const openAsOfTo = filterAsOf(allTickets, 'loggedAt', period.to, 'tickets')
      .filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;

    const result = {
      tickets: inPeriodTickets,
      totalTickets: inPeriodTickets.length,
      severities,
      countsBySeverity,
      resolvedCount,
      breachedCount,
      avgResolutionHrs,
      slaCompliancePct,
      openAsOfTo
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * Payouts Analysis
   */
  payoutsMetrics(period) {
    const key = getCacheKey('payoutsMetrics', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allPayouts = (db.state.payouts || []).filter(p => (p.companyId || 'comp-eliza') === compId);
    const inPeriodPayouts = filterByPeriod(allPayouts, 'date', period, 'payouts');

    let totalEarned = 0;
    let totalDisbursed = 0;
    let totalAdvances = 0;
    let totalDeductions = 0;
    let pendingDues = 0;

    inPeriodPayouts.forEach(p => {
      const amt = Number(p.amount) || 0;
      const paid = Number(p.paidAmount) || 0;

      if (p.type === 'Job Earning' || p.type === 'Bonus' || p.type === 'Incentive' || p.type === 'Reimbursement' || p.type === 'Salary') {
        totalEarned += amt;
      }
      if (p.type === 'Advance') {
        totalAdvances += amt;
      }
      if (p.type === 'Deduction' || p.type === 'Penalty') {
        totalDeductions += amt;
      }
      totalDisbursed += paid;
      if (p.status === 'Pending' || p.status === 'Approved' || p.status === 'Partially Paid') {
        pendingDues += (amt - paid);
      }
    });

    // Snapshot: total balance due across all employees as of to
    const allUpToTo = filterAsOf(allPayouts, 'date', period.to, 'payouts');
    const totalOwedAsOfTo = allUpToTo
      .filter(p => p.status === 'Pending' || p.status === 'Approved' || p.status === 'Partially Paid')
      .reduce((s, p) => s + ((Number(p.amount) || 0) - (Number(p.paidAmount) || 0)), 0);

    const result = {
      payouts: inPeriodPayouts,
      totalPayouts: inPeriodPayouts.length,
      totalEarned,
      totalDisbursed,
      totalAdvances,
      totalDeductions,
      pendingDues,
      totalOwedAsOfTo
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * GST Summary & Tax Breakdown
   */
  gstSummary(period) {
    const key = getCacheKey('gstSummary', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allQuotations = (db.state.quotations || []).filter(q => (q.companyId || 'comp-eliza') === compId);
    const inPeriodQuotes = filterByPeriod(allQuotations, 'date', period, 'quotations');

    let taxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let grandTotal = 0;

    const hsnMap = {};

    inPeriodQuotes.forEach(q => {
      taxableValue += Number(q.taxableSubtotal) || 0;
      cgst += Number(q.cgst) || 0;
      sgst += Number(q.sgst) || 0;
      igst += Number(q.igst) || 0;
      grandTotal += Number(q.grandTotal) || 0;

      // Group items by HSN
      (q.items || []).forEach(item => {
        const hsn = item.hsn || '85258900';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsn,
            description: item.name || 'Surveillance Hardware',
            qty: 0,
            taxable: 0,
            gstRate: 18,
            taxAmount: 0
          };
        }
        const itemTaxable = (Number(item.qty) || 0) * (Number(item.rate) || 0);
        hsnMap[hsn].qty += Number(item.qty) || 0;
        hsnMap[hsn].taxable += itemTaxable;
        hsnMap[hsn].taxAmount += Math.round(itemTaxable * 0.18);
      });
    });

    const result = {
      quotations: inPeriodQuotes,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalGst: cgst + sgst + igst,
      grandTotal,
      hsnList: Object.values(hsnMap)
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * AMC Contracts Analysis
   */
  amcMetrics(period) {
    const key = getCacheKey('amcMetrics', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const allAmc = (db.state.amc || []).filter(a => (a.companyId || 'comp-eliza') === compId);

    // Flow: AMCs whose renewal/end date falls in period
    const inPeriodAmc = filterByPeriod(allAmc, 'endDate', period, 'amc');

    let recognizedRevenue = 0;
    let expiringCount = inPeriodAmc.length;
    let renewedCount = 0;

    inPeriodAmc.forEach(a => {
      recognizedRevenue += Number(a.annualFee) || 0;
      if (a.status === 'Active' || a.status === 'Renewed') {
        renewedCount++;
      }
    });

    const renewalRatePct = expiringCount > 0 ? Math.round((renewedCount / expiringCount) * 100) : 100;

    // Snapshot: Active AMCs as of to
    const activeAsOfTo = allAmc.filter(a => {
      const start = String(a.startDate || '1970-01-01').slice(0, 10);
      const end = String(a.endDate || '2099-12-31').slice(0, 10);
      return start <= period.to && end >= period.from && a.status !== 'Terminated';
    });

    const activeAnnualValue = activeAsOfTo.reduce((sum, a) => sum + (Number(a.annualFee) || 0), 0);

    const result = {
      expiringAmc: inPeriodAmc,
      expiringCount,
      renewedCount,
      renewalRatePct,
      recognizedRevenue,
      activeAsOfToCount: activeAsOfTo.length,
      activeAnnualValue
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * Inventory Movement & Stock Valuation
   */
  inventoryMovement(period) {
    const key = getCacheKey('inventoryMovement', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const items = (db.state.inventory || []).filter(i => (i.companyId || 'comp-eliza') === compId);

    // Calculate movement simulation based on jobs and purchases within period
    const jobs = (db.state.jobs || []).filter(j => (j.companyId || 'comp-eliza') === compId);
    const jobsInPeriod = filterByPeriod(jobs, 'scheduledStart', period, 'jobs');

    const issuesBySku = {};
    jobsInPeriod.forEach(job => {
      (job.materials || []).forEach(mat => {
        if (!issuesBySku[mat.skuId]) issuesBySku[mat.skuId] = 0;
        issuesBySku[mat.skuId] += (Number(mat.qty) || 0) - (Number(mat.returned) || 0);
      });
    });

    let totalValuation = 0;
    const skuReports = items.map(item => {
      const issued = issuesBySku[item.id] || 0;
      const currentStock = Number(item.currentStock) || 0;
      const unitCost = Number(item.unitCost || item.lastPurchaseRate) || 0;
      // Opening = currentStock + issued in period (reconstructed)
      const opening = Math.max(0, currentStock + issued);
      const closing = currentStock;
      const stockVal = closing * unitCost;
      totalValuation += stockVal;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        opening,
        purchases: 0,
        issues: issued,
        returns: 0,
        closing,
        unitCost,
        valuation: stockVal,
        minReorder: Number(item.minReorder) || 0,
        needsReorder: closing <= (Number(item.minReorder) || 0)
      };
    });

    const result = {
      skuReports,
      totalValuation,
      reorderAlertsCount: skuReports.filter(s => s.needsReorder).length
    };

    queryCache.set(key, result);
    return result;
  },

  /**
   * Receivables & Payables with Aging (0-30, 31-60, 61-90, 90+) as of `to`
   */
  receivablesAndAging(period) {
    const key = getCacheKey('receivablesAndAging', period);
    if (queryCache.has(key)) return queryCache.get(key);

    const compId = db.getActiveCompanyId();
    const projects = (db.state.projects || []).filter(p => (p.companyId || 'comp-eliza') === compId);
    const asOfProjects = filterAsOf(projects, 'orderDate', period.to, 'projects');

    const agingBuckets = {
      b0_30: 0,
      b31_60: 0,
      b61_90: 0,
      b90_plus: 0
    };

    let totalReceivables = 0;
    const clientList = [];

    asOfProjects.forEach(p => {
      const quoted = Number(p.quoted) || 0;
      // Assume 70% billed, 50% paid in demo state
      const billed = Math.round(quoted * 0.8);
      const paid = Math.round(quoted * 0.45);
      const outstanding = billed - paid;

      if (outstanding > 0) {
        totalReceivables += outstanding;
        const pDate = p.orderDate ? String(p.orderDate).slice(0, 10) : '2026-04-01';
        const daysAgo = Math.max(0, daysInPeriod({ from: pDate, to: period.to }));

        if (daysAgo <= 30) agingBuckets.b0_30 += outstanding;
        else if (daysAgo <= 60) agingBuckets.b31_60 += outstanding;
        else if (daysAgo <= 90) agingBuckets.b61_90 += outstanding;
        else agingBuckets.b90_plus += outstanding;

        clientList.push({
          projectId: p.id,
          client: p.client,
          orderDate: p.orderDate,
          billed,
          paid,
          outstanding,
          ageDays: daysAgo
        });
      }
    });

    // Supplier dues as of to
    const inventory = (db.state.inventory || []).filter(i => (i.companyId || 'comp-eliza') === compId);
    const supplierDues = inventory.reduce((s, i) => s + (Number(i.outstandingDue) || 0), 0);

    const result = {
      totalReceivables,
      supplierDues,
      agingBuckets,
      clientList
    };

    queryCache.set(key, result);
    return result;
  }
};
