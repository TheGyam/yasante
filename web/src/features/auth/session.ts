import { useSyncExternalStore } from 'react';
import { setAuthBridge } from '@/shared/lib/api/client';
import { readJson, writeJson } from '@/shared/lib/storage';
import type { AuthResponse, Session, TokenPair, User } from './types';

/**
 * The signed-in session. Kept for this tab only (sessionStorage), so a reload mid-setup
 * doesn't sign her out, and closing the tab does — the site is for setting up a page,
 * not staying signed in on a shared computer.
 */
const KEY = 'yasante.session';

let session: Session | undefined = readJson<Session>(KEY, 'session');
const listeners = new Set<() => void>();

function set(next: Session | undefined) {
  session = next;
  writeJson(KEY, next, 'session');
  listeners.forEach(listener => listener());
}

export function startSession(auth: AuthResponse) {
  set({ user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken });
}

export function updateUser(user: User) {
  if (session) set({ ...session, user });
}

export function endSession() {
  set(undefined);
}

export function currentSession() {
  return session;
}

export function useSession() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => session,
    () => undefined
  );
}

/** One refresh at a time: requests that 401 together share it. */
let refreshing: Promise<string | undefined> | undefined;

async function refresh() {
  const refreshToken = session?.refreshToken;
  if (!refreshToken) return undefined;
  refreshing ??= fetch('/api/auth/refresh-token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async response => {
      if (!response.ok) {
        // Refused: the session is over, and she signs in again.
        endSession();
        return undefined;
      }
      const tokens = (await response.json()) as TokenPair;
      if (session) set({ ...session, ...tokens });
      return tokens.accessToken;
    })
    .catch(() => undefined)
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

setAuthBridge({ accessToken: () => session?.accessToken, refresh });
