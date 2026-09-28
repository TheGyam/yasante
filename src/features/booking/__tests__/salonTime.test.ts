import { salonTime, whenLabel } from '../format';
import { zoneMark } from '@/shared/lib/timeZone';

describe('the stylist’s clock', () => {
  it('shows 09:30 UTC in October as 10:30 for a London stylist, UK summer time', () => {
    expect(salonTime('2026-10-01T09:30:00Z', 'Europe/London').getHours()).toBe(10);
    expect(whenLabel('2026-10-01T09:30:00Z', 'Europe/London')).toMatch(
      new RegExp(`10:30${zoneMark('Europe/London')}$`)
    );
  });

  it('shows winter times unshifted in London', () => {
    expect(salonTime('2026-12-01T09:30:00Z', 'Europe/London').getHours()).toBe(9);
  });

  it('reads a New York stylist’s times on New York’s clock, marked when that isn’t yours', () => {
    expect(salonTime('2026-10-01T14:00:00Z', 'America/New_York').getHours()).toBe(10);
    expect(zoneMark('America/New_York')).toMatch(/^( New York time)?$/);
  });

  it('with no zone, uses the phone’s own clock', () => {
    const at = new Date('2026-10-01T09:30:00Z');
    expect(salonTime(at).getHours()).toBe(at.getHours());
  });
});
