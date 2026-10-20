// Global Error Boundary & Observability Handler
import { redactSensitiveData } from './security.js';

class ErrorHandler {
  constructor() {
    this.logs = [];
    this.maxLogs = 50;
    this.listeners = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Window Uncaught Error Listener
    window.addEventListener('error', (event) => {
      this.captureException(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled Promise Rejection Listener
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
        source: 'unhandledrejection'
      });
    });
  }

  captureException(error, context = {}) {
    const correlationId = 'err_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const sanitizedContext = redactSensitiveData(context);
    
    const entry = {
      id: correlationId,
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown runtime anomaly',
      name: error?.name || 'Error',
      context: sanitizedContext,
      environment: import.meta.env?.MODE || 'development'
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Never leak stack trace to console in production
    if (import.meta.env?.MODE !== 'production') {
      console.error(`[ErrorBoundary ${correlationId}]`, error);
    } else {
      console.warn(`[App Alert ${correlationId}] A system error was intercepted safely.`);
    }

    this._notifyListeners(entry);
    return correlationId;
  }

  showFriendlyErrorBanner(title, message, correlationId) {
    const existing = document.getElementById('globalAppErrorBanner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'globalAppErrorBanner';
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background: #18223c;
      border: 1px solid #ef4444;
      border-left: 5px solid #ef4444;
      border-radius: 8px;
      padding: 14px 18px;
      max-width: 420px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      gap: 6px;
      animation: slideUp 0.3s ease;
    `;

    banner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; color: #f87171; font-size: 13.5px;">⚠️ ${title || 'Operation Interrupted'}</span>
        <button id="closeErrBannerBtn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;">✕</button>
      </div>
      <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">${message || 'An unexpected issue occurred while processing your request. Please try again or contact support.'}</p>
      ${correlationId ? `<span style="font-size: 10px; color: #64748b; font-family: monospace;">Ref ID: ${correlationId}</span>` : ''}
    `;

    document.body.appendChild(banner);
    document.getElementById('closeErrBannerBtn')?.addEventListener('click', () => banner.remove());
    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 8000);
  }

  getRecentLogs() {
    return [...this.logs];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners(entry) {
    this.listeners.forEach(cb => {
      try { cb(entry); } catch (e) { /* silent */ }
    });
  }
}

export const errorHandler = new ErrorHandler();
