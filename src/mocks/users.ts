import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

const account = (id: string) => {
  const found = db.accounts.get(id);
  if (!found) throw new MockError(404, 'Account not found');
  return found;
};

defineMocks({
  'GET /api/users/:id/': request => {
    requireAccount(request);
    return account(request.params.id);
  },

  'PATCH /api/users/:id/hair-profile/': request => {
    requireAccount(request);
    const found = account(request.params.id);
    found.hairProfile = { ...found.hairProfile, ...request.body };
    return found.hairProfile;
  },

  'PATCH /api/users/:id/': request => {
    requireAccount(request);
    const found = account(request.params.id);
    Object.assign(found, request.body, { updatedAt: new Date().toISOString() });
    return found;
  },
});
