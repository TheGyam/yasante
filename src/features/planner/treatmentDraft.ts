import { format, parseISO, startOfDay } from 'date-fns';
import type { Treatment, TreatmentFrequency, TreatmentTimeOfDay } from './types';

export interface TreatmentDraft {
  name: string;
  frequency: TreatmentFrequency;
  timeOfDay: TreatmentTimeOfDay;
  startDate: Date;
  specificDays: number[];
  customFrequency: string;
  duration: string;
  notes: string;
  reminderEnabled: boolean;
}

export function draftFromTreatment(t?: Treatment, now = new Date()): TreatmentDraft {
  return {
    name: t?.name ?? '',
    frequency: t?.frequency ?? 'weekly',
    timeOfDay: t?.timeOfDay ?? 'evening',
    startDate: t?.startDate ? parseISO(t.startDate) : startOfDay(now),
    specificDays: t?.specificDays ?? [],
    customFrequency: t?.customFrequency ?? '',
    duration: t?.duration ? String(t.duration) : '',
    notes: t?.notes ?? '',
    reminderEnabled: t?.reminderEnabled ?? false,
  };
}

/** Field errors, keyed by field. Empty when the draft can be saved. */
export function validateTreatment(
  d: TreatmentDraft
): Partial<Record<keyof TreatmentDraft, string>> {
  const errors: Partial<Record<keyof TreatmentDraft, string>> = {};
  if (!d.name.trim()) errors.name = 'Name your treatment';
  if (d.frequency === 'specific-days' && d.specificDays.length === 0)
    errors.specificDays = 'Pick at least one day';
  if (d.frequency === 'custom' && !d.customFrequency.trim())
    errors.customFrequency = 'Say how often';
  return errors;
}

export function treatmentFromDraft(d: TreatmentDraft) {
  const minutes = Number.parseInt(d.duration, 10);
  return {
    name: d.name.trim(),
    frequency: d.frequency,
    timeOfDay: d.timeOfDay,
    // The calendar day the person picked, not whatever day it is in UTC.
    startDate: format(d.startDate, 'yyyy-MM-dd'),
    specificDays: d.frequency === 'specific-days' ? [...d.specificDays].sort() : undefined,
    customFrequency: d.frequency === 'custom' ? d.customFrequency.trim() : undefined,
    duration: minutes > 0 ? minutes : undefined,
    notes: d.notes.trim() || undefined,
    reminderEnabled: d.reminderEnabled,
  } satisfies Partial<Treatment>;
}
