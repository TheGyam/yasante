import type { StylistPolicies } from '@/features/stylist';

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

  clientId: string;
  clientName: string;
  /** Her hair in one line, so a stylist knows what she's saying yes to. */
  clientHair?: string;
  /** Only sent to the stylist. A client never sees her own record. */
  clientRecord?: ClientRecord;

  stylistId: string;
  stylistName: string;
  stylistHandle?: string;

  serviceId: string;
  serviceName: string;
  price: number;
  fromPrice: boolean;
  durationMinutes?: number;
  bringingOwnHair: boolean;
  notes?: string;

  /** Her first choice and two alternatives, in order of preference. */
  requestedTimes: string[];
  /** Set when the stylist accepts. */
  scheduledFor?: string;

  deposit?: Deposit;

  /** The district. The full address arrives only once the booking is confirmed. */
  area: string;
  address?: string;

  policy: StylistPolicies;
  /** The version of her terms the client ticked, stored so it can't be rewritten. */
  policyVersion: string;

  /** Why it ended, when it ended badly. */
  reason?: string;
  completedAt?: string;
  /** Her review, once she's left one. Only on the client's copy. */
  review?: Pick<Review, 'rating' | 'status'>;
  /** The check-in the server is asking her for now, if any. Only on the client's copy. */
  checkInDue?: CheckInWeek;
  createdAt: string;
  updatedAt: string;
}

/** What the request screen sends. The server prices it and fills in the rest. */
export interface BookingDraft {
  stylistId: string;
  serviceId: string;
  bringingOwnHair: boolean;
  requestedTimes: string[];
  notes?: string;
  policyVersion: string;
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
  holding: 'fresh' | 'okay' | 'tired';
  scalp: 'comfortable' | 'itchy' | 'sore';
  again: 'yes' | 'maybe' | 'no';
}
