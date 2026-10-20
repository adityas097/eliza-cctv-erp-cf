// Global Period & Date Range Engine (IST - Asia/Kolkata)
// Provides single source of truth for date range calculations, presets, FY/GST quarters, and comparison windows.

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current Date object or customized mock now if testing.
 */
let customNow = null;
export function setMockNow(dateOrIso) {
  customNow = dateOrIso ? new Date(dateOrIso) : null;
}

export function getNow() {
  return customNow ? new Date(customNow) : new Date();
}

/**
 * Formats a Date object to YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function formatToISTDateString(date) {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Parses YYYY-MM-DD into a localized UTC-aligned Date for safe day-math.
 */
export function parseISODateParts(isoDateStr) {
  if (!isoDateStr) return null;
  // Handle ISO timestamp or YYYY-MM-DD
  const cleanStr = String(isoDateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Constructs YYYY-MM-DD from year, month (0-indexed), day.
 */
export function buildISODate(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds days to a YYYY-MM-DD string.
 */
export function addDays(isoDateStr, days) {
  const p = parseISODateParts(isoDateStr);
  if (!p) return isoDateStr;
  const dt = new Date(Date.UTC(p.year, p.month, p.day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Adds months to a YYYY-MM-DD string, clamping to end of month if needed.
 */
export function addMonths(isoDateStr, months) {
  const p = parseISODateParts(isoDateStr);
  if (!p) return isoDateStr;
  const targetMonth = p.month + months;
  const targetYear = p.year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(p.day, daysInTargetMonth);
  return buildISODate(targetYear, normalizedMonth, targetDay);
}

/**
 * Formats YYYY-MM-DD as DD-MMM-YYYY (e.g. 20-Oct-2026).
 */
export function formatDisplayDate(dateInput) {
  if (!dateInput) return '—';
  const iso = String(dateInput).slice(0, 10);
  const p = parseISODateParts(iso);
  if (!p) return String(dateInput);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayStr = String(p.day).padStart(2, '0');
  const monthStr = monthNames[p.month] || '';
  return `${dayStr}-${monthStr}-${p.year}`;
}

/**
 * Formats a period for display, e.g. "01–20 Oct 2026" or "01-Apr-2026 to 31-Mar-2027"
 */
export function formatPeriodRange(from, to) {
  if (!from || !to) return '';
  if (from === '1970-01-01' && to >= '2099-01-01') return 'All Time';
  const p1 = parseISODateParts(from);
  const p2 = parseISODateParts(to);
  if (!p1 || !p2) return `${formatDisplayDate(from)} to ${formatDisplayDate(to)}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (p1.year === p2.year && p1.month === p2.month) {
    return `${String(p1.day).padStart(2, '0')}–${String(p2.day).padStart(2, '0')} ${monthNames[p1.month]} ${p1.year}`;
  }
  if (p1.year === p2.year) {
    return `${String(p1.day).padStart(2, '0')} ${monthNames[p1.month]} – ${String(p2.day).padStart(2, '0')} ${monthNames[p2.month]} ${p1.year}`;
  }
  return `${formatDisplayDate(from)} to ${formatDisplayDate(to)}`;
}

/**
 * Returns number of inclusive days between from and to.
 */
export function daysInPeriod(period) {
  if (!period || !period.from || !period.to) return 0;
  const p1 = parseISODateParts(period.from);
  const p2 = parseISODateParts(period.to);
  if (!p1 || !p2) return 0;
  const t1 = Date.UTC(p1.year, p1.month, p1.day);
  const t2 = Date.UTC(p2.year, p2.month, p2.day);
  const diff = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff + 1);
}

/**
 * Checks if a given date string or timestamp falls inside the period (inclusive).
 */
export function inRange(dateInput, period) {
  if (!dateInput || !period || !period.from || !period.to) return false;
  let dateStr = '';
  if (typeof dateInput === 'string') {
    dateStr = dateInput.slice(0, 10);
  } else if (dateInput instanceof Date) {
    dateStr = formatToISTDateString(dateInput);
  }
  if (!dateStr || dateStr.length < 10) return false;
  return dateStr >= period.from && dateStr <= period.to;
}

/**
 * Indian Financial Year Helper
 * Indian FY starts on April 1 and ends on March 31 of next year.
 * E.g., Oct 2026 belongs to FY 2026-27 (startYear = 2026).
 * Feb 2027 belongs to FY 2026-27 (startYear = 2026).
 */
export function getFinancialYearStart(dateStr) {
  const p = parseISODateParts(dateStr);
  if (!p) return null;
  // p.month is 0-indexed (0 = Jan, 3 = Apr, 11 = Dec)
  const startYear = p.month >= 3 ? p.year : p.year - 1;
  return startYear;
}

export function formatFYLabel(startYear) {
  const nextYearShort = String(startYear + 1).slice(-2);
  return `FY ${startYear}-${nextYearShort}`;
}

/**
 * Indian GST Quarter Calculation
 * Q1: Apr 1 - Jun 30
 * Q2: Jul 1 - Sep 30
 * Q3: Oct 1 - Dec 31
 * Q4: Jan 1 - Mar 31
 */
export function getQuarterInfo(dateStr) {
  const p = parseISODateParts(dateStr);
  if (!p) return null;
  const fyStart = getFinancialYearStart(dateStr);
  let qNum = 1;
  let qName = 'Q1 (Apr–Jun)';
  let from = '';
  let to = '';

  if (p.month >= 3 && p.month <= 5) {
    // Apr, May, Jun
    qNum = 1;
    qName = 'Q1 (Apr–Jun)';
    from = buildISODate(fyStart, 3, 1);
    to = buildISODate(fyStart, 5, 30);
  } else if (p.month >= 6 && p.month <= 8) {
    // Jul, Aug, Sep
    qNum = 2;
    qName = 'Q2 (Jul–Sep)';
    from = buildISODate(fyStart, 6, 1);
    to = buildISODate(fyStart, 8, 30);
  } else if (p.month >= 9 && p.month <= 11) {
    // Oct, Nov, Dec
    qNum = 3;
    qName = 'Q3 (Oct–Dec)';
    from = buildISODate(fyStart, 9, 1);
    to = buildISODate(fyStart, 11, 31);
  } else {
    // Jan, Feb, Mar (belong to calendar year fyStart + 1)
    qNum = 4;
    qName = 'Q4 (Jan–Mar)';
    from = buildISODate(fyStart + 1, 0, 1);
    // March has 31 days
    to = buildISODate(fyStart + 1, 2, 31);
  }

  const fyLabel = formatFYLabel(fyStart);
  return {
    quarterNumber: qNum,
    fyStartYear: fyStart,
    label: `Q${qNum} ${fyLabel} (${qName.slice(4, -1)})`,
    shortLabel: `Q${qNum} ${fyLabel}`,
    from,
    to
  };
}

/**
 * Calculates presets based on current IST time.
 */
export function getPresets(currentIsoDate = null) {
  const todayStr = currentIsoDate || formatToISTDateString(getNow());
  const p = parseISODateParts(todayStr);
  const fyStartYear = getFinancialYearStart(todayStr);

  // Today
  const today = {
    key: 'today',
    label: 'Today',
    from: todayStr,
    to: todayStr
  };

  // Yesterday
  const yestStr = addDays(todayStr, -1);
  const yesterday = {
    key: 'yesterday',
    label: 'Yesterday',
    from: yestStr,
    to: yestStr
  };

  // Last 7 Days (including today)
  const last7 = {
    key: 'last_7_days',
    label: 'Last 7 Days',
    from: addDays(todayStr, -6),
    to: todayStr
  };

  // Last 30 Days (including today)
  const last30 = {
    key: 'last_30_days',
    label: 'Last 30 Days',
    from: addDays(todayStr, -29),
    to: todayStr
  };

  // This Week (Mon–Sun)
  // Get day of week for today (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dtToday = new Date(Date.UTC(p.year, p.month, p.day));
  const dayOfWeek = dtToday.getUTCDay(); // 0 is Sun, 1 is Mon
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekMon = addDays(todayStr, diffToMon);
  const thisWeekSun = addDays(thisWeekMon, 6);
  const thisWeek = {
    key: 'this_week',
    label: 'This Week (Mon–Sun)',
    from: thisWeekMon,
    to: thisWeekSun
  };

  // Last Week (Mon–Sun)
  const lastWeekMon = addDays(thisWeekMon, -7);
  const lastWeekSun = addDays(lastWeekMon, 6);
  const lastWeek = {
    key: 'last_week',
    label: 'Last Week',
    from: lastWeekMon,
    to: lastWeekSun
  };

  // This Month
  const thisMonthStart = buildISODate(p.year, p.month, 1);
  const lastDayThisMonth = new Date(Date.UTC(p.year, p.month + 1, 0)).getUTCDate();
  const thisMonthEnd = buildISODate(p.year, p.month, lastDayThisMonth);
  const thisMonth = {
    key: 'this_month',
    label: 'This Month',
    from: thisMonthStart,
    to: thisMonthEnd
  };

  // Last Month
  const lastMonthYear = p.month === 0 ? p.year - 1 : p.year;
  const lastMonthMonth = p.month === 0 ? 11 : p.month - 1;
  const lastDayLastMonth = new Date(Date.UTC(lastMonthYear, lastMonthMonth + 1, 0)).getUTCDate();
  const lastMonth = {
    key: 'last_month',
    label: 'Last Month',
    from: buildISODate(lastMonthYear, lastMonthMonth, 1),
    to: buildISODate(lastMonthYear, lastMonthMonth, lastDayLastMonth)
  };

  // This Quarter
  const currentQInfo = getQuarterInfo(todayStr);
  const thisQuarter = {
    key: 'this_quarter',
    label: currentQInfo.label,
    from: currentQInfo.from,
    to: currentQInfo.to
  };

  // Last Quarter
  const lastQDate = addDays(currentQInfo.from, -1);
  const lastQInfo = getQuarterInfo(lastQDate);
  const lastQuarter = {
    key: 'last_quarter',
    label: `Last Quarter (${lastQInfo.shortLabel})`,
    from: lastQInfo.from,
    to: lastQInfo.to
  };

  // This Financial Year (1 Apr - 31 Mar)
  const thisFyFrom = buildISODate(fyStartYear, 3, 1);
  const thisFyTo = buildISODate(fyStartYear + 1, 2, 31);
  const thisFY = {
    key: 'this_fy',
    label: `This Financial Year (${formatFYLabel(fyStartYear)})`,
    from: thisFyFrom,
    to: thisFyTo
  };

  // Last Financial Year
  const lastFyStartYear = fyStartYear - 1;
  const lastFY = {
    key: 'last_fy',
    label: `Last Financial Year (${formatFYLabel(lastFyStartYear)})`,
    from: buildISODate(lastFyStartYear, 3, 1),
    to: buildISODate(lastFyStartYear + 1, 2, 31)
  };

  // Year to Date (FY) (from 1 Apr of current FY to today)
  const ytdFY = {
    key: 'ytd_fy',
    label: `Year to Date (${formatFYLabel(fyStartYear)} YTD)`,
    from: thisFyFrom,
    to: todayStr
  };

  // Calendar Year (1 Jan - 31 Dec)
  const calendarYear = {
    key: 'calendar_year',
    label: `Calendar Year (${p.year})`,
    from: buildISODate(p.year, 0, 1),
    to: buildISODate(p.year, 11, 31)
  };

  // All Time
  const allTime = {
    key: 'all_time',
    label: 'All Time',
    from: '1970-01-01',
    to: '2099-12-31'
  };

  return {
    today,
    yesterday,
    last_7_days: last7,
    last_30_days: last30,
    this_week: thisWeek,
    last_week: lastWeek,
    this_month: thisMonth,
    last_month: lastMonth,
    this_quarter: thisQuarter,
    last_quarter: lastQuarter,
    this_fy: thisFY,
    last_fy: lastFY,
    ytd_fy: ytdFY,
    calendar_year: calendarYear,
    all_time: allTime
  };
}

/**
 * Month-wise GST period helper (e.g. for "Sep 2026")
 */
export function getGSTMonthPeriod(year, month1Indexed) {
  const month0 = month1Indexed - 1;
  const from = buildISODate(year, month0, 1);
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const to = buildISODate(year, month0, lastDay);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    key: `gst_${year}_${String(month1Indexed).padStart(2, '0')}`,
    label: `GST: ${monthNames[month0]} ${year}`,
    from,
    to
  };
}

/**
 * Computes previous period of exactly the same length immediately before period.from.
 */
export function previousPeriod(period) {
  if (!period || !period.from || !period.to) return null;
  if (period.preset === 'all_time' || period.from === '1970-01-01') {
    return {
      from: '1970-01-01',
      to: '1970-01-01',
      label: 'Prior History'
    };
  }

  // If preset is this_month or last_month, previous period is exactly the month before
  if (period.preset === 'this_month' || period.preset === 'last_month') {
    const p = parseISODateParts(period.from);
    if (p) {
      const prevM = p.month === 0 ? 11 : p.month - 1;
      const prevY = p.month === 0 ? p.year - 1 : p.year;
      const lastDay = new Date(Date.UTC(prevY, prevM + 1, 0)).getUTCDate();
      return {
        from: buildISODate(prevY, prevM, 1),
        to: buildISODate(prevY, prevM, lastDay),
        label: 'Previous Month'
      };
    }
  }

  // If preset is this_fy or last_fy, previous period is exactly the prior FY
  if (period.preset === 'this_fy' || period.preset === 'last_fy') {
    const p = parseISODateParts(period.from);
    if (p) {
      const prevFyStart = p.year - 1;
      return {
        from: buildISODate(prevFyStart, 3, 1),
        to: buildISODate(prevFyStart + 1, 2, 31),
        label: `Previous FY (${formatFYLabel(prevFyStart)})`
      };
    }
  }

  const length = daysInPeriod(period);
  const prevTo = addDays(period.from, -1);
  const prevFrom = addDays(prevTo, -(length - 1));

  return {
    from: prevFrom,
    to: prevTo,
    label: `Previous ${length} Days (${formatPeriodRange(prevFrom, prevTo)})`
  };
}

/**
 * Computes same period last year (shifts both from & to by -1 year).
 */
export function samePeriodLastYear(period) {
  if (!period || !period.from || !period.to) return null;
  if (period.preset === 'all_time' || period.from === '1970-01-01') {
    return {
      from: '1970-01-01',
      to: '1970-01-01',
      label: 'All Time'
    };
  }

  const pFrom = parseISODateParts(period.from);
  const pTo = parseISODateParts(period.to);
  if (!pFrom || !pTo) return null;

  const prevYearFrom = pFrom.year - 1;
  const prevYearTo = pTo.year - 1;

  // Clamping for Feb 29 leap years
  const maxDaysFrom = new Date(Date.UTC(prevYearFrom, pFrom.month + 1, 0)).getUTCDate();
  const maxDaysTo = new Date(Date.UTC(prevYearTo, pTo.month + 1, 0)).getUTCDate();

  const prevFrom = buildISODate(prevYearFrom, pFrom.month, Math.min(pFrom.day, maxDaysFrom));
  const prevTo = buildISODate(prevYearTo, pTo.month, Math.min(pTo.day, maxDaysTo));

  return {
    from: prevFrom,
    to: prevTo,
    label: `Same Period Last Year (${formatPeriodRange(prevFrom, prevTo)})`
  };
}

/**
 * Steps the current period by its natural unit (direction: +1 for next, -1 for prev).
 */
export function stepPeriod(period, direction = 1) {
  if (!period || !period.from || !period.to) return period;
  if (period.preset === 'all_time') return period;

  const dir = direction >= 0 ? 1 : -1;

  // Monthly preset or exact month range
  const pFrom = parseISODateParts(period.from);
  const pTo = parseISODateParts(period.to);
  if (!pFrom || !pTo) return period;

  const isFullMonth = pFrom.day === 1 && pTo.day === new Date(Date.UTC(pTo.year, pTo.month + 1, 0)).getUTCDate() && pFrom.month === pTo.month && pFrom.year === pTo.year;

  if (isFullMonth) {
    const nextTargetMonth = pFrom.month + dir;
    const targetYear = pFrom.year + Math.floor(nextTargetMonth / 12);
    const targetMonth = ((nextTargetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const newFrom = buildISODate(targetYear, targetMonth, 1);
    const newTo = buildISODate(targetYear, targetMonth, lastDay);
    return {
      ...period,
      preset: 'custom',
      from: newFrom,
      to: newTo
    };
  }

  // Full FY (1 Apr - 31 Mar)
  const isFullFY = pFrom.month === 3 && pFrom.day === 1 && pTo.month === 2 && pTo.day === 31 && pTo.year === pFrom.year + 1;
  if (isFullFY) {
    const newFyStart = pFrom.year + dir;
    return {
      ...period,
      preset: 'custom',
      from: buildISODate(newFyStart, 3, 1),
      to: buildISODate(newFyStart + 1, 2, 31)
    };
  }

  // Default: step by length of current period
  const length = daysInPeriod(period);
  const newFrom = addDays(period.from, length * dir);
  const newTo = addDays(period.to, length * dir);

  return {
    ...period,
    preset: 'custom',
    from: newFrom,
    to: newTo
  };
}

/**
 * Returns continuous zero-filled time buckets covering the period.
 * <= 31 days -> daily
 * <= 120 days -> weekly
 * > 120 days -> monthly
 */
export function buckets(period) {
  if (!period || !period.from || !period.to) return [];
  const days = daysInPeriod(period);
  if (days <= 0) return [];

  // Guard against gigantic all_time ranges for charts
  if (period.preset === 'all_time' || days > 3650) {
    // Generate annual or monthly buckets for the last 3 years
    const endStr = formatToISTDateString(getNow());
    const startStr = addDays(endStr, -1095);
    return generateMonthlyBuckets(startStr, endStr);
  }

  if (days <= 31) {
    return generateDailyBuckets(period.from, period.to);
  } else if (days <= 120) {
    return generateWeeklyBuckets(period.from, period.to);
  } else {
    return generateMonthlyBuckets(period.from, period.to);
  }
}

function generateDailyBuckets(from, to) {
  const result = [];
  let curr = from;
  while (curr <= to) {
    const p = parseISODateParts(curr);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    result.push({
      key: curr,
      label: `${String(p.day).padStart(2, '0')} ${monthNames[p.month]}`,
      from: curr,
      to: curr,
      type: 'day'
    });
    curr = addDays(curr, 1);
  }
  return result;
}

function generateWeeklyBuckets(from, to) {
  const result = [];
  let curr = from;
  let idx = 1;
  while (curr <= to) {
    const endOfWeek = addDays(curr, 6);
    const bucketTo = endOfWeek < to ? endOfWeek : to;
    const p1 = parseISODateParts(curr);
    const p2 = parseISODateParts(bucketTo);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${String(p1.day).padStart(2, '0')} ${monthNames[p1.month]}–${String(p2.day).padStart(2, '0')} ${monthNames[p2.month]}`;

    result.push({
      key: `W${idx}_${curr}`,
      label,
      from: curr,
      to: bucketTo,
      type: 'week'
    });
    curr = addDays(bucketTo, 1);
    idx++;
  }
  return result;
}

function generateMonthlyBuckets(from, to) {
  const result = [];
  const pFrom = parseISODateParts(from);
  const pTo = parseISODateParts(to);
  if (!pFrom || !pTo) return [];

  let curYear = pFrom.year;
  let curMonth = pFrom.month;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  while (curYear < pTo.year || (curYear === pTo.year && curMonth <= pTo.month)) {
    const bFrom = buildISODate(curYear, curMonth, 1);
    const lastDay = new Date(Date.UTC(curYear, curMonth + 1, 0)).getUTCDate();
    const bTo = buildISODate(curYear, curMonth, lastDay);

    const actualFrom = bFrom < from ? from : bFrom;
    const actualTo = bTo > to ? to : bTo;

    result.push({
      key: `${curYear}-${String(curMonth + 1).padStart(2, '0')}`,
      label: `${monthNames[curMonth]} ${curYear}`,
      from: actualFrom,
      to: actualTo,
      type: 'month'
    });

    curMonth++;
    if (curMonth > 11) {
      curMonth = 0;
      curYear++;
    }
  }
  return result;
}

/**
 * Validates a period object.
 * Returns { valid: boolean, error: string | null }
 */
export function validatePeriod(period, options = { allowFuture: false }) {
  if (!period) return { valid: false, error: 'Period is required' };
  if (!period.from || !period.to) return { valid: false, error: 'Both from and to dates are required' };
  if (period.from > period.to) return { valid: false, error: 'From date cannot be after To date' };

  const days = daysInPeriod(period);
  if (days > 3653) {
    // 10 years max
    return { valid: false, error: 'Date range cannot exceed 10 years' };
  }

  const todayStr = formatToISTDateString(getNow());
  if (!options.allowFuture && period.from > todayStr) {
    return { valid: false, error: 'Historical reports cannot select future-only date ranges' };
  }

  return { valid: true, error: null };
}

/**
 * Resolves period label for display in badges and headers.
 */
export function getPeriodLabel(period) {
  if (!period) return 'Select Period';
  const presets = getPresets();
  if (period.preset && presets[period.preset]) {
    return presets[period.preset].label;
  }
  return formatPeriodRange(period.from, period.to);
}
