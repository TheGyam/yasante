/**
 * Policy documents and the version users are consenting to.
 *
 * Bump POLICY_VERSION whenever the published terms or privacy policy change:
 * every consent record stores the version it was given against, so we can always
 * show what a user actually agreed to.
 */
export const POLICY_VERSION = '2026-10-23';
/** What changed in this version, in a line: the "We've updated" notice says it. */
export const POLICY_CHANGES =
  'They now cover sharing collections and care plans: what others see, tagging along and making your own version.';

export const TERMS_URL = 'https://yasante.com/terms';
export const PRIVACY_URL = 'https://yasante.com/privacy';
/** In the app, policies open on their own screen (see app/policy/[type]). */
export const TERMS_ROUTE = '/policy/terms';
export const PRIVACY_ROUTE = '/policy/privacy';
export const SUPPORT_EMAIL = 'support@yasante.com';
