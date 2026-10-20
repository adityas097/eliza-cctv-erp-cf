// Comprehensive Vitest Suite for Global Date Filter & Period Engine
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setMockNow,
  getNow,
  formatToISTDateString,
  getFinancialYearStart,
  formatFYLabel,
  getQuarterInfo,
  getPresets,
  daysInPeriod,
  inRange,
  previousPeriod,
  samePeriodLastYear,
  stepPeriod,
  buckets,
  validatePeriod,
  getGSTMonthPeriod
} from '../src/services/periodService.js';
import { periodStore } from '../src/store/periodStore.js';
import { filterByPeriod, filterAsOf, calculateDelta } from '../src/services/queryService.js';
import { ledgerService } from '../src/services/ledgerService.js';
import { db } from '../src/store/db.js';

describe('Period Engine & Date Boundaries (IST - Asia/Kolkata)', () => {
  beforeEach(() => {
    // Fixed reference time: 20-Oct-2026 12:00:00 IST
    setMockNow('2026-10-20T12:00:00+05:30');
  });

  it('formats current IST date correctly', () => {
    const today = formatToISTDateString(getNow());
    expect(today).toBe('2026-10-20');
  });

  it('calculates Indian Financial Year (FY) boundaries correctly', () => {
    // In Oct 2026: FY 2026-27
    const fyStartOct = getFinancialYearStart('2026-10-20');
    expect(fyStartOct).toBe(2026);
    expect(formatFYLabel(fyStartOct)).toBe('FY 2026-27');

    // In Feb 2027: FY 2026-27 (financial year starts in 2026)
    const fyStartFeb = getFinancialYearStart('2027-02-15');
    expect(fyStartFeb).toBe(2026);
    expect(formatFYLabel(fyStartFeb)).toBe('FY 2026-27');

    // In Apr 2027: FY 2027-28
    const fyStartApr = getFinancialYearStart('2027-04-01');
    expect(fyStartApr).toBe(2027);
    expect(formatFYLabel(fyStartApr)).toBe('FY 2027-28');
  });

  it('calculates GST quarters correctly', () => {
    // Q1: Apr-Jun
    const q1 = getQuarterInfo('2026-05-15');
    expect(q1.quarterNumber).toBe(1);
    expect(q1.from).toBe('2026-04-01');
    expect(q1.to).toBe('2026-06-30');

    // Q2: Jul-Sep
    const q2 = getQuarterInfo('2026-08-10');
    expect(q2.quarterNumber).toBe(2);
    expect(q2.from).toBe('2026-07-01');
    expect(q2.to).toBe('2026-09-30');

    // Q3: Oct-Dec
    const q3 = getQuarterInfo('2026-10-20');
    expect(q3.quarterNumber).toBe(3);
    expect(q3.from).toBe('2026-10-01');
    expect(q3.to).toBe('2026-12-31');

    // Q4: Jan-Mar
    const q4 = getQuarterInfo('2027-01-15');
    expect(q4.quarterNumber).toBe(4);
    expect(q4.from).toBe('2027-01-01');
    expect(q4.to).toBe('2027-03-31');
  });

  it('generates all presets accurately on 20-Oct-2026', () => {
    const presets = getPresets();

    expect(presets.today.from).toBe('2026-10-20');
    expect(presets.today.to).toBe('2026-10-20');

    expect(presets.yesterday.from).toBe('2026-10-19');
    expect(presets.yesterday.to).toBe('2026-10-19');

    expect(presets.last_7_days.from).toBe('2026-10-14');
    expect(presets.last_7_days.to).toBe('2026-10-20');
    expect(daysInPeriod(presets.last_7_days)).toBe(7);

    expect(presets.last_30_days.from).toBe('2026-09-21');
    expect(presets.last_30_days.to).toBe('2026-10-20');
    expect(daysInPeriod(presets.last_30_days)).toBe(30);

    // Oct 2026: Month is 2026-10-01 to 2026-10-31
    expect(presets.this_month.from).toBe('2026-10-01');
    expect(presets.this_month.to).toBe('2026-10-31');

    // Last Month: Sep 2026 (30 days)
    expect(presets.last_month.from).toBe('2026-09-01');
    expect(presets.last_month.to).toBe('2026-09-30');

    // This FY: 01-Apr-2026 to 31-Mar-2027
    expect(presets.this_fy.from).toBe('2026-04-01');
    expect(presets.this_fy.to).toBe('2027-03-31');

    // Last FY: 01-Apr-2025 to 31-Mar-2026
    expect(presets.last_fy.from).toBe('2025-04-01');
    expect(presets.last_fy.to).toBe('2026-03-31');

    // Year to Date (FY): 01-Apr-2026 to 20-Oct-2026
    expect(presets.ytd_fy.from).toBe('2026-04-01');
    expect(presets.ytd_fy.to).toBe('2026-10-20');
  });

  it('supports GST month period picker', () => {
    const sep = getGSTMonthPeriod(2026, 9);
    expect(sep.from).toBe('2026-09-01');
    expect(sep.to).toBe('2026-09-30');
    expect(sep.label).toContain('Sep 2026');
  });

  it('checks inclusive date boundaries with inRange()', () => {
    const period = { from: '2026-10-01', to: '2026-10-20' };

    expect(inRange('2026-10-01', period)).toBe(true);
    expect(inRange('2026-10-20', period)).toBe(true);
    expect(inRange('2026-10-15T18:30:00Z', period)).toBe(true);
    expect(inRange('2026-09-30', period)).toBe(false);
    expect(inRange('2026-10-21', period)).toBe(false);
    expect(inRange(null, period)).toBe(false);
  });

  it('calculates previous period of exactly the same length immediately before', () => {
    // 7 days: 2026-10-14 to 2026-10-20
    const period7 = { from: '2026-10-14', to: '2026-10-20', preset: 'last_7_days' };
    const prev7 = previousPeriod(period7);
    expect(prev7.to).toBe('2026-10-13');
    expect(prev7.from).toBe('2026-10-07');
    expect(daysInPeriod(prev7)).toBe(7);

    // Month preset previous period
    const periodMonth = { from: '2026-10-01', to: '2026-10-31', preset: 'this_month' };
    const prevMonth = previousPeriod(periodMonth);
    expect(prevMonth.from).toBe('2026-09-01');
    expect(prevMonth.to).toBe('2026-09-30');

    // FY preset previous period
    const periodFY = { from: '2026-04-01', to: '2027-03-31', preset: 'this_fy' };
    const prevFY = previousPeriod(periodFY);
    expect(prevFY.from).toBe('2025-04-01');
    expect(prevFY.to).toBe('2026-03-31');
  });

  it('calculates same period last year', () => {
    const period = { from: '2026-04-01', to: '2026-10-20', preset: 'ytd_fy' };
    const sply = samePeriodLastYear(period);
    expect(sply.from).toBe('2025-04-01');
    expect(sply.to).toBe('2025-10-20');
  });

  it('selects bucket granularity automatically by length', () => {
    // <= 31 days -> daily
    const dailyPeriod = { from: '2026-10-01', to: '2026-10-20' };
    const bDaily = buckets(dailyPeriod);
    expect(bDaily.length).toBe(20);
    expect(bDaily[0].type).toBe('day');
    expect(bDaily[0].from).toBe('2026-10-01');
    expect(bDaily[19].to).toBe('2026-10-20');

    // <= 120 days -> weekly
    const weeklyPeriod = { from: '2026-07-01', to: '2026-09-30' }; // 92 days
    const bWeekly = buckets(weeklyPeriod);
    expect(bWeekly[0].type).toBe('week');
    expect(bWeekly.length).toBeGreaterThan(10);

    // > 120 days -> monthly
    const monthlyPeriod = { from: '2026-04-01', to: '2027-03-31' }; // 365 days
    const bMonthly = buckets(monthlyPeriod);
    expect(bMonthly.length).toBe(12);
    expect(bMonthly[0].type).toBe('month');
    expect(bMonthly[0].label).toContain('Apr 2026');
    expect(bMonthly[11].label).toContain('Mar 2027');
  });

  it('validates periods correctly (from <= to, max 10 years, future restrictions)', () => {
    expect(validatePeriod({ from: '2026-10-01', to: '2026-10-20' }).valid).toBe(true);
    expect(validatePeriod({ from: '2026-10-21', to: '2026-10-20' }).valid).toBe(false);
    expect(validatePeriod({ from: '2010-01-01', to: '2026-10-20' }).valid).toBe(false); // > 10 yrs
    expect(validatePeriod({ from: '2027-01-01', to: '2027-02-01' }, { allowFuture: false }).valid).toBe(false);
    expect(validatePeriod({ from: '2027-01-01', to: '2027-02-01' }, { allowFuture: true }).valid).toBe(true);
  });
});

