import { Share } from 'react-native';
import { format } from 'date-fns';
import { formatMoney } from '@/shared/lib/format';
import type { MoodBoardEntry, Treatment, TreatmentFrequency, TreatmentTimeOfDay } from './types';

export const FREQUENCY_LABELS: Record<TreatmentFrequency, string> = {
  daily: 'Every day',
  'every-2-days': 'Every 2 days',
  weekly: 'Every week',
  'specific-days': 'Specific days',
  custom: 'Custom',
};

export const TIME_OF_DAY_LABELS: Record<TreatmentTimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

/** "Every week · Evening" */
export function describeTreatment(
  t: Pick<Treatment, 'frequency' | 'timeOfDay' | 'customFrequency'>
) {
  const often =
    t.frequency === 'custom' && t.customFrequency
      ? t.customFrequency
      : FREQUENCY_LABELS[t.frequency];
  return `${often ?? t.frequency} · ${TIME_OF_DAY_LABELS[t.timeOfDay] ?? t.timeOfDay}`;
}

/** An entry's appointment, or null when it doesn't have a real one. */
export function appointmentOf(entry: Pick<MoodBoardEntry, 'appointmentTime'>): Date | null {
  if (!entry.appointmentTime) return null;
  const date = new Date(entry.appointmentTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function boardTotal(entry: Pick<MoodBoardEntry, 'stylistPrice' | 'hairPrice'>) {
  return Number(entry.stylistPrice || 0) + Number(entry.hairPrice || 0);
}

// Links carry only an id. Everything else is fetched, so nothing private rides in a URL.
const LINK = /^yasante:\/\/(moodboard|treatment)\/([^/?#]+)/;

export function parsePlannerLink(url: string): { kind: 'board' | 'treatment'; id: string } | null {
  const match = LINK.exec(url);
  if (!match) return null;
  return {
    kind: match[1] === 'moodboard' ? 'board' : 'treatment',
    id: decodeURIComponent(match[2]),
  };
}

export function shareBoard(entry: MoodBoardEntry) {
  const when = appointmentOf(entry);
  const total = boardTotal(entry);
  const lines = [
    entry.name,
    when && `Appointment: ${format(when, 'EEE d MMM, HH:mm')}`,
    total > 0 && `Budget: ${formatMoney(total)}`,
    `yasante://moodboard/${encodeURIComponent(entry.id)}`,
  ];
  return Share.share({ message: lines.filter(Boolean).join('\n') }).catch(() => {});
}

export function shareTreatment(treatment: Treatment) {
  const message = [
    treatment.name,
    describeTreatment(treatment),
    `yasante://treatment/${encodeURIComponent(treatment.id)}`,
  ].join('\n');
  return Share.share({ message }).catch(() => {});
}
