import { currencySymbol, formatMoney, parseMoney } from '../format';

describe('money', () => {
  it('formats a price in its own currency, without needless decimals', () => {
    expect(formatMoney(45, 'GBP')).toBe('£45');
    expect(formatMoney(12.5, 'GBP')).toBe('£12.50');
    expect(formatMoney(240000, 'NGN')).toBe('₦240,000');
    expect(formatMoney(120, 'GHS')).toMatch(/120/);
    expect(formatMoney(45, 'USD')).toBe('$45');
  });

  it('gives a price field its currency symbol', () => {
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('NGN')).toBe('₦');
  });

  it('parses what people type, wherever they are', () => {
    expect(parseMoney('£45.50')).toBe(45.5);
    expect(parseMoney('45,50')).toBe(45.5);
    expect(parseMoney('240,000')).toBe(240000);
    expect(parseMoney('₦1,250,000')).toBe(1250000);
    expect(parseMoney('1.250,50')).toBe(1250.5);
    expect(parseMoney('1,250.50')).toBe(1250.5);
    expect(parseMoney('1.250.000')).toBe(1250000);
    expect(parseMoney('')).toBe(0);
  });
});
