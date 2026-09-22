import { Share } from 'react-native';
import type { Look, Style } from './types';
import { differenceInCalendarDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { track } from '@/shared/lib/analytics';

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

/** A look can be booked when its stylist has a live page and it's tagged with one of her services. */
export const bookable = (look: Pick<Look, 'stylist' | 'serviceId'>) =>
  !!look.stylist?.handle && !!look.serviceId;

/** Where a look lives on the web, for sharing. */
export const lookUrl = (look: Pick<Look, 'id'>) => `https://yasante.com/looks/${look.id}`;

export function shareLook(look: Pick<Look, 'id' | 'authorName' | 'serviceName'>) {
  const url = lookUrl(look);
  track('share_link', { kind: 'look' });
  const what = look.serviceName ? `${look.serviceName} by ${look.authorName}` : look.authorName;
  return Share.share({ message: `${what} on Yasante: ${url}`, url }).catch(() => {});
}

/**
 * The style a service is, when its name says so: "Knotless braids" is knotless,
 * and so is "Boho knotless". The server applies the same rule when it shares a
 * portfolio photo to Looks.
 */
export function styleForService(serviceName: string | undefined, taxonomy: Style[]) {
  if (!serviceName) return undefined;
  const name = serviceName.toLowerCase();
  const words = (text: string) =>
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(w => w.length > 3);
  return (
    taxonomy.find(
      style => name.includes(style.name.toLowerCase()) || style.name.toLowerCase().includes(name)
    ) ?? taxonomy.find(style => words(style.name).some(w => w !== 'braids' && name.includes(w)))
  )?.id;
}
