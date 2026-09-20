import { differenceInCalendarDays, differenceInHours, differenceInMinutes } from 'date-fns';

/**
 * How long ago a look went up, short enough to sit beside a handle. A feed with no
 * sense of time reads as a catalogue; this is what makes it look alive.
 */
export function postedLabel(iso: string, now = new Date()) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';

  const minutes = differenceInMinutes(now, at);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;

  const hours = differenceInHours(now, at);
  if (hours < 24) return `${hours}h`;

  const days = differenceInCalendarDays(now, at);
  if (days < 7) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 365)}y`;
}
