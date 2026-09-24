import { salonTime, whenLabel } from '../format';

// Appointments are in London; a phone set to another zone must still show London time,
// the same time the notifications and the stylist see.
describe('salon time', () => {
  it('shows 09:30 UTC in October as 10:30, London summer time', () => {
    expect(whenLabel('2026-10-01T09:30:00Z')).toMatch(/10:30$/);
    expect(salonTime('2026-10-01T09:30:00Z').getHours()).toBe(10);
  });

  it('shows winter times unshifted', () => {
    expect(salonTime('2026-12-01T09:30:00Z').getHours()).toBe(9);
  });
});
