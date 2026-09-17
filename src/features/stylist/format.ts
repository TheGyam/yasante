import { Share } from 'react-native';
import type { StylistProfile, VerificationTier } from './types';

export const PUBLIC_HOST = 'yasante.com';

/** Her link-in-bio. The whole growth model runs through this address. */
export const pageUrl = (profile: Pick<StylistProfile, 'handle'>) =>
  `https://${PUBLIC_HOST}/${profile.handle}`;

/** Every badge says exactly what was checked — never a generic "verified". */
export const VERIFICATION_LABELS: Record<VerificationTier, string> = {
  0: 'Not checked yet',
  1: 'Phone and work checked',
  2: 'Met by Yasante',
};

export function sharePage(profile: Pick<StylistProfile, 'handle' | 'displayName'>) {
  const url = pageUrl(profile);
  return Share.share({ message: `${profile.displayName} on Yasante: ${url}`, url }).catch(() => {});
}
