import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

defineMocks({
  'GET /api/stylists/me/': request => {
    const profile = db.stylists.get(requireAccount(request));
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    return profile;
  },

  'GET /api/stylists/me/summary/': request => {
    const accountId = requireAccount(request);
    return { pendingRequests: db.pendingRequests.get(accountId) ?? 0, appointmentsToday: 0 };
  },
});
