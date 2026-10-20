// Central Security & XSS Sanitization Service
import DOMPurify from 'dompurify';

/**
 * Encodes special characters to HTML entities to prevent XSS injection.
 * Use this on all user-controlled text inserted into template strings.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes rich HTML fragments via DOMPurify.
 * Safe for cases where HTML tags must be preserved.
 */
export function sanitizeHtml(dirtyHtml, options = {}) {
  if (!dirtyHtml) return '';
  const str = String(dirtyHtml);

  // If DOMPurify.sanitize is directly available (in browser)
  if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(str, {
      ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'code', 'pre'],
      ALLOWED_ATTR: options.allowedAttr || ['href', 'target', 'class', 'style', 'title'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
  }

  // If DOMPurify is a factory (e.g. In Node/Vitest test environment without window)
  if (typeof DOMPurify === 'function' && typeof window !== 'undefined') {
    const purifier = DOMPurify(window);
    if (purifier && typeof purifier.sanitize === 'function') {
      return purifier.sanitize(str);
    }
  }

  // Fallback safe regex-based tag cleaner if running headless without DOM
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/**
 * Mask sensitive values like API keys, client secrets or passwords.
 * Example: 'eyJhbGciOiJIUzI1Ni...' -> '••••25Ni'
 */
export function maskSecret(secret, visibleChars = 4) {
  if (!secret) return 'Not configured';
  const str = String(secret).trim();
  if (str.length <= visibleChars) return '••••';
  const last = str.slice(-visibleChars);
  return `••••${last}`;
}

/**
 * Redact sensitive PII and tokens from log objects.
 */
export function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = ['password', 'secret', 'token', 'authorization', 'apikey', 'servicerolekey', 'service_role_key', 'private_key'];

  for (const key of Object.keys(cloned)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some(k => keyLower.includes(k))) {
      cloned[key] = '[REDACTED]';
    } else if (typeof cloned[key] === 'object' && cloned[key] !== null) {
      cloned[key] = redactSensitiveData(cloned[key]);
    }
  }
  return cloned;
}
