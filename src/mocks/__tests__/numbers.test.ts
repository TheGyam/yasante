import { db } from '../db';
import '../bookings';
import { numbersFor, timingFor } from '../stylist';

const base = db.bookings.find(b => b.id === 'bk_seed_efua')!;
const now = new Date('2026-09-23T12:00:00'); // a Wednesday

beforeEach(() => {
  db.bookings.length = 0;
  db.pageViews.length = 0;
});

describe('her numbers', () => {
  it('counts this week against last, from Monday', () => {
    db.pageViews.push(
      { stylistId: 'acc_ama', at: '2026-09-22T10:00:00' },
      { stylistId: 'acc_ama', at: '2026-09-21T09:00:00' },
      { stylistId: 'acc_ama', at: '2026-09-18T09:00:00' }
    );
    db.bookings.push(
      {
        ...base,
        id: 'a',
        status: 'completed',
        completedAt: '2026-09-22T15:00:00',
        actualPrice: 140,
      },
      { ...base, id: 'b', status: 'no_show', scheduledFor: '2026-09-17T10:00:00' }
    );
    const numbers = numbersFor('acc_ama', now);
    expect(numbers.thisWeek).toMatchObject({ views: 2, completed: 1, earned: 140, noShows: 0 });
    expect(numbers.lastWeek).toMatchObject({ views: 1, noShows: 1 });
  });

  it('works out how long a service really runs, from the middle of each bucket', () => {
    const closed = (id: string, outcome: string, bucket?: string, reason?: string) => ({
      ...base,
      id,
      status: 'completed' as const,
      durationMinutes: 300,
      timing: { outcome, bucket, reason } as never,
    });
    db.bookings.push(
      closed('1', 'over', '1_2h'),
      closed('2', 'over', '1_2h', 'client_late'),
      closed('3', 'on_time')
    );
    expect(timingFor('acc_ama')).toEqual([
      {
        serviceId: 'men_knotless',
        serviceName: 'Knotless braids',
        quotedMinutes: 300,
        typicalMinutes: 390,
        sample: 3,
        early: 0,
        onTime: 1,
        over: 2,
        clientSide: 1,
      },
    ]);
  });
});
