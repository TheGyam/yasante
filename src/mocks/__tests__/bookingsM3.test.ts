import { matchRoute, MockError } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../bookings';
import { timingLabelFor } from '../stylist';

const call = (method: string, url: string, accountId: string, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

const CLIENT = 'acc_client';
const STYLIST = 'acc_ama';
const HOUR = 3_600_000;
const inDays = (days: number) => new Date(Date.now() + days * 24 * HOUR).toISOString();

const request = (when = inDays(7)) =>
  call('post', '/api/bookings/', CLIENT, {
    stylistId: STYLIST,
    serviceId: 'men_knotless',
    requestedTimes: [when],
    policyVersion: 'v1',
  });

const confirmed = (when = inDays(7)) => {
  const booking = request(when);
  call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, { scheduledFor: when });
  return booking;
};

const get = (id: string, who = CLIENT) => call('get', `/api/bookings/${id}/`, who);

beforeEach(() => {
  db.bookings.length = 0;
  db.slotInterests.length = 0;
});

describe('a suggested time', () => {
  it('waits for the client, then becomes the booking with her deposit', () => {
    const booking = request();
    const suggested = inDays(10);
    call('post', `/api/bookings/${booking.id}/propose/`, STYLIST, {
      scheduledFor: suggested,
      deposit: { amount: 25, method: 'Transfer' },
    });
    expect(get(booking.id)).toMatchObject({
      status: 'requested',
      proposal: { scheduledFor: suggested },
    });

    const taken = call('post', `/api/bookings/${booking.id}/proposal/`, CLIENT, { accept: true });
    expect(taken).toMatchObject({
      status: 'awaiting_deposit',
      scheduledFor: suggested,
      deposit: { amount: 25 },
    });
    expect(taken.proposal).toBeUndefined();
    expect(taken.expiresAt).toBeDefined();
  });

  it('ends the request when it doesn’t work for her', () => {
    const booking = request();
    call('post', `/api/bookings/${booking.id}/propose/`, STYLIST, { scheduledFor: inDays(10) });
    expect(
      call('post', `/api/bookings/${booking.id}/proposal/`, CLIENT, { accept: false }).status
    ).toBe('declined');
  });
});

describe('the scheduled jobs', () => {
  it('lapse an unanswered request and tell whoever was waiting for that day', () => {
    const day = inDays(5);
    const booking = request(day);
    call('post', '/api/slot-interests/', 'acc_zainab', {
      stylistId: STYLIST,
      from: inDays(4),
      to: inDays(6),
    });
    db.bookings[0].expiresAt = new Date(Date.now() - 1000).toISOString();

    expect(get(booking.id).status).toBe('expired');
    expect(call('get', '/api/slot-interests/', 'acc_zainab')[0].openedOn).toBe(day.slice(0, 10));
  });

  it('complete an appointment nobody closed, a day after it ended', () => {
    const booking = confirmed(inDays(7));
    db.bookings[0].scheduledFor = new Date(Date.now() - 40 * HOUR).toISOString();
    expect(get(booking.id).status).toBe('completed');
  });
});

describe('a cancellation', () => {
  it('releases the slot to the waitlist, but not to days outside it', () => {
    const day = inDays(7);
    const booking = confirmed(day);
    const watch = (from: number, to: number) =>
      call('post', '/api/slot-interests/', 'acc_zainab', {
        stylistId: STYLIST,
        from: inDays(from),
        to: inDays(to),
      });
    watch(6, 8);
    watch(20, 21);
    // The client who cancels was waiting on the same days herself; she isn't told.
    call('post', '/api/slot-interests/', CLIENT, {
      stylistId: STYLIST,
      from: inDays(6),
      to: inDays(8),
    });
    call('post', `/api/bookings/${booking.id}/cancel/`, CLIENT, {});
    const [inRange, outside] = call('get', '/api/slot-interests/', 'acc_zainab');
    expect(inRange.openedOn).toBe(day.slice(0, 10));
    expect(outside.openedOn).toBeUndefined();
    expect(call('get', '/api/slot-interests/', CLIENT)[0].openedOn).toBeUndefined();
  });
});

