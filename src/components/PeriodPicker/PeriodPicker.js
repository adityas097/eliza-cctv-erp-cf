// Global Period Picker Component
// Implements top navbar period bar, dual-month calendar popover, quick steppers, comparison mode, and page chips.

import {
  getPresets,
  formatPeriodRange,
  formatDisplayDate,
  daysInPeriod,
  stepPeriod,
  parseISODateParts,
  buildISODate,
  addDays,
  addMonths,
  getNow,
  formatToISTDateString,
  getGSTMonthPeriod
} from '../../services/periodService.js';
import { periodStore } from '../../store/periodStore.js';
import './PeriodPicker.css';

let isPopoverOpen = false;
let draftPeriod = null;
let calBaseMonth = null; // { year, month } for the left calendar in dual view

export function renderPeriodBar(container) {
  if (!container) return;

  const currentPeriod = periodStore.getPeriod();
  if (!draftPeriod || !isPopoverOpen) {
    draftPeriod = { ...currentPeriod };
  }

  // Initialize calendar view to current from date
  if (!calBaseMonth) {
    const p = parseISODateParts(currentPeriod.from) || parseISODateParts(formatToISTDateString(getNow()));
    calBaseMonth = { year: p.year, month: p.month };
  }

  const presets = getPresets();
  const activePresetKey = currentPeriod.preset;
  const activePreset = presets[activePresetKey];
  const displayLabel = activePreset ? activePreset.label : 'Custom Range';
  const displayRange = formatPeriodRange(currentPeriod.from, currentPeriod.to);

  container.innerHTML = `
    <div class="period-bar-wrapper">
      <!-- Quick Prev Step -->
      <button id="periodQuickPrevBtn" class="period-step-btn" title="Step to Previous Period">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <!-- Main Period Bar Trigger -->
      <button id="periodBarTriggerBtn" class="period-bar-trigger ${isPopoverOpen ? 'active' : ''}" title="Change Date Filter & Period Range">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span class="period-bar-label">${displayLabel}</span>
        <span style="color: var(--text-dim);">&bull;</span>
        <span class="period-bar-range">${displayRange}</span>
        ${currentPeriod.compare && currentPeriod.compare !== 'none' ? `
          <span class="period-bar-cmp-pill" title="Comparing vs ${currentPeriod.compare}">CMP ON</span>
        ` : ''}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 2px; color: var(--text-dim);">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Quick Next Step -->
      <button id="periodQuickNextBtn" class="period-step-btn" title="Step to Next Period">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>

      <!-- Popover Dialog Sheet -->
      <div id="periodPopover" class="period-popover ${isPopoverOpen ? 'open' : ''}">
        <div class="period-popover-body">
          <!-- Left: Preset List -->
          <div class="period-presets-sidebar">
            <span class="period-preset-group-title">Standard Windows</span>
            <button class="period-preset-btn ${draftPeriod.preset === 'today' ? 'active' : ''}" data-preset="today">Today</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'yesterday' ? 'active' : ''}" data-preset="yesterday">Yesterday</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'last_7_days' ? 'active' : ''}" data-preset="last_7_days">Last 7 Days</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'last_30_days' ? 'active' : ''}" data-preset="last_30_days">Last 30 Days</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'this_week' ? 'active' : ''}" data-preset="this_week">This Week (Mon–Sun)</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'last_week' ? 'active' : ''}" data-preset="last_week">Last Week</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'this_month' ? 'active' : ''}" data-preset="this_month">This Month</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'last_month' ? 'active' : ''}" data-preset="last_month">Last Month</button>

            <span class="period-preset-group-title" style="margin-top: 8px;">Fiscal & GST Quarters</span>
            <button class="period-preset-btn ${draftPeriod.preset === 'this_quarter' ? 'active' : ''}" data-preset="this_quarter">${presets.this_quarter.label}</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'last_quarter' ? 'active' : ''}" data-preset="last_quarter">Last Quarter</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'this_fy' ? 'active' : ''}" data-preset="this_fy">${presets.this_fy.label}</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'last_fy' ? 'active' : ''}" data-preset="last_fy">${presets.last_fy.label}</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'ytd_fy' ? 'active' : ''}" data-preset="ytd_fy">Year to Date (FY)</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'calendar_year' ? 'active' : ''}" data-preset="calendar_year">Calendar Year</button>

            <span class="period-preset-group-title" style="margin-top: 8px;">Full Scope</span>
            <button class="period-preset-btn ${draftPeriod.preset === 'all_time' ? 'active' : ''}" data-preset="all_time">All Time</button>
            <button class="period-preset-btn ${draftPeriod.preset === 'custom' ? 'active' : ''}" data-preset="custom">Custom Range</button>

            <!-- GST Month Quick Selector -->
            <div style="margin-top: 10px; padding: 6px 10px; background: rgba(56, 189, 248, 0.08); border-radius: 6px;">
              <span style="font-size: 10px; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 4px;">GST MONTH PICKER</span>
              <select id="periodGstMonthSelect" style="width: 100%; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); font-size: 11px; padding: 3px 6px; border-radius: 4px;">
                <option value="">Select GST Month...</option>
                <option value="2026-10">Oct 2026</option>
                <option value="2026-09">Sep 2026</option>
                <option value="2026-08">Aug 2026</option>
                <option value="2026-07">Jul 2026</option>
                <option value="2026-06">Jun 2026</option>
                <option value="2026-05">May 2026</option>
                <option value="2026-04">Apr 2026</option>
              </select>
            </div>
          </div>

          <!-- Right: Dual Month Calendar View -->
          <div class="period-calendar-view">
            <!-- Dual Month Navigation & Grids -->
            <div class="period-calendar-dual-wrapper">
              ${renderCalendarMonth(calBaseMonth.year, calBaseMonth.month, true)}
              ${renderCalendarMonth(
                calBaseMonth.month === 11 ? calBaseMonth.year + 1 : calBaseMonth.year,
                calBaseMonth.month === 11 ? 0 : calBaseMonth.month + 1,
                false
              )}
            </div>

            <!-- Direct Date Range Inputs with typing support -->
            <div style="margin-top: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div class="period-custom-inputs">
                <span style="font-size: 11.5px; color: var(--text-dim); font-weight: 600;">Range:</span>
                <input type="date" id="periodInputFrom" class="period-date-input" value="${draftPeriod.from || ''}" />
                <span style="color: var(--text-dim);">&rarr;</span>
                <input type="date" id="periodInputTo" class="period-date-input" value="${draftPeriod.to || ''}" />
              </div>
              <span style="font-size: 11px; color: var(--text-muted);">
                ${daysInPeriod(draftPeriod)} day${daysInPeriod(draftPeriod) === 1 ? '' : 's'} selected
              </span>
            </div>

            <!-- Comparison Bar -->
            <div class="period-compare-bar">
              <div class="period-compare-controls">
                <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">Compare to:</span>
                <select id="periodCompareSelect" class="period-compare-select">
                  <option value="none" ${draftPeriod.compare === 'none' ? 'selected' : ''}>None</option>
                  <option value="previous_period" ${draftPeriod.compare === 'previous_period' ? 'selected' : ''}>Previous Period (same length)</option>
                  <option value="previous_year" ${draftPeriod.compare === 'previous_year' ? 'selected' : ''}>Same Period Last Year</option>
                  <option value="custom" ${draftPeriod.compare === 'custom' ? 'selected' : ''}>Custom Comparison Range</option>
                </select>
              </div>

              ${draftPeriod.compare === 'custom' ? `
                <div class="period-custom-inputs" style="margin-top: 4px;">
                  <span style="font-size: 11px; color: var(--text-dim);">Compare Range:</span>
                  <input type="date" id="periodCmpFrom" class="period-date-input" value="${draftPeriod.compareFrom || ''}" />
                  <span>&rarr;</span>
                  <input type="date" id="periodCmpTo" class="period-date-input" value="${draftPeriod.compareTo || ''}" />
                </div>
              ` : (draftPeriod.compare !== 'none' && draftPeriod.compareFrom && draftPeriod.compareTo ? `
                <span style="font-size: 11px; color: #34d399; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 4px;">
                  ${formatDisplayDate(draftPeriod.compareFrom)} &rarr; ${formatDisplayDate(draftPeriod.compareTo)}
                </span>
              ` : '')}
            </div>
          </div>
        </div>

        <!-- Popover Footer -->
        <div class="period-popover-footer">
          <div class="period-summary-text">
            <span>Viewing: <strong style="color: var(--text-main);">${formatDisplayDate(draftPeriod.from)} &ndash; ${formatDisplayDate(draftPeriod.to)}</strong></span>
            ${draftPeriod.compare && draftPeriod.compare !== 'none' ? `<span style="margin-left: 8px; color: #34d399;">&bull; Compare Active</span>` : ''}
          </div>
          <div class="period-footer-actions">
            <button id="periodResetBtn" class="btn btn-secondary btn-sm" style="font-size: 11.5px;">Reset to Default</button>
            <button id="periodCancelBtn" class="btn btn-secondary btn-sm" style="font-size: 11.5px;">Cancel</button>
            <button id="periodApplyBtn" class="btn btn-primary btn-sm" style="font-size: 11.5px; padding: 4px 14px;">Apply Range</button>
          </div>
        </div>
      </div>
    </div>
  `;

  attachEventHandlers(container);
}

