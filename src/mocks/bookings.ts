import type { MockBooking } from './db';
import type { Booking, BookingStatus, CheckInWeek, ClientRecord } from '@/features/booking';
import { TIMING_REASONS } from '@/features/booking/types';
import type { ChosenOptions, MenuItem } from '@/features/stylist';
import { estimate, freeStarts, isOpenOn, optionGroups, ymd } from '@/features/stylist/format';
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

function move(booking: MockBooking, to: BookingStatus) {
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

const HOUR = 3_600_000;

/** When each request was answered, for her typical response time. */
export const respondedAt = new Map<string, string>();

/**
 * A slot came free: anyone waiting on that stylist for that day hears about it.
 * The notification itself is the server's to send; this records that it's owed.
 */
function release(booking: MockBooking) {
  const day = (booking.scheduledFor ?? booking.requestedTimes[0] ?? '').slice(0, 10);
  if (!day) return;
  for (const interest of db.slotInterests) {
    if (
      interest.stylistId === booking.stylistId &&
      // Not the person whose booking it was: she knows.
      interest.clientId !== booking.clientId &&
      !interest.openedOn &&
      interest.from.slice(0, 10) <= day &&
      day <= interest.to.slice(0, 10)
    ) {
      interest.openedOn = day;
    }
  }
}

/**
 * The scheduled jobs, run lazily whenever bookings are read: requests and unpaid
 * deposits lapse, and an appointment nobody closed completes itself 24 hours on.
 */
function sweep(now = Date.now()) {
  for (const booking of db.bookings) {
    const lapsed = booking.expiresAt && new Date(booking.expiresAt).getTime() < now;
    if ((booking.status === 'requested' || booking.status === 'awaiting_deposit') && lapsed) {
      move(booking, 'expired');
      booking.expiresAt = undefined;
      release(booking);
    }
    if (booking.status === 'confirmed' && booking.scheduledFor) {
      const end =
        new Date(booking.scheduledFor).getTime() + (booking.durationMinutes ?? 120) * 60_000;
      if (end + 24 * HOUR < now) move(booking, 'completed');
    }
  }
}

/** Taking a time: straight to confirmed with no deposit, otherwise a day to pay it. */
function take(
  booking: MockBooking,
  scheduledFor: string,
  deposit?: { amount?: unknown; method?: unknown }
) {
  booking.scheduledFor = scheduledFor;
  booking.proposal = undefined;
  respondedAt.set(booking.id, new Date().toISOString());
  db.pendingRequests.set(
    booking.stylistId,
    Math.max(0, (db.pendingRequests.get(booking.stylistId) ?? 1) - 1)
  );

  const amount = Number(deposit?.amount ?? 0);
  if (!amount) {
    booking.expiresAt = undefined;
    return move(booking, 'confirmed');
  }
  booking.deposit = { amount, method: String(deposit?.method ?? '').trim(), status: 'awaiting' };
  booking.expiresAt = new Date(Date.now() + 24 * HOUR).toISOString();
  return move(booking, 'awaiting_deposit');
}

const OUTCOMES = ['early', 'on_time', 'over'];

/** What holds a slot in her diary: anything asked for, waiting on a deposit, or booked. */
const HOLDS: BookingStatus[] = ['requested', 'awaiting_deposit', 'confirmed'];

/** Her diary as time ranges, so a slot can't be offered — or asked for — twice. */
function busyFor(stylistId: string) {
  const blocked = db.timeBlocks
    .filter(b => b.stylistId === stylistId)
    .map(b => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }));
  return blocked.concat(
    db.bookings
      .filter(b => b.stylistId === stylistId && HOLDS.includes(b.status))
      .map(b => {
        const start = new Date(b.scheduledFor ?? b.proposal?.scheduledFor ?? b.requestedTimes[0]);
        return {
          start: start.getTime(),
          end: start.getTime() + (b.durationMinutes ?? 120) * 60_000,
        };
      })
  );
}

/** How long the job runs, from her menu and the options chosen. Unknown is two hours. */
const minutesFor = (service: MenuItem, chosen: ChosenOptions) =>
  estimate(service, chosen).minutes ?? service.durationMinutes ?? 120;

