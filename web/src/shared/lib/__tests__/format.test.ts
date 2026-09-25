import { formatMoney, formatPrice, plural, slugify } from '../format';

describe('format', () => {
  it('writes money the way the app does', () => {
    expect(formatMoney(45)).toBe('£45');
    expect(formatMoney(12.5)).toBe('£12.50');
    expect(formatPrice(80, true)).toBe('from £80');
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
