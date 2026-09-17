export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
export type HairDensity = 'fine' | 'medium' | 'thick';
export type HairPorosity = 'low' | 'medium' | 'high';
/** Where a gently stretched curl reaches — stretched, so shrinkage doesn't hide length. */
export type HairLength =
  | 'cropped'
  | 'ear'
  | 'chin'
  | 'shoulder'
  | 'armpit'
  | 'mid-back'
  | 'waist'
  | 'hip';
export type HairGoal = 'growth' | 'health' | 'moisture' | 'strength' | 'color' | 'style';

export interface HairProfile {
  texture?: HairTexture;
  length?: HairLength;
  density?: HairDensity;
  porosity?: HairPorosity;
  goals?: HairGoal[];
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
