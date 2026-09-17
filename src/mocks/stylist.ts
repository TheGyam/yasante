import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

/** Handles already in use, plus the ones we keep for ourselves. */
const RESERVED = new Set(['yasante', 'admin', 'help', 'support', 'stylist', 'hair']);

const taken = (handle: string) =>
  RESERVED.has(handle) || [...db.stylists.values()].some(s => s.handle === handle);

defineMocks({
  'GET /api/stylists/handle-available/': ({ query }) => {
    const handle = (query.get('handle') ?? '').toLowerCase();
    if (!taken(handle)) return { handle, available: true };
    return {
      handle,
      available: false,
      suggestions: [`${handle}hair`, `${handle}.london`, `${handle}studio`].filter(s => !taken(s)),
    };
  },

  'GET /api/stylists/me/': request => {
    const profile = db.stylists.get(requireAccount(request));
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    return profile;
  },

  'GET /api/stylists/me/summary/': request => {
    const accountId = requireAccount(request);
    return { pendingRequests: db.pendingRequests.get(accountId) ?? 0, appointmentsToday: 0 };
  },

  'POST /api/stylists/': request => {
    const accountId = requireAccount(request);
    if (db.stylists.has(accountId)) throw new MockError(400, 'You already have a stylist page');
    const handle = String(request.body?.handle ?? '').toLowerCase();
    if (taken(handle)) throw new MockError(409, 'That handle has just been taken');
    const profile = {
      ...request.body,
      handle,
      id: `sty_${Date.now()}`,
      accountId,
      verificationTier: 0 as const,
      published: false,
      createdAt: new Date().toISOString(),
    };
    db.stylists.set(accountId, profile);
    // Setting up a page is what makes an account a stylist.
    const account = db.accounts.get(accountId)!;
    if (!account.roles?.includes('stylist')) account.roles = [...(account.roles ?? []), 'stylist'];
    return profile;
  },

  'PATCH /api/stylists/me/': request => {
    const accountId = requireAccount(request);
    const profile = db.stylists.get(accountId);
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    Object.assign(profile, request.body);
    return profile;
  },

  'POST /api/stylists/me/publish/': request => {
    const accountId = requireAccount(request);
    const profile = db.stylists.get(accountId);
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    if (!db.accounts.get(accountId)?.phoneVerified) {
      throw new MockError(403, 'Verify your mobile number before your page goes live');
    }
    profile.published = true;
    return profile;
  },
});
