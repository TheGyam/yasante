export type ServiceModel = 'salon' | 'home' | 'mobile';

/** Checks held, from none to met in person. Every badge states what was checked. */
export type VerificationTier = 0 | 1 | 2;

export type DepositType = 'none' | 'fixed' | 'percent';

/** Her terms, shown to a client before they ever send a request. */
export interface StylistPolicies {
  /** Hours of notice for a cancellation to count as in time. */
  noticeHours: number;
  depositType: DepositType;
  /** Pounds when fixed, percent of the price when percent. */
  depositAmount?: number;
  /** One move kept free, as the booking rules assume. */
  rescheduleFreeOnce: boolean;
}

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
  policies: StylistPolicies;
  /** One photo of her own work, for the verification queue. */
  proofPhotoUri?: string;
  verificationTier: VerificationTier;
  /** Live on yasante.com, or still a draft only she can see. */
  published: boolean;
  createdAt: string;
}

/** Everything the setup flow sends. The server fills in id, tier and dates. */
export type StylistProfileDraft = Pick<
  StylistProfile,
  | 'displayName'
  | 'handle'
  | 'bio'
  | 'serviceModels'
  | 'baseArea'
  | 'travelRadiusMiles'
  | 'instagramHandle'
  | 'policies'
  | 'proofPhotoUri'
>;

/** One line of her menu: what she does, what it costs, how long it takes. */
export interface MenuItem {
  id: string;
  name: string;
  /** Pounds. */
  price: number;
  /** Braids are priced by length and size, so most prices are a starting point. */
  fromPrice: boolean;
  durationMinutes?: number;
  /** "Hair not included", "Bring your own beads". */
  note?: string;
}

export type MenuItemDraft = Omit<MenuItem, 'id'>;

/** One picture of her work. */
export interface PortfolioPhoto {
  id: string;
  uri: string;
  /** The menu service it shows, when she's said — that's what ties a photo to a price. */
  serviceId?: string;
  createdAt: string;
}

export type PortfolioPhotoDraft = Pick<PortfolioPhoto, 'uri' | 'serviceId'>;

/** What waits in stylist mode — drives the badge on the mode switch. */
export interface StylistSummary {
  pendingRequests: number;
  appointmentsToday: number;
}
