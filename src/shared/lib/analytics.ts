import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useConsentStore } from '@/shared/config/consentStore';
import { apiClient } from './api/client';

/** The plan's minimum event set. Nothing outside this list is sent. */
export type EventName =
  | 'view_look'
  | 'save_look'
  | 'view_stylist'
  | 'search'
  | 'start_booking'
  | 'submit_booking'
  | 'confirm_attendance'
  | 'cancel_booking'
  | 'post_look'
  | 'leave_review'
  | 'add_shelf_item'
  | 'complete_checkin'
  | 'share_link'
  | 'switch_mode'
  | 'profile_section_completed';

export interface TrackedEvent {
  name: EventName;
  properties: Record<string, string | number | boolean | null | undefined>;
  /** UTC. */
  at: string;
  /** The same moment in her own time zone, offset included — "you wash on Sundays" needs it. */
  localAt: string;
  appVersion: string;
}

const FLUSH_EVERY_MS = 30_000;
const GIVE_UP_MS = 20_000;
const BATCH = 50;
/** Kept while offline, oldest dropped first. Events are useful, not precious. */
const MAX_QUEUED = 500;
const ANONYMOUS_KEY = '@yasante:anonymous-id';

let queue: TrackedEvent[] = [];
let anonymousId: string | undefined;
let flushing = false;

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');

/** "2026-09-21T18:05:00+01:00" — local wall-clock time with its offset. */
export function localTimestamp(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  );
}

const allowed = () => useConsentStore.getState().isGranted('analytics');

/**
 * Records an event — only with the analytics consent. Without it the event is
 * dropped here, never queued, never sent: the plan says dropped, not stored.
 */
export function track(name: EventName, properties: TrackedEvent['properties'] = {}) {
  if (!allowed()) return;
  const now = new Date();
  queue.push({
    name,
    properties,
    at: now.toISOString(),
    localAt: localTimestamp(now),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
  });
  if (queue.length > MAX_QUEUED) queue = queue.slice(-MAX_QUEUED);
  if (queue.length >= BATCH) void flush();
}

/** A random id for someone not signed in, kept on the device so a session hangs together. */
async function anonymous() {
  if (anonymousId) return anonymousId;
  try {
    anonymousId = (await AsyncStorage.getItem(ANONYMOUS_KEY)) ?? undefined;
  } catch {
    // Storage unavailable: a fresh id per launch is acceptable.
  }
  if (!anonymousId) {
    anonymousId = `anon_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    AsyncStorage.setItem(ANONYMOUS_KEY, anonymousId).catch(() => {});
  }
  return anonymousId;
}

/** Sends what's queued in one batch. A failure keeps the events for the next try. */
export async function flush() {
  if (flushing || !queue.length) return;
  if (!allowed()) {
    queue = [];
    return;
  }
  flushing = true;
  const batch = queue.slice(0, BATCH);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const send = apiClient.post('/api/events/', { anonymousId: await anonymous(), events: batch });
    // A request that never settles mustn't stop every later flush.
    const giveUp = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out')), GIVE_UP_MS);
    });
    await Promise.race([send, giveUp]);
    queue = queue.slice(batch.length);
  } catch {
    // Kept; the next flush tries again.
  } finally {
    clearTimeout(timer);
    flushing = false;
  }
}

/** Withdrawing the consent takes effect at once: anything still queued goes too. */
useConsentStore.subscribe(state => {
  if (!state.consents.analytics?.granted) queue = [];
});

let started = false;

/** Flushes on a timer and whenever the app goes to the background. Call once. */
export function startAnalytics() {
  if (started) return;
  started = true;
  setInterval(() => void flush(), FLUSH_EVERY_MS);
  AppState.addEventListener('change', state => {
    if (state !== 'active') void flush();
  });
}

/** For tests. */
export const queuedEvents = () => queue;
