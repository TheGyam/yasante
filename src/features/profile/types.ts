export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
export type HairDensity = 'fine' | 'medium' | 'thick';
export type HairPorosity = 'low' | 'medium' | 'high';
/**
 * A reference point on the body, not a tape measure, ranked so change can be
 * computed. Always stored with whether it was measured stretched or as it shrinks.
 */
export type HairLength =
  | 'cropped'
  | 'ear'
  | 'chin'
  | 'neck'
  | 'shoulder'
  | 'armpit'
  | 'bra-strap'
  | 'mid-back'
  | 'waist'
  | 'hip'
  | 'tailbone';
export type ScalpType = 'balanced' | 'dry' | 'oily' | 'flaky' | 'sensitive';
export type ChemicalTreatment = 'relaxer' | 'texturiser' | 'colour' | 'bleach' | 'keratin';
export type StyleBudget = 'under_50' | '50_100' | '100_150' | '150_plus';
export type HairGoal = 'growth' | 'health' | 'moisture' | 'strength' | 'color' | 'style';

export interface HairProfile {
  texture?: HairTexture;
  /** Stretched out — the length it really is. */
  length?: HairLength;
  /** As it sits day to day. Textured hair can shrink by 70%, so it's its own answer. */
  shrunkLength?: HairLength;
  density?: HairDensity;
  porosity?: HairPorosity;
  goals?: HairGoal[];
  /** When the length was last answered, so it can be asked again a month on. */
  lengthMeasuredAt?: string;
  /** For people who measure. Never asked for; always stored in centimetres. */
  lengthCm?: number;
  scalp?: ScalpType[];
  /** Empty means none, ever — which is an answer, unlike not saying. */
  chemicals?: ChemicalTreatment[];
  /** The district she'd like stylists near. */
  area?: string;
  budget?: StyleBudget;
  photoUri?: string;
  completedAt?: string;
}

/** One account can hold several roles; stylist mode needs `stylist`. */
export type AccountRole = 'client' | 'stylist' | 'admin';

export interface User {
  id: string;
  roles?: AccountRole[];
  name: string;
  email?: string;
  /** E.164. Verified by a one-time code before booking or publishing a stylist page. */
  phone?: string;
  phoneVerified?: boolean;
  avatarUri?: string;
  hairProfile?: HairProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    routineReminders: boolean;
    goalReminders: boolean;
  };
  language: string;
  accessibility: {
    reduceMotion: boolean;
    fontSize: 'default' | 'large' | 'extraLarge';
  };
}
