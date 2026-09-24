import { consistency, recentDays } from '../format';

const now = new Date(2026, 8, 24, 12);
const at = (daysAgo: number) => ({ completedAt: new Date(2026, 8, 24 - daysAgo, 9).toISOString() });

describe('care plan consistency', () => {
  it('counts the last 30 days against what the plan asks for', () => {
    const weekly = { frequency: 'weekly' as const };
    expect(consistency(weekly, [at(1), at(8), at(15), at(40)], now)).toEqual({
      done: 3,
      share: 3 / (30 / 7),
    });
    // More often than planned is full, never over.
    expect(consistency(weekly, [0, 1, 2, 3, 4, 5].map(at), now).share).toBe(1);
  });

  it('marks the days she followed it, oldest first, ending today', () => {
    const days = recentDays([at(0), at(2)], 5, now);
    expect(days.map(d => d.done)).toEqual([false, false, true, false, true]);
    expect(days[4].today).toBe(true);
  });
});
