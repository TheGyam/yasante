/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required field
 */
export function isRequired(value: any): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Validate minimum length
 */
export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

/**
 * Validate maximum length
 */
export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

/**
 * Validate date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Check password strength
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  let strength = 0;

  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Character variety checks
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 3) return 'fair';
  if (strength <= 4) return 'good';
  return 'strong';
}

/** The password rules. The validator and the on-screen checklist both read this list. */
export const PASSWORD_RULES = [
  { label: '8+ characters', error: 'Use at least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase', error: 'Add an uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase', error: 'Add a lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', error: 'Add a number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Symbol', error: 'Add a symbol', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors = PASSWORD_RULES.filter(rule => !rule.test(password)).map(rule => rule.error);
  return { isValid: errors.length === 0, errors };
}
