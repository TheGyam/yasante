import { formatDuration, hoursLabel, replyLabel, serviceDetails, timingLabelText } from '../format';
import type { Availability, MenuItem } from '../types';

const nineToSix = { start: '09:00', end: '18:00' };

describe('her page’s wording', () => {
  it('says hours the way she would', () => {
    expect(formatDuration(210)).toBe('3 hrs 30 mins');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(45)).toBe('45 mins');
  });

  it('reads her week at a glance', () => {
    const week: Availability['week'] = [
      null,
      null,
      nineToSix,
      nineToSix,
      nineToSix,
      nineToSix,
      nineToSix,
    ];
    expect(hoursLabel({ week, blocked: [] })).toBe('Tue–Sat, 09:00–18:00');
    expect(hoursLabel({ week: [null, null, null, null, null, null, null], blocked: [] })).toBe(
      'Not taking bookings at the moment'
    );
  });

  it('always shows how many appointments a timing claim rests on', () => {
    expect(timingLabelText({ outcome: 'on_time', count: 8, sample: 10 })).toBe(
      'Usually finishes on time · 8 of 10 appointments'
    );
    expect(timingLabelText(undefined)).toBeUndefined();
    expect(replyLabel(3)).toBe('Usually replies within a few hours');
  });

  it('describes a service from what she set', () => {
    const item = {
      id: '1',
      name: 'Knotless braids',
      price: 120,
      fromPrice: true,
      durationMinutes: 300,
      hairIncluded: true,
      styles: [],
      options: [
        { id: 'a', group: 'length', label: 'Waist', add: 40 },
        { id: 'b', group: 'size', label: 'Small', add: 40 },
      ],
    } as MenuItem;
    expect(serviceDetails(item)).toBe('5 hrs · priced by length and size · hair included');
  });
});
