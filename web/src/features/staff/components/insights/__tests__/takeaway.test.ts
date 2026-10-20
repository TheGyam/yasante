import { takeaway } from '../takeaway';
import type { Insight } from '../../../types';

const trends = (rows: Insight['rows']): Insight => ({
  name: 'hair-trends',
  title: 'Hair trends',
  kind: 'table',
  labels: [],
  rows,
  previous: null,
  meta: { minGroup: 20 },
  from: '2026-10-01',
  to: '2026-10-21',
});

describe('the hair trends headline', () => {
  it('says why there is nothing to show, rather than showing small groups', () => {
    expect(takeaway(trends([]))).toBe(
      'Not enough bookings yet to show trends: every group needs 20 or more'
    );
  });

  it('names the most booked style', () => {
    const row = { label: 'Knotless braids · Peckham · Oct 2026', values: [45, 0, 0, 100, 0] };
    expect(takeaway(trends([row]))).toBe(
      'Knotless braids is the most booked style in a group big enough to show'
    );
  });
});
