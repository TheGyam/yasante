/**
 * Browser storage that never throws. A private window, blocked site data or a full
 * quota makes storage fail; the site carries on without it.
 */
type Area = 'local' | 'session';

function area(which: Area): Storage | undefined {
  try {
    return which === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readJson<T>(key: string, which: Area = 'local'): T | undefined {
  try {
    const text = area(which)?.getItem(key);
    return text ? (JSON.parse(text) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(key: string, value: unknown, which: Area = 'local') {
  try {
    if (value === undefined) area(which)?.removeItem(key);
    else area(which)?.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved: the page still works, it just won't remember.
  }
}
