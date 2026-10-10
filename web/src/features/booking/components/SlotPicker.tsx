import { useState, type ReactNode } from 'react';
import { Chip } from '@/shared/ui/Chip';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { slotParts, zoneMark } from '../format';
import type { FreeSlots } from '../types';
import * as styles from './SlotPicker.css';

// When the day is split, so a long list of times reads at a glance.
const PARTS = [
  { name: 'Morning', until: 12 },
  { name: 'Afternoon', until: 17 },
  { name: 'Evening', until: 24 },
];

const at = (date: string) => new Date(`${date}T12:00:00`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) =>
  at(date).toLocaleDateString('en-GB', options);

export interface SlotPickerProps {
  slots?: FreeSlots;
  loading?: boolean;
  /** Showing the last times while new ones load: dimmed, still usable. */
  refreshing?: boolean;
  /** The chosen start time, as ISO. */
  value?: string;
  onChange: (iso: string) => void;
  /** A day to open on, yyyy-MM-dd: a slot someone was told about. */
  initialDay?: string;
  /** Shown when she has nothing free. */
  whenFull?: ReactNode;
}

/**
 * Her free times, as the app shows them (src/features/booking/components/SlotPicker.tsx):
 * the days she has room, then the times on the day you pick. Only real openings, on her
 * clock, so whatever is picked is a time she can actually do.
 */
export function SlotPicker({
  slots,
  loading,
  refreshing,
  value,
  onChange,
  initialDay,
  whenFull,
}: SlotPickerProps) {
  const days = slots?.days ?? [];
  const zone = slots?.timeZone;
  const [picked, setPicked] = useState<string>();
  // "Today" and "Tmrw" for the strip, as of when it opened.
  const [{ today, tomorrow }] = useState(() => ({
    today: new Date().toLocaleDateString('en-CA'),
    tomorrow: new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA'),
  }));

  if (loading) {
    return (
      <div className={styles.body}>
        <div className={styles.skeletons}>
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} style={{ width: 60, height: 64, borderRadius: 14 }} />
          ))}
        </div>
        <Skeleton style={{ height: 80 }} />
      </div>
    );
  }

  if (!days.length) {
    return (
      <div className={styles.body}>
        <Text variant="subhead" tone="secondary">
          They’re fully booked for the next four weeks.
        </Text>
        {whenFull}
      </div>
    );
  }

  // The day picked, else the chosen time's, else the one asked for, else the first with room.
  const wanted = picked ?? (value ? slotParts(value, zone).day : initialDay);
  const day = days.find(d => d.date === wanted) ?? days[0];

  return (
    <div className={`${styles.body} ${refreshing ? styles.refreshing : ''}`}>
      <div className={styles.days} role="group" aria-label="Days with free times">
        {days.map(({ date }) => {
          const on = date === day.date;
          return (
            <button
              key={date}
              type="button"
              className={styles.day}
              aria-pressed={on}
              aria-label={fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })}
              onClick={() => setPicked(date)}
            >
              <span className={`${styles.dayName} ${on ? styles.on : ''}`}>
                {date === today
                  ? 'Today'
                  : date === tomorrow
                    ? 'Tmrw'
                    : fmt(date, { weekday: 'short' })}
              </span>
              <span className={`${styles.dayNumber} ${on ? styles.on : ''}`}>
                {fmt(date, { day: 'numeric' })}
              </span>
              <span className={styles.dayMonth}>{fmt(date, { month: 'short' })}</span>
            </button>
          );
        })}
      </div>

      {PARTS.map((part, index) => {
        const from = index ? PARTS[index - 1].until : 0;
        const times = day.times.filter(t => {
          const { hour } = slotParts(t, zone);
          return hour >= from && hour < part.until;
        });
        if (!times.length) return null;
        return (
          <div key={part.name} className={styles.part}>
            <Text variant="overline" tone="tertiary">
              {part.name}
            </Text>
            <div className={styles.times}>
              {times.map(time => (
                <Chip
                  key={time}
                  label={slotParts(time, zone).time}
                  selected={value === time}
                  onClick={() => onChange(time)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {!!zoneMark(zone) && (
        <Text variant="footnote" tone="tertiary">
          Times are in{zoneMark(zone)}, where the appointment is.
        </Text>
      )}
    </div>
  );
}
