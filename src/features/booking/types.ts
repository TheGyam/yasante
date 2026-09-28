import type { ChosenOptions, StylistPolicies } from '@/features/stylist';

/**
 * The states a booking moves through, as the plan defines them. The server owns
 * every transition; the app reflects state and never decides it.
 */
export type BookingStatus =
  | 'requested'
  | 'awaiting_deposit'
  | 'confirmed'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'cancelled_in_time'
  | 'cancelled_late'
  | 'cancelled_by_stylist'
  | 'no_show';

/** What a stylist sees about a client when she's deciding on a request. */
export interface ClientRecord {
  attended: number;
  noShows: number;
  /** Cancelled outside her notice window. Early cancellations are never shown. */
  lateCancellations: number;
}

export interface Deposit {
  amount: number;
  /** How to pay her — a bank reference or a payment handle. Yasante never holds it. */
  method: string;
  status: 'awaiting' | 'received';
}

export interface Booking {
  id: string;
  status: BookingStatus;

  /** Absent once the client has deleted her account; the appointment stays on record. */
  clientId?: string;
  clientName: string;
  /** Her hair in one line, so a stylist knows what she's saying yes to. */
  clientHair?: string;
  /** Only sent to the stylist. A client never sees her own record. */
  clientRecord?: ClientRecord;

  /** Absent once the stylist has deleted her account. */
  stylistId?: string;
  stylistName: string;
  stylistHandle?: string;

  serviceId: string;
  serviceName: string;
  /** Style ids from the taxonomy, from the service. */
  styles?: string[];
  /** The length and size she chose, as the stylist named them. */
  optionLabels?: string[];
  price: number;
  fromPrice: boolean;
  durationMinutes?: number;
  bringingOwnHair: boolean;
  /** Whether the service includes the braiding hair, from her menu at the time. */
  hairIncluded?: boolean;
  notes?: string;
  /** An .ics link the server provides for the confirmed appointment. */
  calendarUrl?: string;

  /** The time she picked from the stylist's free slots. Older requests may hold three. */
  requestedTimes: string[];
  /** Set when the stylist accepts. */
  scheduledFor?: string;
  /** When a request or an unpaid deposit lapses on its own. The server enforces it. */
  expiresAt?: string;
  /** A time she suggested instead of the ones asked for. The client says yes or no. */
  proposal?: { scheduledFor: string; deposit?: { amount: number; method: string } };
  /** The client answered "Yes, I'm coming". */
  attendanceConfirmedAt?: string;
  /** How many times it has been moved. One move is free; a second is a cancellation. */
  moves: number;
  /** A move one side has asked for and the other hasn't answered. */
  moveRequest?: { by: BookingRole; scheduledFor: string };

  deposit?: Deposit;

  /** The district. The full address arrives only once the booking is confirmed. */
  area: string;
  /** The stylist travels to the client; `area` is then the client's postcode district. */
  atClient?: boolean;
  address?: string;
  /** The stylist's zone (IANA): appointment times read on her clock. */
  timeZone?: string;

  policy: StylistPolicies;
  /** The version of her terms the client ticked, stored so it can't be rewritten. */
  policyVersion: string;

  /** Why it ended, when it ended badly. */
  reason?: string;
  completedAt?: string;
  /** What she was actually paid, recorded at close-out. */
  actualPrice?: number;
  /** How the time went, recorded at close-out. */
  timing?: BookingTiming;
  /** The client's one tap: did it start on time? */
  startedOnTime?: boolean;
  /** A client may contest a no-show or a timing record, once each. */
  contested?: { noShow?: boolean; timing?: boolean };
  /** Her review, once she's left one. Only on the client's copy. */
  review?: Pick<Review, 'rating' | 'status'>;
  /** The look she booked from, if she did: the picture the stylist is being asked for. */
  fromLook?: {
    id: string;
    photoUri: string;
    feedUri?: string;
    thumbUri?: string;
    photoAspect?: number;
    caption?: string;
    authorName?: string;
  };
  /** The check-in the server is asking her for now, if any. Only on the client's copy. */
  checkInDue?: CheckInWeek;
  createdAt: string;
  updatedAt: string;
}

