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
 * How strong a password is, by length: what makes a password hard to guess (NIST SP
 * 800-63B). Mixing in capitals, numbers and symbols mostly produces "Password1!".
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';
  if (password.length < 12) return 'fair';
  if (password.length < 16) return 'good';
  return 'strong';
}

/** Shown under a new password: long and memorable beats short and complicated. */
export const PASSWORD_HINT = 'Three random words work well, like “teapot river mango”.';

/**
 * The password rules. The validator and the on-screen checklist both read this list.
 * Length only, as current guidance says; the server also turns away common passwords.
 */
export const PASSWORD_RULES = [
  {
    label: '8+ characters',
    error: 'Use at least 8 characters',
    test: (p: string) => p.length >= 8,
  },
] as const;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors = PASSWORD_RULES.filter(rule => !rule.test(password)).map(rule => rule.error);
  return { isValid: errors.length === 0, errors };
}
