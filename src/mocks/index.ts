/**
 * The mock backend, installed in dev when EXPO_PUBLIC_API_MOCKS=true.
 *
 * Like src/api.ts, this is a composition root, allowed to know about every feature.
 * When Prince ships an endpoint, delete its handlers here and the app uses the real one.
 */
import { useAuthStore } from '@/features/auth';
import { apiClient } from '@/shared/lib/api/client';
import { installMocks, mockToken } from '@/shared/lib/api/mock';
import { db, findAccountByEmail } from './db';
import './auth';
import './users';
import './stylist';
import './planner';
import './looks';
import './bookings';
import './shelf';
import './verification';
import './invites';
// Last: a full, lived-in app on top of the fixed data the tests use.
import './seed';

installMocks(apiClient);

if (__DEV__)
  console.log(
    '[mocks] API mocks on. Sign in as client@yasante.dev, ama@yasante.dev or zainab@yasante.dev'
  );

// Console helpers: mockSignIn('ama@yasante.dev') to switch accounts, mockDb to see
// what the mock backend is actually holding when a screen disagrees with it.
declare global {
  // eslint-disable-next-line no-var -- globals can only be declared with var
  var mockSignIn: ((email: string) => void) | undefined;
  // eslint-disable-next-line no-var
  var mockDb: typeof db | undefined;
}
globalThis.mockDb = db;
globalThis.mockSignIn = email => {
  const account = findAccountByEmail(email);
  if (!account) throw new Error(`No mock account for ${email}`);
  useAuthStore.getState().setAuth(account, {
    accessToken: mockToken(account.id),
    refreshToken: `refresh.${account.id}`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
};
