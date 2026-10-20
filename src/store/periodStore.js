// Global Period Store (Observable with URL Sync, LocalStorage Fallback & Per-Page Overrides)
import {
  getPresets,
  previousPeriod,
  samePeriodLastYear,
  formatToISTDateString,
  getNow,
  validatePeriod
} from '../services/periodService.js';

const STORAGE_KEY = 'ELIZA_GLOBAL_PERIOD';

class PeriodStore {
  constructor() {
    this.subscribers = new Set();
    this.pageOverrides = new Map(); // pageKey -> { pinned: boolean, period: Period }
    this.state = this._initFromEnvironment();

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this._handlePopState();
      });
    }
  }

  _initFromEnvironment() {
    const presets = getPresets();
    const defaultPeriod = {
      preset: 'this_month',
      from: presets.this_month.from,
      to: presets.this_month.to,
      compare: 'none',
      compareFrom: null,
      compareTo: null
    };

    // 1. Try URL Query Parameters
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFrom = urlParams.get('from');
      const urlTo = urlParams.get('to');
      const urlPreset = urlParams.get('preset');
      const urlCmp = urlParams.get('cmp');
      const urlCfrom = urlParams.get('cfrom');
      const urlCto = urlParams.get('cto');

      if (urlFrom && urlTo) {
        const period = {
          preset: urlPreset || (presets[urlPreset] ? urlPreset : 'custom'),
          from: urlFrom,
          to: urlTo,
          compare: urlCmp || 'none',
          compareFrom: urlCfrom || null,
          compareTo: urlCto || null
        };
        const val = validatePeriod(period, { allowFuture: true });
        if (val.valid) {
          this._computeComparisonRange(period);
          return period;
        }
      }
    }

    // 2. Try LocalStorage Fallback
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.preset && presets[parsed.preset] && parsed.preset !== 'custom') {
            // Re-evaluate preset dates in case month/day rolled over
            const dynamicPreset = presets[parsed.preset];
            parsed.from = dynamicPreset.from;
            parsed.to = dynamicPreset.to;
          }
          const val = validatePeriod(parsed, { allowFuture: true });
          if (val.valid) {
            this._computeComparisonRange(parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved period from localStorage', e);
      }
    }

    // 3. Fallback: This Month
    this._computeComparisonRange(defaultPeriod);
    return defaultPeriod;
  }

  _computeComparisonRange(period) {
    if (!period) return;
    if (period.compare === 'previous_period') {
      const prev = previousPeriod(period);
      if (prev) {
        period.compareFrom = prev.from;
        period.compareTo = prev.to;
      }
    } else if (period.compare === 'previous_year') {
      const prev = samePeriodLastYear(period);
      if (prev) {
        period.compareFrom = prev.from;
        period.compareTo = prev.to;
      }
    } else if (period.compare === 'none') {
      period.compareFrom = null;
      period.compareTo = null;
    }
  }

  _syncToEnvironment(replaceUrl = true) {
    // 1. LocalStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Failed to save period to localStorage', e);
      }
    }

    // 2. URL Sync (Global params)
    if (typeof window !== 'undefined' && window.location) {
      const url = new URL(window.location.href);
      url.searchParams.set('from', this.state.from);
      url.searchParams.set('to', this.state.to);
      if (this.state.preset) url.searchParams.set('preset', this.state.preset);
      else url.searchParams.delete('preset');

      if (this.state.compare && this.state.compare !== 'none') {
        url.searchParams.set('cmp', this.state.compare);
        if (this.state.compareFrom) url.searchParams.set('cfrom', this.state.compareFrom);
        if (this.state.compareTo) url.searchParams.set('cto', this.state.compareTo);
      } else {
        url.searchParams.delete('cmp');
        url.searchParams.delete('cfrom');
        url.searchParams.delete('cto');
      }

      if (replaceUrl) {
        window.history.replaceState({}, '', url.toString());
      } else {
        window.history.pushState({}, '', url.toString());
      }
    }
  }

  _handlePopState() {
    const updated = this._initFromEnvironment();
    this.state = updated;
    this._notifySubscribers();
  }

  _notifySubscribers() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.getPeriod());
      } catch (e) {
        console.error('Error in period subscriber', e);
      }
    });
  }

  /**
   * Returns current global period copy.
   */
  getPeriod() {
    return { ...this.state };
  }

  /**
   * Sets the global period.
   * Can pass preset name ('last_month') or partial object { from, to, preset, compare, etc. }
   */
  setPeriod(periodOrPreset) {
    let nextPeriod = null;
    const presets = getPresets();

    if (typeof periodOrPreset === 'string') {
      if (presets[periodOrPreset]) {
        nextPeriod = {
          preset: periodOrPreset,
          from: presets[periodOrPreset].from,
          to: presets[periodOrPreset].to,
          compare: this.state.compare || 'none',
          compareFrom: null,
          compareTo: null
        };
      } else {
        throw new Error(`Unknown period preset: ${periodOrPreset}`);
      }
    } else {
      nextPeriod = {
        ...this.state,
        ...periodOrPreset
      };
    }

    const validation = validatePeriod(nextPeriod, { allowFuture: true });
    if (!validation.valid) {
      console.warn('Invalid period ignored:', validation.error);
      return false;
    }

    this._computeComparisonRange(nextPeriod);
    this.state = nextPeriod;
    this._syncToEnvironment();
    this._notifySubscribers();
    return true;
  }

  /**
   * Quick toggle / set comparison mode
   */
  setCompare(compareType, customFrom = null, customTo = null) {
    const next = {
      ...this.state,
      compare: compareType
    };
    if (compareType === 'custom' && customFrom && customTo) {
      next.compareFrom = customFrom;
      next.compareTo = customTo;
    }
    this._computeComparisonRange(next);
    this.state = next;
    this._syncToEnvironment();
    this._notifySubscribers();
  }

  /**
   * Resets to default preset ("this_month")
   */
  resetToDefault() {
    return this.setPeriod('this_month');
  }

  // ------------------------------------------------------------------
  // Per-Page Overrides (Unpin / Pin to Global)
  // ------------------------------------------------------------------
  getPagePeriod(pageKey) {
    if (!pageKey) return this.getPeriod();
    const override = this.pageOverrides.get(pageKey);
    if (override && !override.pinned) {
      return { ...override.period };
    }
    return this.getPeriod();
  }

  isPagePinned(pageKey) {
    if (!pageKey) return true;
    const override = this.pageOverrides.get(pageKey);
    return !override || override.pinned !== false;
  }

  setPagePeriod(pageKey, period) {
    if (!pageKey) return;
    this._computeComparisonRange(period);
    this.pageOverrides.set(pageKey, {
      pinned: false,
      period: { ...period }
    });
    this._notifySubscribers();
  }

  resetPageToGlobal(pageKey) {
    if (!pageKey) return;
    this.pageOverrides.delete(pageKey);
    this._notifySubscribers();
  }

  togglePagePin(pageKey) {
    if (!pageKey) return;
    if (this.isPagePinned(pageKey)) {
      // Unpin: copy current global period to local override
      this.setPagePeriod(pageKey, this.getPeriod());
    } else {
      // Pin: remove override
      this.resetPageToGlobal(pageKey);
    }
  }

  /**
   * Subscribe to period changes.
   * Returns an unsubscribe function.
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
}

export const periodStore = new PeriodStore();
