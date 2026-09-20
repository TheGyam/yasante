import { parseDuration, parseLine, parsePriceList } from '../priceList';

describe('reading a pasted price list', () => {
  it('reads the shapes people actually write', () => {
    expect(parseLine('Knotless braids – £120')).toMatchObject({
      name: 'Knotless braids',
      price: 120,
      fromPrice: false,
    });
    expect(parseLine('• Boho braids £150 (5 hrs)')).toMatchObject({
      name: 'Boho braids',
      price: 150,
      durationMinutes: 300,
    });
    expect(parseLine('Cornrows - from £45, 2 hours')).toMatchObject({
      name: 'Cornrows',
      price: 45,
      fromPrice: true,
      durationMinutes: 120,
    });
    expect(parseLine('Wash and go: 35.50')).toMatchObject({
      name: 'Wash and go',
      price: 35.5,
    });
  });

  it('takes the low end of a range, as a from-price', () => {
    expect(parseLine('Box braids £80-£110')).toMatchObject({
      name: 'Box braids',
      price: 80,
      fromPrice: true,
    });
  });

  it('tells a duration from a price', () => {
    // The bare number after the hours is minutes only when it could be.
    expect(parseLine('Faux locs 4 hrs 30 £200')).toMatchObject({
      price: 200,
      durationMinutes: 270,
    });
    expect(parseLine('Faux locs 4 hrs 120')).toMatchObject({ price: 120, durationMinutes: 240 });
    expect(parseLine('Retwist 2h30 £60')).toMatchObject({ price: 60, durationMinutes: 150 });
    expect(parseLine('Trim 45 mins £25')).toMatchObject({ price: 25, durationMinutes: 45 });
    // Nothing else on the line is a price, so the trailing number has to be one.
    expect(parseLine('Cornrows 2 hrs 45')).toMatchObject({ price: 45, durationMinutes: 120 });
  });

  it('leaves a line it cannot price alone, rather than guessing', () => {
    expect(parseLine('BRAIDS').price).toBeUndefined();
    expect(parseLine('Prices below 💕')).toMatchObject({ name: 'Prices below', price: undefined });
    // A year in a heading is not £2,026.
    expect(parseLine('PRICES 2026 ✨')).toMatchObject({ name: 'PRICES 2026', price: undefined });
    expect(parseLine('£1200 bridal package').price).toBe(1200);
  });

  it('skips blank lines and keeps the order', () => {
    const list = parsePriceList('PRICES\n\nKnotless £120\n\nCornrows £45\n');
    expect(list.map(s => s.name)).toEqual(['PRICES', 'Knotless', 'Cornrows']);
    expect(list.map(s => s.price)).toEqual([undefined, 120, 45]);
  });
});

describe('the how-long field', () => {
  it('takes hours, minutes, or a bare number meaning hours', () => {
    expect(parseDuration('4 hrs')).toBe(240);
    expect(parseDuration('2h30')).toBe(150);
    expect(parseDuration('90 mins')).toBe(90);
    expect(parseDuration('3')).toBe(180);
    expect(parseDuration('')).toBeUndefined();
  });
});
