import { formatMoney, parseMoney } from '../format';

describe('money', () => {
  it('formats pounds without needless pence', () => {
    expect(formatMoney(45)).toBe('£45');
    expect(formatMoney(12.5)).toBe('£12.50');
  });

  it('parses what people type', () => {
    expect(parseMoney('£45.50')).toBe(45.5);
    expect(parseMoney('45,50')).toBe(45.5);
    expect(parseMoney('')).toBe(0);
  });
});
