/**
 * Tells the server something broke in someone's browser, so it shows on the staff Errors
 * page. At most a handful per page load, never in development, and never the query
 * string: links can carry tokens.
 */

const LIMIT = 5;

let endpoint = '';
let platform = '';
let sent = 0;
let enabled = false;

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

function browser() {
  const agent = navigator.userAgent;
  const name = /Edg\//.test(agent)
    ? 'Edge'
    : /Chrome\//.test(agent)
      ? 'Chrome'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Safari\//.test(agent)
          ? 'Safari'
          : 'Other';
  const device =
    /iPhone|iPad|Android/.exec(agent)?.[0] ??
    (/Mac OS X/.test(agent) ? 'Mac' : /Windows/.test(agent) ? 'Windows' : '');
  return [name, device].filter(Boolean).join(' on ');
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (!enabled || sent >= LIMIT) return;
  sent += 1;
  const failure = error instanceof Error ? error : new Error(String(error));
  const body = JSON.stringify({
    kind: 'crash',
    message: (failure.message || 'No message').slice(0, 2000),
    stack: (failure.stack ?? '').slice(0, 20000),
    platform,
    app_version: APP_VERSION,
    context: { path: location.pathname, browser: browser(), ...context },
  });
  // Signed-in staff use a session, so Django wants its CSRF token; the site has none.
  const csrf = /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)?.[1];
  // keepalive lets the report finish even if the page is being left.
  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrf && { 'X-CSRFToken': csrf }) },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {});
}

/** Starts reporting for this page. `force` is for tests; development never reports. */
export function startErrorReports(options: {
  endpoint: string;
  platform: string;
  force?: boolean;
}) {
  endpoint = options.endpoint;
  platform = options.platform;
  sent = 0;
  enabled = options.force ?? !import.meta.env.DEV;
  if (!enabled) return;
  window.addEventListener('error', event => {
    // A script or stylesheet that failed to load has no error object, only a target.
    if (event.error) reportError(event.error);
  });
  window.addEventListener('unhandledrejection', event =>
    reportError(event.reason, { unhandled: true })
  );
  // A page's code missing after a deploy: reload once, then report if it still fails.
  window.addEventListener('vite:preloadError', event => {
    if (!sessionStorage.getItem('reloaded-for-chunk')) {
      sessionStorage.setItem('reloaded-for-chunk', '1');
      location.reload();
    } else
      reportError((event as Event & { payload?: unknown }).payload ?? 'Page code failed to load', {
        chunk: true,
      });
  });
}
