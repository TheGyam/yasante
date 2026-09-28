/**
 * Time zones on the phone. Every time comes from the server in UTC; an appointment
 * reads on the stylist's clock (where it happens), marked when that isn't this
 * phone's — "10:00 UK time" for someone in New York booking in London.
 */

/** This phone's zone (IANA), or undefined if the runtime can't say. */
export function deviceZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// Names people use, where the city in the zone's id isn't it (kept in step with
// backend/apps/common/zones.py).
const NAMES: Record<string, string> = {
  'Europe/London': 'UK time',
  'Europe/Dublin': 'Irish time',
  'Africa/Accra': 'Ghana time',
  'Africa/Lagos': 'Nigeria time',
};

/** "UK time", "New York time". */
export function zoneLabel(zone: string) {
  return NAMES[zone] ?? `${zone.split('/').pop()!.replace(/_/g, ' ')} time`;
}

/** " UK time" when the zone isn't this phone's; "" when it is (or isn't known). */
export function zoneMark(zone?: string) {
  const here = deviceZone();
  return zone && here && zone !== here ? ` ${zoneLabel(zone)}` : '';
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The moment as that zone's clock shows it, as a Date whose local fields read that
 * way, so ordinary formatting prints that clock. No zone: the phone's own.
 */
export function wallTime(iso: string | Date, zone?: string) {
  const at = new Date(iso);
  if (!zone || Number.isNaN(at.getTime()) || zone === deviceZone()) return at;
  try {
    let parts = formatters.get(zone);
    if (!parts) {
      parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      formatters.set(zone, parts);
    }
    const p = Object.fromEntries(parts.formatToParts(at).map(x => [x.type, x.value]));
    return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  } catch {
    return at;
  }
}

/**
 * Tell the server this phone's zone, so notifications word times for it. Sent only
 * when it changes (a new phone, or travelling). Never throws.
 */
export async function syncTimeZone(userId: string) {
  const zone = deviceZone();
  if (!zone) return;
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const key = `yasante.timezone.${userId}`;
  try {
    if ((await AsyncStorage.getItem(key)) === zone) return;
    const { apiClient } = await import('@/shared/lib/api/client');
    await apiClient.patch(`/api/users/${userId}/`, { timeZone: zone });
    await AsyncStorage.setItem(key, zone);
  } catch {
    // Next launch tries again.
  }
}
