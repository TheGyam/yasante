import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { ViewToken } from '@shopify/flash-list';
import { useAuthStore } from '@/features/auth';
import { apiClient } from '@/shared/lib/api/client';
import type { Look } from './types';

/**
 * What she sees and opens in the feed, sent to the server in small batches so the feed
 * can learn what to show. Only while the server hands out a feed session (the ranked
 * feed is on for her); nothing stays on the phone beyond the next send.
 */
export type FeedSurface = 'home' | 'looks' | 'related';

interface FeedEvent {
  session: string;
  surface: FeedSurface;
  lookId: string;
  kind: 'impression' | 'open' | 'dwell';
  position?: number;
  source?: string;
  ms?: number;
}

const SEND_AT = 25;
const SEND_AFTER_MS = 15_000;
const BATCH = 100;
// Offline for a long time: the oldest go, rather than the phone holding them forever.
const KEEP_AT_MOST = 500;
// Half on screen for half a second: a look scrolled straight past wasn't seen.
const VIEWABILITY = { itemVisiblePercentThreshold: 50, minimumViewTime: 500 };

let queue: FeedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let sending = false;
let listening = false;

function later() {
  if (!timer && queue.length) timer = setTimeout(() => void sendFeedEvents(), SEND_AFTER_MS);
}

export function recordFeedEvent(event: FeedEvent) {
  if (!listening) {
    listening = true;
    // Leaving the app sends what's waiting, so a closed app loses nothing.
    AppState.addEventListener('change', state => {
      if (state !== 'active') void sendFeedEvents();
    });
    // Someone else signing in (or out) mustn't send what the last person saw as theirs.
    useAuthStore.subscribe((state, previous) => {
      if (state.user?.id !== previous.user?.id) clearFeedEvents();
    });
  }
  queue.push(event);
  if (queue.length > KEEP_AT_MOST) queue = queue.slice(-KEEP_AT_MOST);
  if (queue.length >= SEND_AT) void sendFeedEvents();
  else later();
}

export async function sendFeedEvents() {
  clearTimeout(timer);
  timer = undefined;
  if (sending || !queue.length) return;
  const batch = queue.slice(0, BATCH);
  sending = true;
  try {
    await apiClient.post('/api/feed/events/', { events: batch });
    queue = queue.slice(batch.length);
  } catch (error) {
    // Refused as it stands won't go through later either; anything else tries again.
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status && status >= 400 && status < 500) queue = queue.slice(batch.length);
  } finally {
    sending = false;
    later();
  }
}

/** Forget everything waiting: for tests, and when someone signs out. */
export function clearFeedEvents() {
  queue = [];
  clearTimeout(timer);
  timer = undefined;
}

// A look opened from a feed, until its page has recorded how long she stayed.
const opened = new Map<string, Omit<FeedEvent, 'kind' | 'ms'>>();

/**
 * For a feed list: records each look the first time it's properly seen in this session,
 * and wraps `open` so opening a look is recorded too. Stable across renders.
 */
export function useFeedTracking(
  session: string | undefined,
  surface: FeedSurface,
  looks: Look[],
  open: (look: Look) => void
) {
  const current = useRef({ session, looks, open, seen: new Set<string>() });
  useEffect(() => {
    const was = current.current;
    // A new session (pull to refresh) starts counting afresh.
    current.current = {
      session,
      looks,
      open,
      seen: was.session === session ? was.seen : new Set(),
    };
  }, [session, looks, open]);

  const onViewableItemsChanged = useCallback(
    ({ changed }: { changed: ViewToken<Look>[] }) => {
      const { session: id, seen } = current.current;
      if (!id) return;
      for (const token of changed) {
        const look = token.item;
        if (!token.isViewable || !look || seen.has(look.id)) continue;
        seen.add(look.id);
        recordFeedEvent({
          session: id,
          surface,
          lookId: look.id,
          kind: 'impression',
          position: token.index ?? undefined,
          source: look.source,
        });
      }
    },
    [surface]
  );

  const onOpen = useCallback(
    (look: Look) => {
      const { session: id, looks: all, open: go } = current.current;
      if (id) {
        const context = {
          session: id,
          surface,
          lookId: look.id,
          position: all.findIndex(l => l.id === look.id),
          source: look.source,
        };
        opened.set(look.id, context);
        recordFeedEvent({ ...context, kind: 'open' });
      }
      go(look);
    },
    [surface]
  );

  return { onViewableItemsChanged, viewabilityConfig: VIEWABILITY, onOpen };
}

/** On a look's page: how long she stayed, when she came from a feed. */
export function useFeedDwell(lookId: string) {
  useEffect(() => {
    const context = opened.get(lookId);
    if (!context) return;
    opened.delete(lookId);
    const start = Date.now();
    return () => recordFeedEvent({ ...context, kind: 'dwell', ms: Date.now() - start });
  }, [lookId]);
}