/** What the request screen sends. The server prices it and fills in the rest. */
export interface BookingDraft {
  stylistId: string;
  serviceId: string;
  /** Option ids from the service, by group. The server prices them. */
  options?: ChosenOptions;
  bringingOwnHair: boolean;
  requestedTimes: string[];
  notes?: string;
  policyVersion: string;
  /** The look she's booking from, so the stylist sees the picture. */
  lookId?: string;
  /** The stylist comes to the client, at this street and postcode. */
  atClient?: boolean;
  clientAddress?: string;
}

/** A stylist's free start times for one service, day by day. Only days with room. */
export interface FreeSlots {
  /** The stylist's zone (IANA): whose clock the times are on. */
  timeZone?: string;
  /** How long the job runs, which is what decides the times. */
  minutes: number;
  days: { date: string; times: string[] }[];
}

/** Whose side of the booking you're looking at. */
export type BookingRole = 'client' | 'stylist';

/**
 * A review. Only accepted against a completed booking, one per booking, and
 * checked before anyone else sees it.
 */
export interface Review {
  id: string;
  bookingId: string;
  rating: number;
  body?: string;
  status: 'pending' | 'published' | 'removed';
  /** First name only. */
  authorName: string;
  serviceName: string;
  createdAt: string;
}

/** Why someone reported a review. The wording is what the reporter sees. */
export const REVIEW_REPORT_REASONS = [
  { value: 'not-real', label: "This appointment didn't happen" },
  { value: 'private', label: 'It shares private details' },
  { value: 'hate', label: 'Hateful or abusive' },
  { value: 'other', label: 'Something else' },
] as const;
export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]['value'];

/** Check-ins come at week 2 and week 4 after a completed style. */
export type CheckInWeek = 2 | 4;

/** Three taps on how a style is holding up — the start of the outcome data. */
export interface CheckInAnswers {
  /** Is the style still in? "no" dates when it came out: how long styles last. */
  stillIn: 'yes' | 'no';
  holding: 'fresh' | 'okay' | 'tired';
  scalp: 'comfortable' | 'itchy' | 'sore';
  again: 'yes' | 'maybe' | 'no';
}

/** Finished early, on time or ran over — never free-typed minutes. */
export type TimingOutcome = 'early' | 'on_time' | 'over';
export type TimingBucket = 'under_30' | '30_60' | '1_2h' | '2h_plus';

export interface BookingTiming {
  outcome: TimingOutcome;
  bucket?: TimingBucket;
  reason?: TimingReason;
}

export const TIMING_BUCKETS: { value: TimingBucket; label: string }[] = [
  { value: 'under_30', label: 'Under 30 min' },
  { value: '30_60', label: '30–60 min' },
  { value: '1_2h', label: '1–2 hrs' },
  { value: '2h_plus', label: '2 hrs or more' },
];

/**
 * Why it ran early or over. Which side a reason falls on matters: only the
 * stylist- and job-side ones feed her public label, so a late client can't cost
 * her a badge — and she still sees the client-side ones privately.
 */
export const TIMING_REASONS = [
  { value: 'client_late', label: 'Client arrived late', side: 'client' },
  { value: 'hair_not_prepped', label: 'Hair not washed or detangled', side: 'client' },
  { value: 'wrong_hair', label: 'Wrong or not enough hair brought', side: 'client' },
  { value: 'old_style_in', label: 'Old style still in', side: 'client' },
  { value: 'style_changed', label: 'Changed the style on the day', side: 'client' },
  { value: 'long_breaks', label: 'Long breaks', side: 'client' },
  { value: 'took_longer', label: 'Style took longer than expected', side: 'stylist' },
  { value: 'more_hair', label: 'More hair or density than expected', side: 'stylist' },
  { value: 'previous_overran', label: 'Previous client overran', side: 'stylist' },
  { value: 'working_alone', label: 'Working alone', side: 'stylist' },
  { value: 'supplies', label: 'Supplies or equipment', side: 'stylist' },
  { value: 'own_delay', label: 'My own delay', side: 'stylist' },
] as const;
export type TimingReason = (typeof TIMING_REASONS)[number]['value'];

/** A client waiting for a slot with a stylist on any day in a range. */
export interface SlotInterest {
  id: string;
  stylistId: string;
  stylistName: string;
  stylistHandle?: string;
  from: string;
  to: string;
  /** The day a slot opened, once one has. */
  openedOn?: string;
  createdAt: string;
}

/** What a close-out records. */
export interface CloseOut {
  outcome: 'attended' | 'no_show';
  timing?: BookingTiming;
  actualPrice?: number;
}
