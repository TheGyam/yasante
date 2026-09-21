import { matchRoute, MockError } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../bookings';

/**
 * The booking state machine is the most consequential logic in the app: it decides
 * when an address is shared, what a cancellation costs, and what a stylist is told
 * about a client. These run against the mock, which is where it lives until the
 * backend does — and the rules have to survive that move.
 */
const call = (method: string, url: string, accountId: string, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

const CLIENT = 'acc_client';
const STYLIST = 'acc_ama';

const tomorrow = () => new Date(Date.now() + 24 * 3_600_000).toISOString();
const nextWeek = () => new Date(Date.now() + 7 * 24 * 3_600_000).toISOString();

const request = (times = [nextWeek()]) =>
  call('post', '/api/bookings/', CLIENT, {
    stylistId: STYLIST,
    serviceId: 'men_knotless',
    requestedTimes: times,
    policyVersion: '2026-09-draft',
  });

beforeEach(() => {
  db.bookings.length = 0;
});

describe('asking for a booking', () => {
  it('starts as a request, priced from her menu at the time', () => {
    const booking = request();
    expect(booking).toMatchObject({
      status: 'requested',
      serviceName: 'Knotless braids',
      price: 120,
      fromPrice: true,
    });
  });

  it('refuses what the plan refuses', () => {
    expect(() =>
      call('post', '/api/bookings/', CLIENT, { stylistId: STYLIST, serviceId: 'nope' })
    ).toThrow(MockError);
    // Her own booking, and a service that isn't on the menu.
    expect(() =>
      call('post', '/api/bookings/', STYLIST, {
        stylistId: STYLIST,
        serviceId: 'men_knotless',
        requestedTimes: [nextWeek()],
        policyVersion: 'v1',
      })
    ).toThrow(MockError);
  });
});

describe('the way a booking is confirmed', () => {
  it('goes request → deposit → confirmed, and only then shares the address', () => {
    const booking = request();
    expect(call('get', `/api/bookings/${booking.id}/`, CLIENT).address).toBeUndefined();

    const accepted = call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, {
      scheduledFor: nextWeek(),
      deposit: { amount: 20, method: 'Bank transfer' },
    });
    expect(accepted.status).toBe('awaiting_deposit');
    expect(call('get', `/api/bookings/${booking.id}/`, CLIENT).address).toBeUndefined();

    const confirmed = call('post', `/api/bookings/${booking.id}/deposit-received/`, STYLIST);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.deposit.status).toBe('received');
    expect(call('get', `/api/bookings/${booking.id}/`, CLIENT).address).toContain('Peckham');
  });

  it('skips the wait when she asks for no deposit', () => {
    const booking = request();
    const accepted = call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, {
      scheduledFor: nextWeek(),
    });
    expect(accepted.status).toBe('confirmed');
  });

  it('refuses a transition the machine doesn’t allow', () => {
    const booking = request();
    call('post', `/api/bookings/${booking.id}/decline/`, STYLIST, {});
    expect(() =>
      call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, { scheduledFor: nextWeek() })
    ).toThrow(/declined/);
  });

  it('lets only the stylist accept, decline or close', () => {
    const booking = request();
    expect(() =>
      call('post', `/api/bookings/${booking.id}/accept/`, CLIENT, { scheduledFor: nextWeek() })
    ).toThrow(MockError);
  });
});

describe('what a cancellation costs', () => {
  const confirmFor = (when: string) => {
    const booking = request([when]);
    call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, { scheduledFor: when });
    return booking;
  };

  it('is free outside her notice window', () => {
    // Ama asks for 48 hours; a week away is well clear.
    const booking = confirmFor(nextWeek());
    expect(call('post', `/api/bookings/${booking.id}/cancel/`, CLIENT, {}).status).toBe(
      'cancelled_in_time'
    );
  });

  it('counts inside it', () => {
    const booking = confirmFor(tomorrow());
    expect(call('post', `/api/bookings/${booking.id}/cancel/`, CLIENT, {}).status).toBe(
      'cancelled_late'
    );
  });

  it('is always the stylist’s when she is the one cancelling', () => {
    const booking = confirmFor(tomorrow());
    expect(call('post', `/api/bookings/${booking.id}/cancel/`, STYLIST, {}).status).toBe(
      'cancelled_by_stylist'
    );
  });
});

describe('what each side is told', () => {
  it('shows the stylist a record, and never shows the client her own', () => {
    const booking = request();
    call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, { scheduledFor: nextWeek() });

    expect(call('get', '/api/bookings/?role=stylist', STYLIST)[0].clientRecord).toMatchObject({
      attended: 0,
      noShows: 0,
      lateCancellations: 0,
    });
    expect(call('get', '/api/bookings/?role=client', CLIENT)[0].clientRecord).toBeUndefined();
  });

  it('counts a no-show, and never counts cancelling in good time', () => {
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const missed = request([past]);
    call('post', `/api/bookings/${missed.id}/accept/`, STYLIST, { scheduledFor: past });
    call('post', `/api/bookings/${missed.id}/close/`, STYLIST, { outcome: 'no_show' });

    const early = request([nextWeek()]);
    call('post', `/api/bookings/${early.id}/accept/`, STYLIST, { scheduledFor: nextWeek() });
    call('post', `/api/bookings/${early.id}/cancel/`, CLIENT, {});

    const next = request();
    const seen = call('get', `/api/bookings/${next.id}/`, STYLIST);
    expect(seen.clientRecord).toMatchObject({ noShows: 1, lateCancellations: 0 });
  });

  it('refuses a no-show before the appointment has started', () => {
    const booking = request([nextWeek()]);
    call('post', `/api/bookings/${booking.id}/accept/`, STYLIST, { scheduledFor: nextWeek() });
    expect(() =>
      call('post', `/api/bookings/${booking.id}/close/`, STYLIST, { outcome: 'no_show' })
    ).toThrow(/after the start time/);
  });
});
