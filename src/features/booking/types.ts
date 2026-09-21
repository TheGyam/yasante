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
