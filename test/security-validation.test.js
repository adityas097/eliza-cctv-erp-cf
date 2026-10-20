// Security & Input Validation Unit Tests
import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeHtml, maskSecret, redactSensitiveData } from '../src/services/security.js';
import { ValidationService } from '../src/services/validationService.js';

describe('Security & XSS Prevention Service', () => {
  it('should escape HTML control characters to prevent script injection', () => {
    const maliciousInput = '<script>alert("XSS")</script>&foo=\'bar\'';
    const escaped = escapeHtml(maliciousInput);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#039;');
    expect(escaped).toContain('&amp;');
  });

  it('should sanitize rich text while removing malicious attributes and elements', () => {
    const dirty = '<p>Normal text <img src=x onerror=alert(1)> <script>evil()</script> <b>Bold</b></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<b>Bold</b>');
    expect(clean).toContain('<p>Normal text');
  });

  it('should mask sensitive keys and tokens safely', () => {
    expect(maskSecret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdef12345')).toBe('••••2345');
    expect(maskSecret('secret')).toBe('••••cret');
    expect(maskSecret(null)).toBe('Not configured');
    expect(maskSecret('')).toBe('Not configured');
  });

  it('should redact sensitive properties from log objects', () => {
    const logObj = {
      action: 'LOGIN',
      user: 'aditya',
      password: 'superSecretPassword',
      metadata: {
        apiKey: '123456789',
        normalInfo: 'active'
      }
    };
    const redacted = redactSensitiveData(logObj);
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.metadata.apiKey).toBe('[REDACTED]');
    expect(redacted.metadata.normalInfo).toBe('active');
  });
});

describe('ValidationService Rules', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(ValidationService.validateEmail('info@elizainfotech.com').valid).toBe(true);
      expect(ValidationService.validateEmail('aditya.sharma+ops@sub.domain.co.in').valid).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(ValidationService.validateEmail('invalid-email').valid).toBe(false);
      expect(ValidationService.validateEmail('@nodomain.com').valid).toBe(false);
      expect(ValidationService.validateEmail('').valid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('accepts valid Indian phone numbers', () => {
      expect(ValidationService.validatePhone('+91 89300-82398').valid).toBe(true);
      expect(ValidationService.validatePhone('9416022334').valid).toBe(true);
      expect(ValidationService.validatePhone('09812011223').valid).toBe(true);
    });

    it('rejects invalid phones', () => {
      expect(ValidationService.validatePhone('12345').valid).toBe(false);
      expect(ValidationService.validatePhone('4930082398').valid).toBe(false); // starts with 4
    });
  });

  describe('validateGstin', () => {
    it('accepts valid 15-character statutory GSTIN', () => {
      expect(ValidationService.validateGstin('06HHQPS1919L1ZJ').valid).toBe(true);
    });

    it('rejects invalid GSTIN format', () => {
      expect(ValidationService.validateGstin('06HHQPS1919L1Z').valid).toBe(false); // 14 chars
      expect(ValidationService.validateGstin('INVALIDGST12345').valid).toBe(false);
    });
  });

  describe('validatePan', () => {
    it('accepts valid 10-character PAN', () => {
      expect(ValidationService.validatePan('HHQPS1919L').valid).toBe(true);
    });

    it('rejects invalid PAN', () => {
      expect(ValidationService.validatePan('HHQPS1919').valid).toBe(false);
      expect(ValidationService.validatePan('1234567890').valid).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('accepts valid amounts', () => {
      expect(ValidationService.validateAmount(5000).valid).toBe(true);
      expect(ValidationService.validateAmount('12500.50').valid).toBe(true);
      expect(ValidationService.validateAmount(0, { allowZero: true }).valid).toBe(true);
    });

    it('rejects negative or invalid amounts', () => {
      expect(ValidationService.validateAmount(-50).valid).toBe(false);
      expect(ValidationService.validateAmount('abc').valid).toBe(false);
      expect(ValidationService.validateAmount(0, { allowZero: false }).valid).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
      expect(ValidationService.validateDate('2026-10-20').valid).toBe(true);
    });

    it('rejects malformed dates', () => {
      expect(ValidationService.validateDate('20-10-2026').valid).toBe(false);
      expect(ValidationService.validateDate('invalid-date').valid).toBe(false);
      expect(ValidationService.validateDate('1990-01-01', { minYear: 2020 }).valid).toBe(false);
    });
  });
});