describe('Central Filtering & Query Service', () => {
  const sampleRecords = [
    { id: '1', date: '2026-04-15', amount: 100 },
    { id: '2', date: '2026-09-10', amount: 200 },
    { id: '3', date: '2026-10-05', amount: 300 },
    { id: '4', date: '2026-10-18', amount: 400 },
    { id: '5', date: '2026-11-01', amount: 500 }
  ];

  it('filters records by period accurately', () => {
    const periodOct = { from: '2026-10-01', to: '2026-10-31' };
    const filtered = filterByPeriod(sampleRecords, 'date', periodOct);
    expect(filtered.length).toBe(2);
    expect(filtered.map(r => r.id)).toEqual(['3', '4']);
  });

  it('filters snapshot records as of `to` date', () => {
    const asOfSep = filterAsOf(sampleRecords, 'date', '2026-09-30');
    expect(asOfSep.length).toBe(2);
    expect(asOfSep.map(r => r.id)).toEqual(['1', '2']);
  });

  it('calculates comparison delta and inverts colors for cost metrics', () => {
    // Normal metric (revenue): increase is positive
    const revDelta = calculateDelta(120, 100, false);
    expect(revDelta.isPositive).toBe(true);
    expect(revDelta.pct).toBe(20);
    expect(revDelta.colorClass).toBe('delta-positive');

    // Cost metric: increase is danger/red
    const costDelta = calculateDelta(120, 100, true);
    expect(costDelta.isPositive).toBe(true);
    expect(costDelta.colorClass).toBe('delta-danger');

    // Cost metric decrease is positive/green
    const costDrop = calculateDelta(80, 100, true);
    expect(costDrop.colorClass).toBe('delta-positive');
  });
});