/** Her notice, a day unless she set it (the server's BOOKING_NOTICE_DEFAULT_HOURS). */
const leadMs = (availability?: { leadHours?: number }) => (availability?.leadHours ?? 24) * HOUR;
/** What an older app sees when it doesn't say which days. */
const SLOT_DAYS = 28;

const find = (id: string) => {
  sweep();
  const booking = db.bookings.find(item => item.id === id);
  if (!booking) throw new MockError(404, 'That booking is gone');
  return booking;
};

const mine = (booking: MockBooking, accountId: string) => {
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
function forRole(booking: MockBooking, accountId: string) {
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
    sweep();
    const role = request.query.get('role') === 'stylist' ? 'stylist' : 'client';
    const wanted = (request.query.get('status') ?? '').split(',').filter(Boolean);

    return db.bookings
      .filter(b => (role === 'stylist' ? b.stylistId === accountId : b.clientId === accountId))
      .filter(b => !wanted.length || wanted.includes(b.status))
      .map(b => forRole(b, accountId));
  },

  // Her free times for one service, day by day. Public, like her page.
  'GET /api/stylists/by-handle/:handle/slots/': request => {
    sweep();
    const handle = String(request.params.handle).toLowerCase();
    const profile = [...db.stylists.values()].find(p => p.handle === handle && p.published);
    if (!profile) throw new MockError(404, 'No page at that address');
    const service = (db.menus.get(profile.accountId) ?? []).find(
      s => s.id === request.query.get('service')
    );
    if (!service) throw new MockError(400, 'Pick a service from her menu');
    // Option ids, in any order; the group each belongs to comes from her menu.
    const ids = (request.query.get('options') ?? '').split(',').filter(Boolean);
    const chosen: ChosenOptions = {};
    for (const option of service.options ?? []) {
      if (ids.includes(option.id)) chosen[option.group] = option.id;
    }

    const minutes = minutesFor(service, chosen);
    const busy = busyFor(profile.accountId);
    const availability = profile.availability;
    const notBefore = Date.now() + leadMs(availability);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayAt = (offset: number) => {
      const day = new Date(today);
      day.setDate(today.getDate() + offset);
      return day;
    };
    // As far ahead as she books, twelve weeks unless she said.
    const reach = availability?.aheadDays ?? 84;
    const lastDate = ymd(dayAt(reach - 1));
    const closed = availability?.closed ?? [];
    const startsOn = (day: Date) =>
      closed.includes(ymd(day)) ? [] : freeStarts(availability, day, minutes, busy, notBefore);
    const asked = (key: string) => request.query.get(key) ?? '';
    const from = asked('from') || ymd(today);
    const to = asked('to') || ymd(dayAt(SLOT_DAYS - 1));
    const days = [];
    const full = [];
    const away = [];
    for (let i = 0; i < reach; i++) {
      const day = dayAt(i);
      const key = ymd(day);
      if (key < from || key > to) continue;
      const times = startsOn(day);
      if (times.length) {
        const busyThen = busy
          .filter(b => ymd(new Date(b.start)) === key)
          .map(b => ({
            start: new Date(b.start).toISOString(),
            end: new Date(b.end).toISOString(),
          }));
        days.push({ date: key, times: times.map(t => t.toISOString()), busy: busyThen });
      } else if (availability?.blocked.includes(key)) away.push(key);
      else if (closed.includes(key) || isOpenOn(availability, day)) full.push(key);
    }
    const first = (wanted: (day: Date) => boolean) => {
      for (let i = 0; i < reach; i++) {
        const day = dayAt(i);
        const times = wanted(day) ? startsOn(day) : [];
        if (times.length) return times[0].toISOString();
      }
      return undefined;
    };
    return {
      minutes,
      days,
      full,
      away,
      lastDate,
      noticeHours: availability?.leadHours ?? 24,
      soonest: first(() => true),
      weekend: first(day => day.getDay() === 0 || day.getDay() === 6),
    };
  },

  'GET /api/bookings/:id/': request => {
    const accountId = requireAccount(request);
    return forRole(mine(find(request.params.id), accountId), accountId);
  },

  'POST /api/bookings/': request => {
    const accountId = requireAccount(request);
    const account = db.accounts.get(accountId)!;

    const stylistId = String(request.body?.stylistId ?? '');
    const profile = db.stylists.get(stylistId);
    if (!profile?.published) throw new MockError(404, 'That stylist isn’t taking bookings');
    if (stylistId === accountId) throw new MockError(400, 'You can’t book yourself');

    const service = (db.menus.get(stylistId) ?? []).find(s => s.id === request.body?.serviceId);
    if (!service) throw new MockError(400, 'Pick a service from her menu');
    // Priced here from her menu, never from what the app says it costs.
    const chosen = request.body?.options ?? {};
    const priced = estimate(service, chosen);
    if (optionGroups(service).length && !priced.complete) {
      const missing = optionGroups(service)
        .map(g => g.name.toLowerCase())
        .join(' and ');
      throw new MockError(400, `Pick your ${missing} so she knows what to quote`);
    }

    const times: string[] = (request.body?.requestedTimes ?? []).filter(Boolean);
    if (!times.length) throw new MockError(400, 'Say when you’d like to come');
    // Only days she works. Her hours are hers to set; the server keeps to them.
    const closed = times.find(time => !isOpenOn(profile.availability, new Date(time)));
    if (closed) throw new MockError(400, 'She doesn’t work one of those days. Pick another');
    const minutes = minutesFor(service, chosen);
    const start = new Date(times[0]);
    if (profile.availability) {
      const day = new Date(start);
      day.setHours(0, 0, 0, 0);
      const fits = freeStarts(profile.availability, day, minutes).some(
        t => t.getTime() === start.getTime()
      );
      if (!fits) throw new MockError(400, 'That’s outside her hours. Pick one of her times');
    }
    // Two people can look at the same free slot; only the first to ask gets it.
    const end = start.getTime() + minutes * 60_000;
    if (busyFor(stylistId).some(b => start.getTime() < b.end && end > b.start)) {
      throw new MockError(409, 'Someone has just asked for that time. Pick another');
    }
    if (!request.body?.policyVersion) throw new MockError(400, 'Her terms have to be accepted');

    const when = new Date().toISOString();
    const booking: MockBooking = {
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
      optionLabels: priced.labels.length ? priced.labels : undefined,
      price: priced.price,
      fromPrice: priced.fromPrice,
      durationMinutes: priced.minutes,
      bringingOwnHair: !!request.body?.bringingOwnHair,
      hairIncluded: !!service.hairIncluded,
      notes: request.body?.notes ? String(request.body.notes).trim() : undefined,
      requestedTimes: times,
      area: profile.baseArea,
      // Held but not sent until it's confirmed.
      address: `12 Bellenden Road, ${profile.baseArea}`,
      policy: profile.policies,
      policyVersion: String(request.body.policyVersion),
      moves: 0,
      // She has 48 hours to answer before it lapses on its own.
      expiresAt: new Date(Date.now() + 48 * HOUR).toISOString(),
      createdAt: when,
      updatedAt: when,
    };
    db.bookings.unshift(booking);
    db.pendingRequests.set(stylistId, (db.pendingRequests.get(stylistId) ?? 0) + 1);
    // She's asked now: stop telling her a slot opened with this stylist.
    db.slotInterests = db.slotInterests.filter(
      i => !(i.clientId === accountId && i.stylistId === stylistId)
    );
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/accept/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can accept it');

    const scheduledFor = String(request.body?.scheduledFor ?? '');
    if (!scheduledFor) throw new MockError(400, 'Pick the time you’re accepting');
    return forRole(take(booking, scheduledFor, request.body?.deposit), accountId);
  },

  'POST /api/bookings/:id/decline/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can decline it');
    booking.reason = request.body?.reason ? String(request.body.reason).trim() : undefined;
    db.pendingRequests.set(accountId, Math.max(0, (db.pendingRequests.get(accountId) ?? 1) - 1));
    respondedAt.set(booking.id, new Date().toISOString());
    booking.expiresAt = undefined;
    return forRole(move(booking, 'declined'), accountId);
  },

  'POST /api/bookings/:id/deposit-received/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can mark it received');
    if (booking.deposit) booking.deposit.status = 'received';
    booking.expiresAt = undefined;
    return forRole(move(booking, 'confirmed'), accountId);
  },

  'POST /api/bookings/:id/cancel/': request => {
    const accountId = requireAccount(request);
    const booking = mine(find(request.params.id), accountId);
    booking.reason = request.body?.reason ? String(request.body.reason).trim() : undefined;

    booking.moveRequest = undefined;
    if (booking.stylistId === accountId) {
      move(booking, 'cancelled_by_stylist');
      release(booking);
      return forRole(booking, accountId);
    }

    // In time or late is the server's call, from her notice window.
    const hoursAway = booking.scheduledFor
      ? (new Date(booking.scheduledFor).getTime() - Date.now()) / 3_600_000
      : Infinity;
    const late = hoursAway < booking.policy.noticeHours;
    move(booking, late ? 'cancelled_late' : 'cancelled_in_time');
    booking.expiresAt = undefined;
    release(booking);
    return forRole(booking, accountId);
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
    // How the time went: an outcome, a size and a reason from the list. Never minutes.
    const timing = request.body?.timing;
    if (!noShow && timing) {
      if (!OUTCOMES.includes(timing.outcome)) throw new MockError(400, 'Say how the time went');
      if (timing.outcome !== 'on_time' && !timing.bucket) {
        throw new MockError(400, 'Say by roughly how much');
      }
      if (timing.reason && !TIMING_REASONS.some(r => r.value === timing.reason)) {
        throw new MockError(400, 'Pick a reason from the list');
      }
      booking.timing = {
        outcome: timing.outcome,
        bucket: timing.outcome === 'on_time' ? undefined : timing.bucket,
        reason: timing.outcome === 'on_time' ? undefined : timing.reason,
      };
    }
    const paid = Number(request.body?.actualPrice);
    if (!noShow && Number.isFinite(paid) && paid > 0) booking.actualPrice = paid;
    return forRole(move(booking, noShow ? 'no_show' : 'completed'), accountId);
  },

  'POST /api/bookings/:id/propose/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.stylistId !== accountId) throw new MockError(403, 'Only she can suggest a time');
    if (booking.status !== 'requested') throw new MockError(409, 'That request has moved on');
    const scheduledFor = String(request.body?.scheduledFor ?? '');
    if (!scheduledFor) throw new MockError(400, 'Pick the time you’re suggesting');
    const amount = Number(request.body?.deposit?.amount ?? 0);
    booking.proposal = {
      scheduledFor,
      deposit: amount
        ? { amount, method: String(request.body?.deposit?.method ?? '').trim() }
        : undefined,
    };
    respondedAt.set(booking.id, new Date().toISOString());
    // Now the client has 48 hours to answer.
    booking.expiresAt = new Date(Date.now() + 48 * HOUR).toISOString();
    booking.updatedAt = new Date().toISOString();
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/proposal/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.clientId !== accountId) throw new MockError(403, 'That isn’t yours to answer');
    if (booking.status !== 'requested' || !booking.proposal) {
      throw new MockError(409, 'There’s no suggested time to answer');
    }
    if (request.body?.accept) {
      const { scheduledFor, deposit } = booking.proposal;
      return forRole(take(booking, scheduledFor, deposit), accountId);
    }
    booking.proposal = undefined;
    booking.expiresAt = undefined;
    booking.reason = 'The suggested time didn’t work';
    return forRole(move(booking, 'declined'), accountId);
  },

  'POST /api/bookings/:id/attending/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.clientId !== accountId) throw new MockError(403, 'That booking isn’t yours');
    if (booking.status !== 'confirmed') throw new MockError(409, 'Only a confirmed booking');
    booking.attendanceConfirmedAt = new Date().toISOString();
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/move/': request => {
    const accountId = requireAccount(request);
    const booking = mine(find(request.params.id), accountId);
    if (booking.status !== 'confirmed') throw new MockError(409, 'Only a confirmed booking moves');
    // One free move keeps the deposit and the history. A second is a cancellation.
    if (booking.moves >= 1) {
      throw new MockError(409, 'It’s been moved once already. Cancel it and book again instead');
    }
    if (booking.moveRequest) throw new MockError(409, 'A move is already waiting for an answer');
    const scheduledFor = String(request.body?.scheduledFor ?? '');
    if (!scheduledFor || new Date(scheduledFor).getTime() < Date.now()) {
      throw new MockError(400, 'Pick a time that hasn’t passed');
    }
    booking.moveRequest = {
      by: booking.stylistId === accountId ? 'stylist' : 'client',
      scheduledFor,
    };
    booking.updatedAt = new Date().toISOString();
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/move/answer/': request => {
    const accountId = requireAccount(request);
    const booking = mine(find(request.params.id), accountId);
    const asked = booking.moveRequest;
    if (!asked) throw new MockError(409, 'There’s no move to answer');
    const side = booking.stylistId === accountId ? 'stylist' : 'client';
    if (asked.by === side) throw new MockError(403, 'The other side answers a move');
    if (request.body?.accept) {
      booking.scheduledFor = asked.scheduledFor;
      booking.moves += 1;
      // A new day needs a new "yes, I'm coming".
      booking.attendanceConfirmedAt = undefined;
    }
    booking.moveRequest = undefined;
    booking.updatedAt = new Date().toISOString();
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/started-on-time/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.clientId !== accountId) throw new MockError(403, 'That booking isn’t yours');
    if (booking.status !== 'completed') throw new MockError(409, 'Once it’s done');
    if (booking.startedOnTime !== undefined) throw new MockError(409, 'You’ve already answered');
    booking.startedOnTime = !!request.body?.onTime;
    return forRole(booking, accountId);
  },

  'POST /api/bookings/:id/contest/': request => {
    const accountId = requireAccount(request);
    const booking = find(request.params.id);
    if (booking.clientId !== accountId) throw new MockError(403, 'That booking isn’t yours');
    const what = request.body?.what;
    booking.contested = booking.contested ?? {};
    if (what === 'no_show') {
      if (booking.status !== 'no_show') throw new MockError(409, 'It wasn’t marked a no-show');
      if (booking.contested.noShow) throw new MockError(409, 'You’ve already contested it');
      booking.contested.noShow = true;
    } else if (what === 'timing') {
      if (!booking.timing) throw new MockError(409, 'There’s no timing record');
      if (booking.contested.timing) throw new MockError(409, 'You’ve already contested it');
      booking.contested.timing = true;
    } else {
      throw new MockError(400, 'Say what you’re contesting');
    }
    return forRole(booking, accountId);
  },

  'GET /api/slot-interests/': request => {
    const accountId = requireAccount(request);
    return db.slotInterests
      .filter(i => i.clientId === accountId)
      .map(({ clientId: _c, ...interest }) => {
        const profile = db.stylists.get(interest.stylistId);
        return {
          ...interest,
          stylistName: profile?.displayName ?? 'A stylist',
          stylistHandle: profile?.handle,
        };
      });
  },

  'POST /api/slot-interests/': request => {
    const accountId = requireAccount(request);
    const stylistId = String(request.body?.stylistId ?? '');
    const profile = db.stylists.get(stylistId);
    if (!profile?.published) throw new MockError(404, 'No stylist to wait for');
    const from = String(request.body?.from ?? '');
    const to = String(request.body?.to ?? '');
    if (!from || !to || to < from) throw new MockError(400, 'Pick the days you could do');
    const interest = {
      id: 'slot_' + Date.now(),
      clientId: accountId,
      stylistId,
      from,
      to,
      createdAt: new Date().toISOString(),
    };
    db.slotInterests.push(interest);
    const { clientId: _c, ...shown } = interest;
    return { ...shown, stylistName: profile.displayName, stylistHandle: profile.handle };
  },

  'DELETE /api/slot-interests/:id/': request => {
    const accountId = requireAccount(request);
    const index = db.slotInterests.findIndex(
      i => i.id === request.params.id && i.clientId === accountId
    );
    if (index < 0) throw new MockError(404, 'Already gone');
    db.slotInterests.splice(index, 1);
    return null;
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
    const { holding, scalp, again, stillIn } = request.body ?? {};
    // The scalp question is only asked with hair details consent.
    if (!RATINGS.includes(holding) || (scalp && !SCALP.includes(scalp)) || !AGAIN.includes(again)) {
      throw new MockError(400, 'Answer every question');
    }
    db.checkIns.push({
      bookingId: booking.id,
      accountId,
      week: week as CheckInWeek,
      stillIn: stillIn === false ? 'no' : 'yes',
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
