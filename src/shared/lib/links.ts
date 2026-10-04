/** The public site. Links to it open the app when it's installed. */
export const PUBLIC_HOSTS = ['yasante.com', 'www.yasante.com'];

/**
 * Paths that belong to the site or the app, never to a stylist. Handles can't
 * take these, so `yasante.com/{handle}` is never ambiguous.
 */
export const NOT_HANDLES = new Set([
  // The site's own pages.
  'manage',
  'looks',
  'invite',
  'auth',
  'settings',
  'terms',
  'stylist-terms',
  'privacy',
  'guidelines',
  'help',
  'support',
  'about',
  'waitlist',
  'styles',
  'areas',
  'api',
  // Every screen the app opens by path, so yasante://bookings is her bookings, not a
  // stylist called "bookings". The server reserves the same words (NOT_HANDLES).
  'availability',
  'book',
  'bookings',
  'care-plans',
  'check-in',
  'close-out',
  'collections',
  'edit-profile',
  'hair-profile',
  'menu',
  'numbers',
  'onboarding',
  'payment-methods',
  'portfolio',
  'requests',
  'review',
  'shelf',
  'stylist',
  'stylist-setup',
  'username',
  'policy',
  'search',
  'saved',
  'insights',
  'who',
  'work',
  'delete-account',
  // Tabs.
  'home',
  'planner',
  'profile',
  'today',
  'account',
  'learn',
  'content',
]);

const HANDLE = /^[a-z0-9][a-z0-9._]*$/;
const POLICY_PAGES = new Set(['terms', 'privacy', 'guidelines', 'stylist-terms']);

/**
 * Where an incoming link should land in the app. A yasante.com link and the
 * app's own path read the same: the site's pages map one-to-one onto screens,
 * and a bare `/{handle}` — the link in her bio — opens her page.
 */
export function routeForLink(link: string): string {
  // Parsed by hand rather than with URL, whose getters React Native hasn't always had.
  let path = link;
  const full = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^#]*)/i.exec(link);
  if (full) {
    const [, scheme, host, rest] = full;
    if (/^https?$/i.test(scheme)) {
      if (!PUBLIC_HOSTS.includes(host.toLowerCase())) return link;
      path = rest || '/';
    } else {
      // yasante://looks/123 — the host is the first segment.
      path = `/${host}${rest}`;
    }
  }

  const [pathname, search = ''] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);
  const query = search ? `?${search}` : '';

  // The site's policy pages have their own screen in the app.
  const policy = segments.length === 1 && POLICY_PAGES.has(segments[0].toLowerCase());
  if (policy) return `/policy/${segments[0].toLowerCase()}`;

  if (segments.length === 1) {
    const handle = segments[0].toLowerCase();
    if (!NOT_HANDLES.has(handle) && HANDLE.test(handle)) return `/stylist/${handle}${query}`;
  }
  return `/${segments.join('/')}${query}`;
}
