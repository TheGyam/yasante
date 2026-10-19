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

/**
 * A way to be paid a deposit — her bank details, a Monzo link. Saved once and
 * picked per request. Only ever shown to a client whose request she's accepted,
 * never on her page, and Yasante never moves the money.
 */
export interface PaymentMethod {
  id: string;
  /** "Bank transfer", "Monzo". */
  label: string;
  /** What the client needs to pay: account name and numbers, or a link. */
  details: string;
}

/** "09:00" to "18:00", or closed. */
export type DayHours = { start: string; end: string } | null;

/** Part of a day she's taken out of her diary. Clients see it as booked. */
export interface TimeBlock {
  id: string;
  start: string;
  end: string;
  /** Hers alone: never shown to clients. */
  note?: string;
  /** Weekdays it comes round again (Sunday 0) at the same time; empty is once. */
  repeats?: number[];
  /** Days still to come it doesn't come round, yyyy-MM-dd. */
  skips?: string[];
}

export interface Availability {
  /** Sunday is 0, as JavaScript counts. */
  week: [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];
  /** Days off on top of the week — holidays, a wedding — as yyyy-MM-dd. */
  blocked: string[];
  /** Days she's closed to new bookings (she has enough clients); what's booked stays. */
  closed?: string[];
  /** The notice she needs before an appointment, in hours. A day when unset. */
  leadHours?: number;
  /** How far ahead clients can book her, in days. Twelve weeks when unset. */
  aheadDays?: number;
  /** Minutes she keeps free between clients. */
  gapMinutes?: number;
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
  /** Where she works (ISO 3166). */
  country?: string;
  /** Her country's currency (ISO 4217): every price on her page is in it. */
  currency?: string;
  /** Her own page only: where clients go, shared with a booking once it's confirmed. */
  address?: string;
  /** Where her working hours are (IANA), from her phone. */
  timeZone?: string;
  travelRadiusMiles?: number;
  instagramHandle?: string;
  tiktokHandle?: string;
  /** Set up by Yasante, with their yes, and not taking bookings on Yasante yet. */
  featured?: boolean;
  /** Still Yasante's to hand over: the stylist can make it theirs. */
  claimable?: boolean;
  policies: StylistPolicies;
  /** When she works. Absent until she sets it; until then, every day 9 to 6. */
  availability?: Availability;
  /** How she's paid deposits. Private: stripped from her public page. */
  paymentMethods?: PaymentMethod[];
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
  | 'country'
  | 'address'
  | 'timeZone'
  | 'travelRadiusMiles'
  | 'instagramHandle'
  | 'tiktokHandle'
  | 'policies'
  | 'proofPhotoUri'
  | 'availability'
  | 'paymentMethods'
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
  /** What changes the price: longer or smaller costs more, on top of the base. */
  options?: PriceOption[];
  /** Braiding hair is in the price, so she brings it. */
  hairIncluded?: boolean;
}

export type OptionGroup = 'length' | 'size';

/** "Waist length, +£40, +1 hr". The base price is the first choice in each group. */
export interface PriceOption {
  id: string;
  group: OptionGroup;
  label: string;
  /** Pounds on top of the base. */
  add: number;
  addMinutes?: number;
}

export type MenuItemDraft = Omit<MenuItem, 'id'>;

/** One picture of her work. */
export interface PortfolioPhoto {
  id: string;
  uri: string;
  /** A smaller copy for grids. */
  thumbUri?: string;
  /** The menu service it shows, when she's said — that's what ties a photo to a price. */
  serviceId?: string;
  /** The look it was shared as, when she posted it to Looks while adding it. */
  lookId?: string;
  /** Every photo of that look, in order, when it has more than one. */
  lookPhotos?: { uri: string; thumbUri?: string }[];
  createdAt: string;
}

export type PortfolioPhotoDraft = Pick<PortfolioPhoto, 'uri' | 'serviceId'>;

/**
 * Her page as a client sees it. Only what the plan says clients may see: never the
 * full address before a booking is confirmed, and never a phone number or email.
 */
export interface StylistPage {
  profile: StylistProfile;
  /** On a featured page, for someone signed in: whether they're on its waitlist. */
  waitlistJoined?: boolean;
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
/** One week of her business, counted by the server. */
export interface WeekCounts {
  views: number;
  requests: number;
  confirmed: number;
  completed: number;
  noShows: number;
  lateCancellations: number;
  /** What she was paid for completed appointments, where she recorded it. */
  earned: number;
}

/** How a service really runs against what she quotes. Private: no threshold. */
export interface ServiceTiming {
  serviceId: string;
  serviceName: string;
  quotedMinutes?: number;
  /** Her usual actual time, from close-outs. */
  typicalMinutes?: number;
  /** How many close-outs it's from. Always shown. */
  sample: number;
  early: number;
  onTime: number;
  over: number;
  /** Of the overruns, how many were down to the client — for tightening her prep notes. */
  clientSide: number;
}

export interface StylistNumbers {
  weekOf: string;
  thisWeek: WeekCounts;
  lastWeek: WeekCounts;
  timing: ServiceTiming[];
}

/** A live page as search lists it: enough to recognise her and open it. */
export interface StylistSearchResult {
  accountId: string;
  handle: string;
  displayName: string;
  avatarUri?: string;
  baseArea: string;
  /** The currency her prices are in (ISO 4217). */
  currency?: string;
  /** Searching by style: their service for it, what it starts at, and their work in it. */
  serviceId?: string;
  fromPrice?: number;
  rating?: number;
  ratingCount?: number;
  verificationTier?: number;
  photoUri?: string;
  lookId?: string;
  /** The photo shows this style, rather than just their recent work. */
  photoOfStyle?: boolean;
  /** How far, when searching near someone. */
  miles?: number;
}

export interface StylistSummary {
  pendingRequests: number;
  appointmentsToday: number;
}
