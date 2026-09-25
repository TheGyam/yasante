import { DEFAULT_AVAILABILITY, closedReason, hoursLabel, isOpenOn, nextOpenDay } from '../format';
import type { Availability } from '../types';

// 2026-09-20 is a Sunday.
const day = (d: number) => new Date(2026, 8, d, 12);

describe('her working hours', () => {
  it('opens every day until she says otherwise', () => {
    expect(isOpenOn(undefined, day(20))).toBe(true);
  });

  it('closes her days off and her blocked dates, and says why', () => {
    const hours: Availability = { ...DEFAULT_AVAILABILITY, blocked: ['2026-09-23'] };
    expect(isOpenOn(hours, day(20))).toBe(false);
    expect(closedReason(hours, day(20))).toBe('They don’t work Suns');
    expect(isOpenOn(hours, day(22))).toBe(true);
    expect(closedReason(hours, day(23))).toBe('They’re away that day');
  });

  it('reads her week the way she’d say it', () => {
    expect(hoursLabel(DEFAULT_AVAILABILITY)).toBe('Tue–Sat, 09:00–18:00');
    const split: Availability = {
      week: [
        null,
        { start: '09:00', end: '17:00' },
        null,
        { start: '10:00', end: '18:00' },
        null,
        null,
        null,
      ],
      blocked: [],
    };
    expect(hoursLabel(split)).toBe('Mon, Wed');
  });

  it('suggests only days she works', () => {
    const hours: Availability = { ...DEFAULT_AVAILABILITY, blocked: ['2026-09-22'] };
    // From Sunday: Monday closed, Tuesday blocked, so Wednesday then Thursday.
    expect(nextOpenDay(hours, day(20))?.getDate()).toBe(23);
    expect(nextOpenDay(hours, day(20), 1)?.getDate()).toBe(24);
  });
});