function renderCalendarMonth(year, month, isLeft) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 is Sunday
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayStr = formatToISTDateString(getNow());

  // Weekday initials
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let daysHtml = '';
  // Empty leading slots
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysHtml += `<div class="period-cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = buildISODate(year, month, d);
    const isStart = iso === draftPeriod.from;
    const isEnd = iso === draftPeriod.to;
    const isInRange = iso > draftPeriod.from && iso < draftPeriod.to;
    const isToday = iso === todayStr;

    let classes = ['period-cal-day'];
    if (isStart) classes.push('selected-start');
    if (isEnd) classes.push('selected-end');
    if (isInRange) classes.push('in-range');
    if (isToday) classes.push('today-marker');

    daysHtml += `
      <div class="${classes.join(' ')}" data-date="${iso}">
        ${d}
      </div>
    `;
  }

  return `
    <div class="period-single-month">
      <div class="period-month-nav">
        ${isLeft ? `
          <button class="period-month-btn" id="periodCalPrevMonth" title="Previous Month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        ` : '<div></div>'}
        <span class="period-month-title">${monthNames[month]} ${year}</span>
        ${!isLeft ? `
          <button class="period-month-btn" id="periodCalNextMonth" title="Next Month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        ` : '<div></div>'}
      </div>

      <div class="period-calendar-grid">
        ${weekDays.map(w => `<div class="period-cal-head">${w}</div>`).join('')}
        ${daysHtml}
      </div>
    </div>
  `;
}

function attachEventHandlers(container) {
  const triggerBtn = document.getElementById('periodBarTriggerBtn');
  const popover = document.getElementById('periodPopover');

  // Trigger toggle
  triggerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    isPopoverOpen = !isPopoverOpen;
    if (isPopoverOpen) {
      draftPeriod = { ...periodStore.getPeriod() };
      const p = parseISODateParts(draftPeriod.from) || parseISODateParts(formatToISTDateString(getNow()));
      calBaseMonth = { year: p.year, month: p.month };
    }
    renderPeriodBar(container);
  });

  // Quick Prev Step
  document.getElementById('periodQuickPrevBtn')?.addEventListener('click', () => {
    const cur = periodStore.getPeriod();
    const stepped = stepPeriod(cur, -1);
    periodStore.setPeriod(stepped);
  });

  // Quick Next Step
  document.getElementById('periodQuickNextBtn')?.addEventListener('click', () => {
    const cur = periodStore.getPeriod();
    const stepped = stepPeriod(cur, 1);
    periodStore.setPeriod(stepped);
  });

  // Calendar Month Nav
  document.getElementById('periodCalPrevMonth')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calBaseMonth.month === 0) {
      calBaseMonth.year--;
      calBaseMonth.month = 11;
    } else {
      calBaseMonth.month--;
    }
    renderPeriodBar(container);
  });

  document.getElementById('periodCalNextMonth')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calBaseMonth.month === 11) {
      calBaseMonth.year++;
      calBaseMonth.month = 0;
    } else {
      calBaseMonth.month++;
    }
    renderPeriodBar(container);
  });

  // Preset buttons
  container.querySelectorAll('.period-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const presetKey = btn.getAttribute('data-preset');
      const presets = getPresets();
      if (presetKey && presets[presetKey]) {
        const pr = presets[presetKey];
        draftPeriod.preset = presetKey;
        draftPeriod.from = pr.from;
        draftPeriod.to = pr.to;

        const p = parseISODateParts(pr.from);
        if (p) calBaseMonth = { year: p.year, month: p.month };

        renderPeriodBar(container);
      } else if (presetKey === 'custom') {
        draftPeriod.preset = 'custom';
        renderPeriodBar(container);
      }
    });
  });

  // GST Month Selector
  const gstSelect = document.getElementById('periodGstMonthSelect');
  gstSelect?.addEventListener('change', (e) => {
    const val = e.target.value; // e.g. "2026-09"
    if (val) {
      const [y, m] = val.split('-').map(Number);
      const gstPeriod = getGSTMonthPeriod(y, m);
      draftPeriod.preset = 'custom';
      draftPeriod.from = gstPeriod.from;
      draftPeriod.to = gstPeriod.to;
      calBaseMonth = { year: y, month: m - 1 };
      renderPeriodBar(container);
    }
  });

  // Calendar Day Clicks (Range selection)
  let isSelectingTo = false;
  container.querySelectorAll('.period-cal-day[data-date]').forEach(dayEl => {
    dayEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const clickedDate = dayEl.getAttribute('data-date');
      draftPeriod.preset = 'custom';

      if (!draftPeriod.from || (draftPeriod.from && draftPeriod.to && draftPeriod.from !== draftPeriod.to)) {
        // Start new range selection
        draftPeriod.from = clickedDate;
        draftPeriod.to = clickedDate;
        isSelectingTo = true;
      } else if (isSelectingTo) {
        if (clickedDate < draftPeriod.from) {
          draftPeriod.to = draftPeriod.from;
          draftPeriod.from = clickedDate;
        } else {
          draftPeriod.to = clickedDate;
        }
        isSelectingTo = false;
      }
      renderPeriodBar(container);
    });
  });

  // Debounced Date Inputs
  let debounceTimer = null;
  const inputFrom = document.getElementById('periodInputFrom');
  const inputTo = document.getElementById('periodInputTo');

  const handleDateInput = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (inputFrom && inputTo && inputFrom.value && inputTo.value) {
        if (inputFrom.value <= inputTo.value) {
          draftPeriod.preset = 'custom';
          draftPeriod.from = inputFrom.value;
          draftPeriod.to = inputTo.value;
          const p = parseISODateParts(draftPeriod.from);
          if (p) calBaseMonth = { year: p.year, month: p.month };
          renderPeriodBar(container);
        }
      }
    }, 250);
  };

  inputFrom?.addEventListener('input', handleDateInput);
  inputTo?.addEventListener('input', handleDateInput);

  // Compare dropdown
  const cmpSelect = document.getElementById('periodCompareSelect');
  cmpSelect?.addEventListener('change', (e) => {
    draftPeriod.compare = e.target.value;
    renderPeriodBar(container);
  });

  const cmpFromInput = document.getElementById('periodCmpFrom');
  const cmpToInput = document.getElementById('periodCmpTo');
  cmpFromInput?.addEventListener('input', () => {
    draftPeriod.compareFrom = cmpFromInput.value;
  });
  cmpToInput?.addEventListener('input', () => {
    draftPeriod.compareTo = cmpToInput.value;
  });

  // Apply Button
  document.getElementById('periodApplyBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isPopoverOpen = false;
    periodStore.setPeriod(draftPeriod);
    renderPeriodBar(container);
  });

  // Cancel Button
  document.getElementById('periodCancelBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isPopoverOpen = false;
    draftPeriod = { ...periodStore.getPeriod() };
    renderPeriodBar(container);
  });

  // Reset to default
  document.getElementById('periodResetBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isPopoverOpen = false;
    periodStore.resetToDefault();
    draftPeriod = { ...periodStore.getPeriod() };
    renderPeriodBar(container);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (isPopoverOpen && popover && !popover.contains(e.target) && e.target !== triggerBtn && !triggerBtn?.contains(e.target)) {
      isPopoverOpen = false;
      draftPeriod = { ...periodStore.getPeriod() };
      renderPeriodBar(container);
    }
  });
}

/**
 * Renders consistent Page Header Period Bar with Page Unpinning and Warning Badges
 */
export function renderPagePeriodHeader(container, pageKey, options = {}) {
  if (!container) return;

  const currentPeriod = periodStore.getPagePeriod(pageKey);
  const isPinned = periodStore.isPagePinned(pageKey);
  const presets = getPresets();
  const activePreset = presets[currentPeriod.preset];
  const displayLabel = activePreset ? activePreset.label : 'Custom Range';
  const displayRange = formatPeriodRange(currentPeriod.from, currentPeriod.to);

  container.innerHTML = `
    <div class="page-period-header">
      <div class="page-period-left">
        <span class="page-period-chip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Period: <strong>${displayLabel}</strong> (${displayRange})
        </span>

        <!-- Lock / Unlock Pin to Global -->
        <button id="pagePeriodPinBtn" class="page-period-pin-btn ${!isPinned ? 'unpinned' : ''}" title="${isPinned ? 'Following global period. Click to customize for this page.' : 'Customized for this page. Click to lock back to global.'}">
          ${isPinned ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Following Global
          ` : `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
            Custom for this page
          `}
        </button>

        ${options.hasSnapshotMetrics ? `
          <span class="period-warning-badge" title="Snapshot and cumulative metrics (such as stock on hand, open tickets, payables balance) reflect cumulative state as of ${formatDisplayDate(currentPeriod.to)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            As of ${formatDisplayDate(currentPeriod.to)}
          </span>
        ` : ''}

        ${options.dateBasisOptions && options.dateBasisOptions.length ? `
          <div style="display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; margin-left: 8px;">
            <span style="color: var(--text-dim); font-weight: 600;">Date basis:</span>
            <select id="pageDateBasisSelect" style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); font-size: 11px; padding: 2px 6px; border-radius: 4px;">
              ${options.dateBasisOptions.map(opt => `
                <option value="${opt.key}" ${opt.key === options.currentDateBasis ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
        ` : ''}
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="pageClearPeriodBtn" style="background: none; border: none; color: #38bdf8; font-size: 11.5px; cursor: pointer; text-decoration: underline;">
          Clear date filter / use All Time
        </button>
      </div>
    </div>
  `;

  // Attach pin toggle
  container.querySelector('#pagePeriodPinBtn')?.addEventListener('click', () => {
    periodStore.togglePagePin(pageKey);
    if (typeof options.onPeriodChange === 'function') {
      options.onPeriodChange(periodStore.getPagePeriod(pageKey));
    }
  });

  // Attach clear filter
  container.querySelector('#pageClearPeriodBtn')?.addEventListener('click', () => {
    const presets = getPresets();
    if (isPinned) {
      periodStore.setPeriod('all_time');
    } else {
      periodStore.setPagePeriod(pageKey, presets.all_time);
    }
    if (typeof options.onPeriodChange === 'function') {
      options.onPeriodChange(periodStore.getPagePeriod(pageKey));
    }
  });

  // Attach date basis select
  container.querySelector('#pageDateBasisSelect')?.addEventListener('change', (e) => {
    if (typeof options.onDateBasisChange === 'function') {
      options.onDateBasisChange(e.target.value);
    }
  });
}

/**
 * Small chip helper for chart card headers
 */
export function renderChartPeriodBadge(period) {
  const p = period || periodStore.getPeriod();
  const presets = getPresets();
  const activePreset = presets[p.preset];
  const label = activePreset ? activePreset.label : formatPeriodRange(p.from, p.to);
  return `<span style="font-size: 10.5px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; padding: 2px 7px; border-radius: 4px; font-weight: 600;">Period: ${label}</span>`;
}
