import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import type { Query } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'REACT_QUERY_OFFLINE_CACHE';
const CACHE_VERSION = 1;

/**
 * What's kept on the phone between launches: the screens people come back to, so
 * they open with what was there last time while a fresh copy loads. Left out: things
 * only right at the moment they're asked (free slots, a username check, search).
 */
const KEPT = new Set([
  'looks',
  'planner',
  'bookings',
  'stylist',
  'user',
  'styles',
  'look-areas',
  'shelf',
  'content',
  'favorites',
  'slot-interests',
]);
const NOT_KEPT_UNDER = new Set(['one', 'search', 'handle']);

export function shouldKeep(query: Pick<Query, 'queryKey' | 'state'>) {
  const [root, sub] = query.queryKey;
  return (
    query.state.status === 'success' && KEPT.has(String(root)) && !NOT_KEPT_UNDER.has(String(sub))
  );
}

type Dehydrated = {
  clientState: { queries: { state: { data?: unknown } }[] };
};

/**
 * Long lists keep only their first page: that's what's on screen at launch, and a
 * feed scrolled fifty pages deep would otherwise be written out every second.
 */
export function trimPages(client: Dehydrated) {
  for (const query of client.clientState.queries) {
    const data = query.state.data as { pages?: unknown[]; pageParams?: unknown[] } | undefined;
    if (data?.pages && data.pageParams && data.pages.length > 1) {
      query.state.data = { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
    }
  }
  return client;
}

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEY,
  throttleTime: 1000, // Save to storage at most once per second
  serialize: client => JSON.stringify(trimPages(client as unknown as Dehydrated)),
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: asyncStoragePersister,
  // A day old is too old to show even for a moment.
  maxAge: 24 * 60 * 60 * 1000,
  // Bump CACHE_VERSION when a cached response changes shape, so no build ever reads
  // what an older one wrote. (The app version alone stays put between builds.)
  buster: `${Constants.expoConfig?.version ?? ''}-${CACHE_VERSION}`,
  dehydrateOptions: { shouldDehydrateQuery: shouldKeep },
};
