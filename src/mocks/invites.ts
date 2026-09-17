import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

const find = (code: string) => {
  const invite = db.invites.get(code.toUpperCase());
  if (!invite) throw new MockError(404, 'We don’t recognise that invite');
  if (invite.redeemedBy) throw new MockError(410, 'That invite has already been used');
  return invite;
};

defineMocks({
  'GET /api/invites/:code/': ({ params }) => {
    const { code, role, invitedBy } = find(params.code);
    return { code, role, invitedBy, expiresAt: new Date(Date.now() + 14 * 864e5).toISOString() };
  },

  'POST /api/invites/:code/redeem/': request => {
    const accountId = requireAccount(request);
    const invite = find(request.params.code);
    const account = db.accounts.get(accountId)!;
    if (!account.roles?.includes('stylist')) account.roles = [...(account.roles ?? []), 'stylist'];
    invite.redeemedBy = accountId;
    return account;
  },
});
