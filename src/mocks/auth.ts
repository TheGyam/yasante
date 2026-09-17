import { defineMocks, MockError, mockToken } from '@/shared/lib/api/mock';
import { db, findAccountByEmail } from './db';

const session = (accountId: string) => ({
  user: db.accounts.get(accountId)!,
  accessToken: mockToken(accountId),
  refreshToken: `refresh.${accountId}`,
  expiresAt: Date.now() + 24 * 60 * 60 * 1000,
});

defineMocks({
  'POST /api/auth/login/': ({ body }) => {
    const account = findAccountByEmail(body?.email ?? '');
    if (!account) throw new MockError(401, 'No account with that email. Try client@yasante.dev');
    return session(account.id);
  },

  'POST /api/auth/signup/': ({ body }) => {
    if (findAccountByEmail(body?.email ?? '')) {
      throw new MockError(400, 'That email is already registered');
    }
    if (body?.age_confirmed !== true) throw new MockError(400, 'You need to be 18 or over');
    const invite = body?.invite_code
      ? db.invites.get(String(body.invite_code).toUpperCase())
      : undefined;
    if (body?.invite_code && (!invite || invite.redeemedBy)) {
      throw new MockError(410, 'That invite has expired or been used');
    }
    const id = `acc_${Date.now()}`;
    const now = new Date().toISOString();
    const stylist = body?.role === 'stylist';
    db.accounts.set(id, {
      id,
      name: body.name,
      email: body.email,
      phoneVerified: false,
      roles: stylist ? ['client', 'stylist'] : ['client'],
      createdAt: now,
      updatedAt: now,
    });
    if (invite) invite.redeemedBy = id;
    return session(id);
  },

  'POST /api/auth/refresh-token/': ({ body }) => {
    const accountId = String(body?.refreshToken ?? '').replace('refresh.', '');
    if (!db.accounts.has(accountId)) throw new MockError(401, 'Session expired');
    return { accessToken: mockToken(accountId), expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  },

  'POST /api/auth/forgot-password/': () => ({
    message: 'If that email has an account, a reset link is on its way.',
  }),
});