describe('Ledger Double-Entry Identity & Balance Verification', () => {
  it('guarantees opening + Σcredits - Σdebits = closing across all custom date ranges', async () => {
    const employees = await db.collection('employees').list();
    expect(employees.length).toBeGreaterThan(0);

    const empId = employees[0].id;

    // Test Case 1: Custom sub-range (October 2026)
    const octStatement = await ledgerService.getEmployeeLedger(empId, '2026-10-01', '2026-10-31');
    const octSum = octStatement.openingBalance + octStatement.totalCredit - octStatement.totalDebit;
    expect(Math.abs(octSum - octStatement.closingBalance)).toBeLessThan(0.001);
    expect(octStatement.isReconciled).toBe(true);

    // Test Case 2: All Time range
    const allTimeStatement = await ledgerService.getEmployeeLedger(empId, '1970-01-01', '2099-12-31');
    expect(allTimeStatement.openingBalance).toBe(0);
    const allTimeSum = allTimeStatement.totalCredit - allTimeStatement.totalDebit;
    expect(Math.abs(allTimeSum - allTimeStatement.closingBalance)).toBeLessThan(0.001);
    expect(allTimeStatement.isReconciled).toBe(true);

    // Test Case 3: Prior range closing balance equals next range opening balance
    const q1Statement = await ledgerService.getEmployeeLedger(empId, '2026-04-01', '2026-06-30');
    const q2Statement = await ledgerService.getEmployeeLedger(empId, '2026-07-01', '2026-09-30');
    expect(q2Statement.openingBalance).toBe(q1Statement.closingBalance);
  });
});

describe('Observable PeriodStore & State Persistence', () => {
  it('updates state and notifies subscribers on setPeriod', () => {
    let notified = false;
    const unsub = periodStore.subscribe((p) => {
      notified = true;
    });

    periodStore.setPeriod('this_month');
    expect(periodStore.getPeriod().preset).toBe('this_month');
    expect(notified).toBe(true);

    unsub();
  });

  it('supports per-page unpinning and custom overrides', () => {
    periodStore.setPeriod('this_month');

    // Default: pinned to global
    expect(periodStore.isPagePinned('projects')).toBe(true);
    expect(periodStore.getPagePeriod('projects').preset).toBe('this_month');

    // Unpin projects page
    periodStore.setPagePeriod('projects', { preset: 'last_month', from: '2026-09-01', to: '2026-09-30' });
    expect(periodStore.isPagePinned('projects')).toBe(false);
    expect(periodStore.getPagePeriod('projects').preset).toBe('last_month');

    // Global remains this_month
    expect(periodStore.getPeriod().preset).toBe('this_month');

    // Re-pin back to global
    periodStore.resetPageToGlobal('projects');
    expect(periodStore.isPagePinned('projects')).toBe(true);
    expect(periodStore.getPagePeriod('projects').preset).toBe('this_month');
  });
});
