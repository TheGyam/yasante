import type { ConsentPurpose } from './consentStore';

export type AskedPurpose = Extract<ConsentPurpose, 'analytics' | 'personalisation' | 'research'>;

/** The words for each choice, the same where it's first asked and in Settings. */
export const CONSENT_WORDING: Record<AskedPurpose, { title: string; body: string }> = {
  analytics: {
    title: 'Help make Yasante better',
    body: 'Share how you use Yasante, never what you post, so we can fix what’s slow or confusing.',
  },
  personalisation: {
    title: 'Use your hair details',
    body: 'We’ll use your hair and scalp details to match looks, stylists and products to your hair. Only you and stylists you book can see them.',
  },
  research: {
    title: 'Help research on hair',
    body: 'Let your hair data, without your name or photos, join anonymous research on hair, including reports for hair brands and studies with universities. You can stop any time in Settings.',
  },
};
