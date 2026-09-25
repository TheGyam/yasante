/**
 * The same rules as the app's sign-up (src/shared/utils/validation.ts at the repo
 * root), so a password that works in one works in the other.
 */
export const PASSWORD_RULES = [
  {
    label: '8+ characters',
    error: 'Use at least 8 characters',
    test: (p: string) => p.length >= 8,
  },
  { label: 'Uppercase', error: 'Add an uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase', error: 'Add a lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', error: 'Add a number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Symbol', error: 'Add a symbol', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

/** The first thing wrong with a password, or undefined when it's fine. */
export function passwordProblem(password: string) {
  return PASSWORD_RULES.find(rule => !rule.test(password))?.error;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * The terms and privacy version she agrees to, the app's POLICY_VERSION
 * (src/shared/config/policies.ts). A test holds the two equal.
 */
export const POLICY_VERSION = '2026-09';
