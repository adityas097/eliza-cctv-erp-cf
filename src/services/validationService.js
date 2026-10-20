// Central Input Validation Service - Single Source of Truth for Forms & Payloads

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE_INDIAN_REGEX: /^(?:(?:\+|00)?91[\s-]?)?0?[6-9]\d{9}$/,
  GSTIN_REGEX: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN_REGEX: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  DATE_ISO_REGEX: /^\d{4}-\d{2}-\d{2}$/
};

export class ValidationService {
  /**
   * Validate email address
   */
  static validateEmail(email, required = true) {
    if (!email || !String(email).trim()) {
      return required ? { valid: false, error: 'Email address is required.' } : { valid: true };
    }
    const clean = String(email).trim().toLowerCase();
    if (clean.length > 254) {
      return { valid: false, error: 'Email exceeds maximum allowable length of 254 characters.' };
    }
    if (!VALIDATION_RULES.EMAIL_REGEX.test(clean)) {
      return { valid: false, error: 'Please enter a valid email address (e.g., name@company.com).' };
    }
    return { valid: true, value: clean };
  }

  /**
   * Validate Indian mobile / telephone number
   */
  static validatePhone(phone, required = true) {
    if (!phone || !String(phone).trim()) {
      return required ? { valid: false, error: 'Phone number is required.' } : { valid: true };
    }
    const clean = String(phone).replace(/[\s\-()]/g, '');
    if (!VALIDATION_RULES.PHONE_INDIAN_REGEX.test(clean)) {
      return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).' };
    }
    return { valid: true, value: clean };
  }

  /**
   * Validate Indian GSTIN (Goods and Services Tax Identification Number)
   */
  static validateGstin(gstin, required = false) {
    if (!gstin || !String(gstin).trim()) {
      return required ? { valid: false, error: 'GSTIN is required.' } : { valid: true };
    }
    const clean = String(gstin).trim().toUpperCase();
    if (!VALIDATION_RULES.GSTIN_REGEX.test(clean)) {
      return { valid: false, error: 'Invalid GSTIN statutory format. Must be 15 alphanumeric characters (e.g., 06HHQPS1919L1ZJ).' };
    }
    return { valid: true, value: clean };
  }

  /**
   * Validate Indian PAN (Permanent Account Number)
   */
  static validatePan(pan, required = false) {
    if (!pan || !String(pan).trim()) {
      return required ? { valid: false, error: 'PAN is required.' } : { valid: true };
    }
    const clean = String(pan).trim().toUpperCase();
    if (!VALIDATION_RULES.PAN_REGEX.test(clean)) {
      return { valid: false, error: 'Invalid PAN format. Must be 10 characters (5 letters, 4 digits, 1 letter, e.g., HHQPS1919L).' };
    }
    return { valid: true, value: clean };
  }

  /**
   * Validate financial amount or numeric figure
   */
  static validateAmount(amount, { min = 0, max = 1000000000, allowZero = true, required = true } = {}) {
    if (amount === null || amount === undefined || amount === '') {
      return required ? { valid: false, error: 'Amount is required.' } : { valid: true };
    }
    const num = Number(amount);
    if (isNaN(num)) {
      return { valid: false, error: 'Please enter a valid numeric value.' };
    }
    if (!allowZero && num === 0) {
      return { valid: false, error: 'Amount cannot be zero.' };
    }
    if (num < min) {
      return { valid: false, error: `Amount cannot be less than ${min}.` };
    }
    if (num > max) {
      return { valid: false, error: `Amount cannot exceed ${max.toLocaleString('en-IN')}.` };
    }
    return { valid: true, value: num };
  }

  /**
   * Validate ISO date string (YYYY-MM-DD)
   */
  static validateDate(dateStr, { minYear = 2020, maxYear = 2035, required = true } = {}) {
    if (!dateStr || !String(dateStr).trim()) {
      return required ? { valid: false, error: 'Date is required.' } : { valid: true };
    }
    const clean = String(dateStr).trim();
    if (!VALIDATION_RULES.DATE_ISO_REGEX.test(clean)) {
      return { valid: false, error: 'Invalid date format. Expected YYYY-MM-DD.' };
    }
    const parsed = new Date(clean);
    if (isNaN(parsed.getTime())) {
      return { valid: false, error: 'Invalid calendar date.' };
    }
    const year = parsed.getFullYear();
    if (year < minYear || year > maxYear) {
      return { valid: false, error: `Date must be between year ${minYear} and ${maxYear}.` };
    }
    return { valid: true, value: clean };
  }

  /**
   * Validate safe text field (prevents script injection attempts and control characters)
   */
  static validateText(text, { minLength = 1, maxLength = 255, required = true, fieldName = 'Field' } = {}) {
    if (!text || !String(text).trim()) {
      return required ? { valid: false, error: `${fieldName} is required.` } : { valid: true, value: '' };
    }
    const clean = String(text).trim();
    if (clean.length < minLength) {
      return { valid: false, error: `${fieldName} must be at least ${minLength} characters.` };
    }
    if (clean.length > maxLength) {
      return { valid: false, error: `${fieldName} cannot exceed ${maxLength} characters.` };
    }
    return { valid: true, value: clean };
  }
}
