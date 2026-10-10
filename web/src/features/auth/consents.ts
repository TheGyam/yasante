import { api } from '@/shared/lib/api/client';
import { readJson, writeJson } from '@/shared/lib/storage';
import { POLICY_VERSION, STYLIST_TERMS_VERSION } from './rules';

/**
 * What she agreed to at sign-up, recorded against her account (POST /api/consents/,
 * the same append-only record the app writes). Kept until the server has it, so a
 * dropped connection never loses a consent: the next signed-in page sends it again.
 */
const KEY = 'yasante.pending-consents';

interface Consent {
  purpose: 'terms' | 'privacy' | 'stylist_terms';
  granted: true;
  policyVersion: string;
  recordedAt: string;
  source: 'web';
}

export function consentsAtSignup(stylist = true, now = new Date()): Consent[] {
  const recordedAt = now.toISOString();
  const all: Consent[] = [
    { purpose: 'terms', granted: true, policyVersion: POLICY_VERSION, recordedAt, source: 'web' },
    { purpose: 'privacy', granted: true, policyVersion: POLICY_VERSION, recordedAt, source: 'web' },
    {
      purpose: 'stylist_terms',
      granted: true,
      policyVersion: STYLIST_TERMS_VERSION,
      recordedAt,
      source: 'web',
    },
  ];
  // A client agrees to the terms and privacy policy; the stylist terms are a stylist's.
  return stylist ? all : all.filter(consent => consent.purpose !== 'stylist_terms');
}

/** Remembers the consents for this account, then tries to send them. */
export function recordConsents(accountId: string, consents: Consent[]) {
  writeJson(KEY, { accountId, consents });
  return flushConsents(accountId);
}

/** Sends any consents still waiting for this account. Quietly retried later on failure. */
export async function flushConsents(accountId: string) {
  const pending = readJson<{ accountId: string; consents: Consent[] }>(KEY);
  if (!pending || pending.accountId !== accountId) return;
  try {
    await api.post('/consents/', { consents: pending.consents });
    writeJson(KEY, undefined);
  } catch {
    // Kept for the next try.
  }
}
