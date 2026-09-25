import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

const RESEND_AFTER = 30;
const DEV_CODE = '123456';

// The last email code each account was sent (always DEV_CODE here).
const emailSentAt = new Map<string, number>();

defineMocks({
  'POST /api/auth/email/start/': request => {
    const accountId = requireAccount(request);
    const account = db.accounts.get(accountId)!;
    const email = String(request.body?.email ?? '')
      .trim()
      .toLowerCase();
    if (email && email !== account.email) {
      const other = [...db.accounts.values()].find(a => a.email === email && a.id !== accountId);
      if (other) throw new MockError(400, 'Another account already uses that email.');
      Object.assign(account, { email, emailVerified: false });
    }
    const waited = (Date.now() - (emailSentAt.get(accountId) ?? 0)) / 1000;
    if (waited < RESEND_AFTER) {
      throw new MockError(
        429,
        `Wait ${Math.ceil(RESEND_AFTER - waited)} seconds before asking for another code.`
      );
    }
    emailSentAt.set(accountId, Date.now());
    if (__DEV__) console.log(`[mocks] Email code for ${account.email}: ${DEV_CODE}`);
    return { resendInSeconds: RESEND_AFTER, expiresInSeconds: 600 };
  },

  'POST /api/auth/email/verify/': request => {
    const accountId = requireAccount(request);
    if (!emailSentAt.has(accountId)) throw new MockError(400, 'Ask for a code first.');
    if (request.body?.code !== DEV_CODE)
      throw new MockError(400, 'That code isn’t right. 4 tries left.');
    emailSentAt.delete(accountId);
    const account = db.accounts.get(accountId)!;
    Object.assign(account, { emailVerified: true, updatedAt: new Date().toISOString() });
    return account;
  },
});
