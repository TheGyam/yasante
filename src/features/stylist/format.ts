import { Share } from 'react-native';
import { formatMoney } from '@/shared/lib/format';
import type { MenuItem, StylistProfile, VerificationTier } from './types';

export const PUBLIC_HOST = 'yasante.com';

/** Her link-in-bio. The whole growth model runs through this address. */
export const pageUrl = (profile: Pick<StylistProfile, 'handle'>) =>
  `https://${PUBLIC_HOST}/${profile.handle}`;

/** "Usually replies within an hour" — rounded the way a person would say it. */
export function replyLabel(hours?: number) {
  if (hours === undefined) return undefined;
  if (hours <= 1) return 'Usually replies within an hour';
  if (hours <= 6) return 'Usually replies within a few hours';
  if (hours <= 24) return 'Usually replies within a day';
  return 'Usually replies within two days';
}

const TIMING_WORDS = { early: 'finishes early', on_time: 'finishes on time', over: 'runs over' };

/** "Usually finishes on time · 8 of 10 appointments". The sample size is always shown. */
export function timingLabelText(label?: {
  outcome: keyof typeof TIMING_WORDS;
  count: number;
  sample: number;
}) {
  if (!label) return undefined;
  return `Usually ${TIMING_WORDS[label.outcome]} · ${label.count} of ${label.sample} appointments`;
}

/** Every badge says exactly what was checked — never a generic "verified". */
export const VERIFICATION_LABELS: Record<VerificationTier, string> = {
  0: 'Not checked yet',
  1: 'Phone and work checked',
  2: 'Met by Yasante',
};

/** "4 hrs", "3 hrs 30 mins", "45 mins" — how she says it, not 210. */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} mins`;
  const spoken = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return rest ? `${spoken} ${rest} mins` : spoken;
}

/** "£120" or "from £120". Never a range: the low end plus "from" is what clients read. */
export function formatPrice(item: Pick<MenuItem, 'price' | 'fromPrice'>) {
  return item.fromPrice ? `from ${formatMoney(item.price)}` : formatMoney(item.price);
}

export function sharePage(profile: Pick<StylistProfile, 'handle' | 'displayName'>) {
  const url = pageUrl(profile);
  return Share.share({ message: `${profile.displayName} on Yasante: ${url}`, url }).catch(() => {});
}
