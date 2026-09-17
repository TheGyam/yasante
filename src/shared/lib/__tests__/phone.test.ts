import { formatUkMobile, formatUkMobileInput, normalizeUkMobile } from '../phone';

describe('UK mobile numbers', () => {
  it('accepts the ways people type them', () => {
    for (const input of [
      '07700 900123',
      '+44 7700 900123',
      '447700900123',
      '0044 7700 900123',
      '+44 (0)7700 900123',
    ]) {
      expect(normalizeUkMobile(input)).toBe('+447700900123');
    }
  });

  it('rejects landlines, short numbers and other countries', () => {
    expect(normalizeUkMobile('020 7946 0000')).toBeNull();
    expect(normalizeUkMobile('07700 9001')).toBeNull();
    expect(normalizeUkMobile('+233 24 123 4567')).toBeNull();
  });

  it('formats for display and while typing', () => {
    expect(formatUkMobile('+447700900123')).toBe('07700 900123');
    expect(formatUkMobileInput('0770090')).toBe('07700 90');
    expect(formatUkMobileInput('07700-900-123-99')).toBe('07700 900123');
  });
});
