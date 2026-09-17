import { format, setHours, setMinutes } from 'date-fns';
import { parseMoney } from '@/shared/lib/format';
import { appointmentOf } from './format';
import type { MoodBoardEntry } from './types';

/** What the board form edits. Prices stay text so the fields hold exactly what was typed. */
export interface BoardDraft {
  name: string;
  photos: string[];
  hasAppointment: boolean;
  appointment: Date;
  stylistName: string;
  location: string;
  stylistPrice: string;
  hairPrice: string;
  notes: string;
  isSecret: boolean;
  completed: boolean;
}

/** A new board opens at 10:00 tomorrow — a plausible slot, never one in the past. */
function defaultAppointment(now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return setMinutes(setHours(tomorrow, 10), 0);
}

const priceText = (value: unknown) => (Number(value) > 0 ? String(Number(value)) : '');

export function draftFromEntry(entry?: Partial<MoodBoardEntry>, now = new Date()): BoardDraft {
  const appointment = entry
    ? appointmentOf({ appointmentTime: entry.appointmentTime ?? '' })
    : null;
  return {
    name: entry?.name ?? '',
    photos: entry?.photos?.length ? entry.photos : entry?.mainPhotoUri ? [entry.mainPhotoUri] : [],
    hasAppointment: !!appointment,
    appointment: appointment ?? defaultAppointment(now),
    stylistName: entry?.stylistName ?? '',
    location: entry?.stylistLocation ?? '',
    stylistPrice: priceText(entry?.stylistPrice),
    hairPrice: priceText(entry?.hairPrice),
    notes: entry?.notes ?? '',
    isSecret: entry?.isSecret ?? false,
    completed: entry?.completed ?? false,
  };
}

/**
 * The entry fields a draft saves. A board without an appointment files under the
 * month it was made, and keeps an empty appointment rather than a made-up one.
 */
export function entryFromDraft(draft: BoardDraft, now = new Date()) {
  const when = draft.hasAppointment ? draft.appointment : null;
  return {
    name: draft.name.trim(),
    month: format(when ?? now, 'yyyy-MM'),
    mainPhotoUri: draft.photos[0] ?? '',
    photos: draft.photos,
    appointmentTime: when ? when.toISOString() : '',
    stylistName: draft.stylistName.trim() || undefined,
    stylistLocation: draft.location.trim(),
    stylistPrice: parseMoney(draft.stylistPrice),
    hairPrice: parseMoney(draft.hairPrice),
    notes: draft.notes.trim() || undefined,
    isSecret: draft.isSecret,
    completed: draft.completed,
  } satisfies Partial<MoodBoardEntry>;
}
