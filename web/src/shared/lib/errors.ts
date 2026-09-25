/**
 * What a person reads when something fails: plain words about what happened and what
 * to do, never a status code, an exception or a field name. The same rules as the
 * app's src/shared/lib/errors.ts; every error on the site comes through here.
 */
import { ApiError } from './api/client';

const OFFLINE = 'You seem to be offline. Check your connection and try again.';
const SLOW = 'That took too long. Check your connection and try again.';
const OURS = 'Something went wrong on our side. Please try again in a moment.';

/** Text written for a developer: codes, stack traces, raw data. */
const TECHNICAL =
  /status code|request failed|network error|exception|traceback|undefined|\bnull\b|\bNaN\b|json|fetch|\buuid\b|\bpk\b|[{}<>[\]]|^\s*\d{3}\b|^[a-z]+(_[a-z]+)+$/i;

/**
 * The server's own message when it's written for people (the API sends a sentence
 * for anything the person can fix), otherwise `fallback`: what this page was trying
 * to do, in its own words.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') return SLOW;
  // fetch rejects with a TypeError when there's no connection at all.
  if (error instanceof TypeError) return OFFLINE;
  if (!(error instanceof ApiError)) return fallback;
  if (error.status >= 500) return OURS;
  const said = error.data?.message ?? error.data?.detail;
  return typeof said === 'string' && said.trim() && !TECHNICAL.test(said) ? said : fallback;
}

/** A page that isn't there, as opposed to one that failed to load. */
export function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}
