import type { Review } from '@/features/booking';

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

/** "09:00" to "18:00", or closed. */
export type DayHours = { start: string; end: string } | null;

export interface Availability {
  /** Sunday is 0, as JavaScript counts. */
  week: [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];
  /** Days off on top of the week — holidays, a wedding — as yyyy-MM-dd. */
  blocked: string[];
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
  /** When she works. Absent until she sets it, and then any day can be asked for. */
  availability?: Availability;
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
  | 'availability'
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

/**
 * Her page as a client sees it. Only what the plan says clients may see: never the
 * full address before a booking is confirmed, and never a phone number or email.
 */
export interface StylistPage {
  profile: StylistProfile;
  menu: MenuItem[];
  photos: PortfolioPhoto[];
  /** Styles clients confirmed she did — a count she can't type in herself. */
  confirmedStyles: number;
  /** The latest published reviews, newest first. Every one is from a completed booking. */
  reviews: Review[];
  /** Across every published review. Absent until there is one. */
  rating?: { average: number; count: number };
  /** How long she usually takes to answer a request, in hours. Absent until she has. */
  responseHours?: number;
  /** "Usually finishes on time", once there's enough to say it honestly. */
  timingLabel?: { outcome: 'early' | 'on_time' | 'over'; count: number; sample: number };
}

/** What waits in stylist mode — drives the badge on the mode switch. */
export interface StylistSummary {
  pendingRequests: number;
  appointmentsToday: number;
}
