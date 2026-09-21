import type { Booking, BookingStatus, CheckInWeek, ClientRecord } from '@/features/booking';
import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

/**
 * The booking state machine. Every transition is checked here, because the plan
 * puts it on the server: the app reflects state and never decides it.
 */
const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  requested: ['awaiting_deposit', 'confirmed', 'declined', 'expired'],
  awaiting_deposit: ['confirmed', 'expired', 'cancelled_in_time', 'cancelled_late'],
  confirmed: [
    'completed',
    'no_show',
    'cancelled_in_time',
    'cancelled_late',
    'cancelled_by_stylist',
  ],
  completed: [],
  declined: [],
  expired: [],
  cancelled_in_time: [],
  cancelled_late: [],
  cancelled_by_stylist: [],
  no_show: [],
};

function move(booking: Booking, to: BookingStatus) {
  if (!ALLOWED[booking.status].includes(to)) {
    throw new MockError(409, `A booking that is ${booking.status} can't become ${to}`);
  }
  booking.status = to;
  booking.updatedAt = new Date().toISOString();
  if (to === 'completed') booking.completedAt = booking.updatedAt;
  return booking;
}

const DAY = 86_400_000;

/**
 * Which check-in is due, if any. Each gets a fortnight to be answered: an answer
 * about week 2 given in week 6 is noise, not data.
 */
export function checkInDue(
  completedAt: string | undefined,
  answered: number[],
  now = Date.now()
): CheckInWeek | undefined {
  if (!completedAt) return undefined;
  const days = (now - new Date(completedAt).getTime()) / DAY;
  if (days >= 28 && days < 42 && !answered.includes(4)) return 4;
  if (days >= 14 && days < 28 && !answered.includes(2)) return 2;
  return undefined;
}

const reviewOf = (bookingId: string) => db.reviews.find(r => r.bookingId === bookingId);

const find = (id: string) => {
  const booking = db.bookings.find(item => item.id === id);
  if (!booking) throw new MockError(404, 'That booking is gone');
  return booking;
};

const mine = (booking: Booking, accountId: string) => {
  if (booking.clientId !== accountId && booking.stylistId !== accountId) {
    throw new MockError(403, 'That booking isn’t yours');
  }
  return booking;
};

/** Her record, counted from her own history — never typed in by anyone. */
function recordOf(clientId: string): ClientRecord {
  const theirs = db.bookings.filter(b => b.clientId === clientId);
  return {
    attended: theirs.filter(b => b.status === 'completed').length,
    noShows: theirs.filter(b => b.status === 'no_show').length,
    // Early cancellations are deliberately not counted: cancelling in time is free.
    lateCancellations: theirs.filter(b => b.status === 'cancelled_late').length,
  };
}

