export type ServiceModel = 'salon' | 'home' | 'mobile';

/** Checks held, from none to met in person. Every badge states what was checked. */
export type VerificationTier = 0 | 1 | 2;

export interface StylistProfile {
  id: string;
  accountId: string;
  displayName: string;
  /** Unique, and the path of the public page: yasante.com/{handle}. */
  handle: string;
  bio?: string;
  avatarUri?: string;
  serviceModels: ServiceModel[];
  /** District only. The full address is shared once a booking is confirmed. */
  baseArea: string;
  travelRadiusMiles?: number;
  instagramHandle?: string;
  verificationTier: VerificationTier;
  createdAt: string;
}

/** What waits in stylist mode — drives the badge on the mode switch. */
export interface StylistSummary {
  pendingRequests: number;
  appointmentsToday: number;
}
