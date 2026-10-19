import { formatDistance, formatMoney, formatPrice, plural, slugify } from '../format';

describe('format', () => {
  it('writes money in its own currency, the way the app does', () => {
    expect(formatMoney(45, 'GBP')).toBe('£45');
    expect(formatMoney(12.5, 'GBP')).toBe('£12.50');
    expect(formatPrice(80, 'GBP', true)).toBe('from £80');
    expect(formatMoney(240000, 'NGN')).toBe('₦240,000');
    expect(formatMoney(45, 'USD')).toBe('$45');
  });

  it('gives distances in the reader’s units', () => {
    expect(formatDistance(5, true)).toBe('5 miles');
    expect(formatDistance(5, false)).toBe('8 km');
    expect(formatDistance(1, true)).toBe('1 mile');
  });

  it('writes counts in words', () => {
    expect(plural(1, 'look')).toBe('1 look');
    expect(plural(3, 'look')).toBe('3 looks');
  });

  it('makes the same address the server does', () => {
    expect(slugify('South London')).toBe('south-london');
    expect(slugify('  Peckham  ')).toBe('peckham');
  });
});