/** Her hair in one line, from the profile she filled in. */
function hairOf(clientId: string) {
  const hair = db.accounts.get(clientId)?.hairProfile;
  if (!hair) return undefined;
  return [
    hair.texture,
    hair.length && `${hair.length} length`,
    hair.porosity && `${hair.porosity} porosity`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * What each side is allowed to see. The address is the one that matters: it is
 * never sent before the booking is confirmed, and never to anyone else.
 */
function forRole(booking: Booking, accountId: string) {
  const asStylist = booking.stylistId === accountId;
  const confirmed = booking.status === 'confirmed' || booking.status === 'completed';
  const review = reviewOf(booking.id);
  const answered = db.checkIns.filter(c => c.bookingId === booking.id).map(c => c.week);
  return {
    ...booking,
    clientHair: asStylist ? hairOf(booking.clientId) : undefined,
    clientRecord: asStylist ? recordOf(booking.clientId) : undefined,
    address: confirmed ? booking.address : undefined,
    review: !asStylist && review ? { rating: review.rating, status: review.status } : undefined,
    checkInDue: asStylist ? undefined : checkInDue(booking.completedAt, answered),
  };
}

const RATINGS = ['fresh', 'okay', 'tired'];
const SCALP = ['comfortable', 'itchy', 'sore'];
const AGAIN = ['yes', 'maybe', 'no'];

defineMocks({
  'GET /api/bookings/': request => {
    const accountId = requireAccount(request);
    const role = request.query.get('role') === 'stylist' ? 'stylist' : 'client';
    const wanted = (request.query.get('status') ?? '').split(',').filter(Boolean);

    return db.bookings
      .filter(b => (role === 'stylist' ? b.stylistId === accountId : b.clientId === accountId))
      .filter(b => !wanted.length || wanted.includes(b.status))
      .map(b => forRole(b, accountId));
  },

  'GET /api/bookings/:id/': request => {
    const accountId = requireAccount(request);
    return forRole(mine(find(request.params.id), accountId), accountId);
  },

  'POST /api/bookings/': request => {
    const accountId = requireAccount(request);
    const account = db.accounts.get(accountId);
    // The plan gates a request on a verified phone, and so does the server.
    if (!account?.phoneVerified) {
      throw new MockError(403, 'Verify your mobile number before you book');
    }

    const stylistId = String(request.body?.stylistId ?? '');
    const profile = db.stylists.get(stylistId);
    if (!profile?.published) throw new MockError(404, 'That stylist isn’t taking bookings');
    if (stylistId === accountId) throw new MockError(400, 'You can’t book yourself');

    const service = (db.menus.get(stylistId) ?? []).find(s => s.id === request.body?.serviceId);
    if (!service) throw new MockError(400, 'Pick a service from her menu');

    const times: string[] = (request.body?.requestedTimes ?? []).filter(Boolean);
    if (!times.length) throw new MockError(400, 'Say when you’d like to come');
    if (!request.body?.policyVersion) throw new MockError(400, 'Her terms have to be accepted');

    const when = new Date().toISOString();
    const booking: Booking = {
      id: `bk_${Date.now()}`,
      status: 'requested',
      clientId: accountId,
      clientName: account.name,
      stylistId,
      stylistName: profile.displayName,
      stylistHandle: profile.handle,
      serviceId: service.id,
      serviceName: service.name,
      // Priced at request time and stored, so a later price change can't rewrite it.
      price: service.price,
      fromPrice: service.fromPrice,
      durationMinutes: service.durationMinutes,
      bringingOwnHair: !!request.body?.bringingOwnHair,
      notes: request.body?.notes ? String(request.body.notes).trim() : undefined,
      requestedTimes: times,
      area: profile.baseArea,
      // Held but not sent until it's confirmed.
      address: `12 Bellenden Road, ${profile.baseArea}`,
      policy: profile.policies,
      policyVersion: String(request.body.policyVersion),
      createdAt: when,
      updatedAt: when,
    };
    db.bookings.unshift(booking);
    db.pendingRequests.set(stylistId, (db.pendingRequests.get(stylistId) ?? 0) + 1);
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/accept/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can accept it');

    const scheduledFor = String(request.body?.scheduledFor ?? '');
    if (!scheduledFor) throw new MockError(400, 'Pick the time you’re accepting');
    booking.scheduledFor = scheduledFor;

    const amount = Number(request.body?.deposit?.amount ?? 0);
    db.pendingRequests.set(accountId, Math.max(0, (db.pendingRequests.get(accountId) ?? 1) - 1));

    // No deposit, nothing to wait for: it's confirmed there and then.
    if (!amount) return forRole(move(booking, 'confirmed'), accountId);

    booking.deposit = {
      amount,
      method: String(request.body?.deposit?.method ?? '').trim(),
      status: 'awaiting',
    };
    return forRole(move(booking, 'awaiting_deposit'), accountId);
  },

  'POST /api/bookings/:id/decline/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can decline it');
    booking.reason = request.body?.reason ? String(request.body.reason).trim() : undefined;
    db.pendingRequests.set(accountId, Math.max(0, (db.pendingRequests.get(accountId) ?? 1) - 1));
    return forRole(move(booking, 'declined'), accountId);
  },

  'POST /api/bookings/:id/deposit-received/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can mark it received');
    if (booking.deposit) booking.deposit.status = 'received';
    return forRole(move(booking, 'confirmed'), accountId);
  },

  'POST /api/bookings/:id/cancel/': request => {
    const accountId = requireAccount(request);
    const booking = mine(find(request.params.id), accountId);
    booking.reason = request.body?.reason ? String(request.body.reason).trim() : undefined;

    if (booking.stylistId === accountId) {
      return forRole(move(booking, 'cancelled_by_stylist'), accountId);
    }

    // In time or late is the server's call, from her notice window.
    const hoursAway = booking.scheduledFor
      ? (new Date(booking.scheduledFor).getTime() - Date.now()) / 3_600_000
      : Infinity;
    const late = hoursAway < booking.policy.noticeHours;
    return forRole(move(booking, late ? 'cancelled_late' : 'cancelled_in_time'), accountId);
  },

  'POST /api/bookings/:id/close/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can close it');
    const noShow = request.body?.outcome === 'no_show';
    // A no-show can only be called once the appointment should have started.
    if (noShow && booking.scheduledFor && new Date(booking.scheduledFor) > new Date()) {
      throw new MockError(400, 'You can only mark a no-show after the start time');
    }
    return forRole(move(booking, noShow ? 'no_show' : 'completed'), accountId);
  },

  'POST /api/bookings/:id/review/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    // Only the person who sat in the chair, and only once she has.
    if (booking.clientId !== accountId) throw new MockError(403, 'Only the client can review it');
    if (booking.status !== 'completed') {
      throw new MockError(409, 'A review can only follow a completed appointment');
    }
    if (reviewOf(booking.id)) throw new MockError(409, 'You’ve already reviewed this one');

    const rating = Number(request.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new MockError(400, 'Give it between one and five stars');
    }
    const body = request.body?.body ? String(request.body.body).trim().slice(0, 1000) : undefined;

    const review = {
      id: `rev_${Date.now()}`,
      bookingId: booking.id,
      stylistId: booking.stylistId,
      clientId: accountId,
      rating,
      body: body || undefined,
      // Checked before anyone else sees it.
      status: 'pending' as const,
      authorName: booking.clientName.split(' ')[0],
      serviceName: booking.serviceName,
      createdAt: new Date().toISOString(),
    };
    db.reviews.push(review);
    return review;
  },

  'POST /api/bookings/:id/check-in/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.clientId !== accountId) throw new MockError(403, 'That booking isn’t yours');

    const answered = db.checkIns.filter(c => c.bookingId === booking.id).map(c => c.week);
    const week = Number(request.body?.week);
    if (week !== checkInDue(booking.completedAt, answered)) {
      throw new MockError(409, 'That check-in isn’t open');
    }
    const { holding, scalp, again } = request.body ?? {};
    if (!RATINGS.includes(holding) || !SCALP.includes(scalp) || !AGAIN.includes(again)) {
      throw new MockError(400, 'Answer all three');
    }
    db.checkIns.push({
      bookingId: booking.id,
      accountId,
      week: week as CheckInWeek,
      holding,
      scalp,
      again,
      at: new Date().toISOString(),
    });
    return null;
  },

  'POST /api/reviews/:id/report/': request => {
    const accountId = requireAccount(request);
    const review = db.reviews.find(r => r.id === request.params.id);
    if (!review) throw new MockError(404, 'That review is already gone');
    if (!request.body?.reason) throw new MockError(400, 'Say what’s wrong with it');
    db.reports.push({
      reviewId: review.id,
      reason: String(request.body.reason),
      note: request.body?.note ? String(request.body.note) : undefined,
      reportedBy: accountId,
      at: new Date().toISOString(),
    });
    return null;
  },
});
