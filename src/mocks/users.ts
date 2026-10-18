import { defineMocks, MockError, requireAccount, type MockRequest } from '@/shared/lib/api/mock';
import { db } from './db';
import {
  identifierPolicy,
  nameProblem,
  nameTaken,
  normaliseName,
  unavailableName,
} from './identifiers';

const account = (id: string) => {
  const found = db.accounts.get(id);
  if (!found) throw new MockError(404, 'Account not found');
  return found;
};

/** Only you can export or delete your own account. */
const own = (request: MockRequest) => {
  const accountId = requireAccount(request);
  if (accountId !== request.params.id) throw new MockError(403, 'That isn’t your account');
  return accountId;
};

defineMocks({
  'GET /api/users/username-check/': request => {
    const me = requireAccount(request);
    const wanted = normaliseName(request.query.get('username'));
    const problem =
      nameProblem(wanted, identifierPolicy.username_max, db.accounts.get(me)?.username) ??
      (nameTaken(wanted, me) ? unavailableName : undefined);
    return {
      username: wanted,
      available: !problem,
      reason: problem,
    };
  },

  'GET /api/users/:id/': request => {
    requireAccount(request);
    return account(request.params.id);
  },

  'PATCH /api/users/:id/hair-profile/': request => {
    requireAccount(request);
    const found = account(request.params.id);
    found.hairProfile = { ...found.hairProfile, ...request.body };
    // The growth curve depends on history, so every change is kept as it was.
    db.hairSnapshots.push({
      accountId: found.id,
      profile: { ...found.hairProfile },
      at: new Date().toISOString(),
    });
    return found.hairProfile;
  },

  'PATCH /api/users/:id/': request => {
    const me = own(request);
    const found = account(request.params.id);
    const changes = { ...request.body };
    if ('username' in changes) {
      changes.username = normaliseName(changes.username);
      const problem =
        nameProblem(changes.username, identifierPolicy.username_max, found.username) ??
        (nameTaken(changes.username, me) ? unavailableName : undefined);
      if (problem) throw new MockError(400, problem);
    }
    Object.assign(found, changes, { updatedAt: new Date().toISOString() });
    return found;
  },

  'POST /api/users/:id/export/': request => {
    const accountId = own(request);
    const at = new Date().toISOString();
    db.exportRequests.push({ accountId, at });
    return { requestedAt: at };
  },

  /**
   * Deleting an account removes what's hers. Bookings stay for the stylist's own
   * records, with the client's name taken off them.
   */
  'DELETE /api/users/:id/': request => {
    const accountId = own(request);
    db.accounts.delete(accountId);
    db.stylists.delete(accountId);
    db.menus.delete(accountId);
    db.portfolios.delete(accountId);
    db.collections.delete(accountId);
    db.carePlans.delete(accountId);
    db.shelves.delete(accountId);
    const keep = <T>(list: T[], stays: (item: T) => boolean) => {
      const kept = list.filter(stays);
      list.splice(0, list.length, ...kept);
    };
    keep(db.looks, l => l.authorId !== accountId);
    keep(db.comments, c => c.authorId !== accountId);
    keep(db.reviews, r => r.clientId !== accountId);
    keep(db.hairSnapshots, s => s.accountId !== accountId);
    keep(db.slotInterests, i => i.clientId !== accountId);
    keep(db.events, e => e.accountId !== accountId);
    for (const likers of db.likes.values()) likers.delete(accountId);
    for (const booking of db.bookings) {
      if (booking.clientId === accountId) booking.clientName = 'Deleted account';
    }
    return null;
  },

  'POST /api/consents/': request => {
    const accountId = requireAccount(request);
    const records = Array.isArray(request.body?.consents) ? request.body.consents : [];
    for (const record of records) {
      db.consents.push({
        accountId,
        purpose: String(record.purpose),
        granted: !!record.granted,
        policyVersion: String(record.policyVersion),
        recordedAt: String(record.recordedAt),
        source: record.source,
      });
    }
    return null;
  },

  'POST /api/events/': request => {
    const events = Array.isArray(request.body?.events) ? request.body.events : [];
    // The server checks consent too: an account that has withdrawn it is dropped.
    const accountId = request.accountId;
    const latest = accountId
      ? db.consents.filter(c => c.accountId === accountId && c.purpose === 'analytics').pop()
      : undefined;
    if (latest && !latest.granted) return null;
    for (const event of events) {
      db.events.push({
        accountId,
        anonymousId: accountId ? undefined : request.body?.anonymousId,
        name: String(event.name),
        at: String(event.at),
        localAt: String(event.localAt),
      });
    }
    return null;
  },
});
