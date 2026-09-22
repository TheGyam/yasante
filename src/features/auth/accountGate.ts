// Guests can look at everything; these need an account, so a guest's tap opens sign-up.
// Keep in step with the account-only guard in app/_layout.tsx.
const ACCOUNT_ONLY =
  /^\/(book|bookings|waitlist|review|check-in|close-out|requests\/[^/?]+|collections|shelf|care-plans|edit-profile|settings\/report|stylist-setup|availability|payment-methods|numbers|menu|portfolio\/import|looks\/(new|options|mine))(\/|\?|$)/;

/** Where a guest goes instead of `href`, or undefined if anyone may open it. */
export function guestRedirect(href: unknown): string | undefined {
  const path = typeof href === 'string' ? href : (href as { pathname?: string } | null)?.pathname;
  return path && ACCOUNT_ONLY.test(path) ? '/auth/join' : undefined;
}