describe('moving it', () => {
  it('is free once, needs the other side, and resets "I’m coming"', () => {
    const booking = confirmed();
    call('post', `/api/bookings/${booking.id}/attending/`, CLIENT);
    expect(get(booking.id).attendanceConfirmedAt).toBeDefined();

    const later = inDays(9);
    call('post', `/api/bookings/${booking.id}/move/`, CLIENT, { scheduledFor: later });
    expect(() =>
      call('post', `/api/bookings/${booking.id}/move/answer/`, CLIENT, { accept: true })
    ).toThrow(/other side/);
    const moved = call('post', `/api/bookings/${booking.id}/move/answer/`, STYLIST, {
      accept: true,
    });
    expect(moved).toMatchObject({ moves: 1, scheduledFor: later });
    expect(moved.attendanceConfirmedAt).toBeUndefined();

    expect(() =>
      call('post', `/api/bookings/${booking.id}/move/`, STYLIST, { scheduledFor: inDays(12) })
    ).toThrow(/Cancel it/);
  });
});

describe('closing out', () => {
  const started = () => confirmed(new Date(Date.now() - HOUR).toISOString());

  it('records the timing as taps, never minutes, and what was paid', () => {
    const booking = started();
    expect(() =>
      call('post', `/api/bookings/${booking.id}/close/`, STYLIST, {
        outcome: 'attended',
        timing: { outcome: 'over' },
      })
    ).toThrow(/how much/);

    const closed = call('post', `/api/bookings/${booking.id}/close/`, STYLIST, {
      outcome: 'attended',
      timing: { outcome: 'over', bucket: '30_60', reason: 'client_late' },
      actualPrice: 140,
    });
    expect(closed).toMatchObject({
      status: 'completed',
      timing: { outcome: 'over', bucket: '30_60', reason: 'client_late' },
      actualPrice: 140,
    });
  });

  it('lets the client contest a no-show once', () => {
    const missed = started();
    call('post', `/api/bookings/${missed.id}/close/`, STYLIST, { outcome: 'no_show' });
    call('post', `/api/bookings/${missed.id}/contest/`, CLIENT, { what: 'no_show' });
    expect(() =>
      call('post', `/api/bookings/${missed.id}/contest/`, CLIENT, { what: 'no_show' })
    ).toThrow(MockError);
    expect(() =>
      call('post', `/api/bookings/${missed.id}/contest/`, CLIENT, { what: 'timing' })
    ).toThrow(/no timing/);
  });
});

describe('her public timing label', () => {
  const done = (outcome: string, reason?: string) => {
    request(inDays(-3));
    Object.assign(db.bookings[0], {
      status: 'completed',
      completedAt: new Date().toISOString(),
      timing: { outcome, bucket: outcome === 'on_time' ? undefined : '30_60', reason },
    });
  };

  it('waits for ten appointments and six fair records, then needs 60%', () => {
    for (let i = 0; i < 9; i++) done('on_time');
    expect(timingLabelFor(STYLIST)).toBeUndefined();

    done('on_time');
    expect(timingLabelFor(STYLIST)).toEqual({ outcome: 'on_time', count: 10, sample: 10 });
  });

  it('leaves out lateness blamed on the client, and anything contested', () => {
    for (let i = 0; i < 5; i++) done('over', 'client_late');
    for (let i = 0; i < 6; i++) done('on_time');
    // The client-side overruns don't count against her: 6 of 6 fair records were on time.
    expect(timingLabelFor(STYLIST)).toEqual({ outcome: 'on_time', count: 6, sample: 6 });

    // Newest first, so these two are on-time records she contested.
    db.bookings.slice(0, 2).forEach(b => (b.contested = { timing: true }));
    expect(timingLabelFor(STYLIST)).toBeUndefined();
  });
});

describe('her working hours', () => {
  it('refuse a request for a day she doesn’t work', () => {
    // Zainab is closed on Sundays and Mondays.
    db.menus.set('acc_zainab', [
      { id: 'z_press', name: 'Silk press', price: 55, fromPrice: false, durationMinutes: 120 },
    ]);
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7));
    expect(() =>
      call('post', '/api/bookings/', CLIENT, {
        stylistId: 'acc_zainab',
        serviceId: 'z_press',
        requestedTimes: [sunday.toISOString()],
        policyVersion: 'v1',
      })
    ).toThrow(/doesn’t work/);
  });
});

describe('pricing a request', () => {
  const ask = (options?: Record<string, string>) =>
    call('post', '/api/bookings/', CLIENT, {
      stylistId: STYLIST,
      serviceId: 'men_cornrows',
      options,
      requestedTimes: [inDays(7)],
      policyVersion: 'v1',
    });

  it('needs every option chosen, and prices it from her menu', () => {
    expect(() => ask()).toThrow(/Pick your size/);
    expect(ask({ size: 'cr_small' })).toMatchObject({
      price: 75,
      fromPrice: false,
      durationMinutes: 180,
      optionLabels: ['Small'],
    });
  });
});
