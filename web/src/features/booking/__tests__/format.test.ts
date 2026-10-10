import {
  fromSalonInput,
  inSentence,
  recordLabel,
  toSalonInput,
  whenLabel,
  zoneMark,
} from '../format';

describe('how a booking reads', () => {
  // Midday in London (BST, UTC+1).
  const now = new Date('2026-09-25T11:00:00Z');

  it('says when in words, in London time whatever the computer’s clock', () => {
    expect(
      whenLabel('2026-09-25T14:30:00Z', 'Europe/London', now).replace(zoneMark('Europe/London'), '')
    ).toBe('Today, 15:30');
    expect(
      whenLabel('2026-09-26T08:00:00Z', 'Europe/London', now).replace(zoneMark('Europe/London'), '')
    ).toBe('Tomorrow, 09:00');
    expect(
      whenLabel('2026-09-27T20:35:00Z', 'Europe/London', now).replace(zoneMark('Europe/London'), '')
    ).toBe('Sun 27 Sep, 21:35');
    // Late at night in UTC is already tomorrow in London.
    expect(
      whenLabel('2026-09-25T23:30:00Z', 'Europe/London', now).replace(zoneMark('Europe/London'), '')
    ).toBe('Tomorrow, 00:30');
  });

  it('fits in the middle of a sentence', () => {
    expect(inSentence('Today, 15:30')).toBe('today at 15:30');
    expect(inSentence('Sun 27 Sep, 21:35')).toBe('Sun 27 Sep at 21:35');
  });

  it('describes a client’s record as the app does', () => {
    expect(recordLabel({ attended: 0, noShows: 0, lateCancellations: 0 })).toBe(
      'First booking on Yasante'
    );
    expect(recordLabel({ attended: 4, noShows: 0, lateCancellations: 0 })).toBe(
      '4 styles, never missed one'
    );
    expect(recordLabel({ attended: 1, noShows: 1, lateCancellations: 2 })).toBe(
      '1 style · 1 no-show, 2 late cancellations'
    );
  });

  it('reads a suggested time as London time, summer or winter', () => {
    expect(toSalonInput('2026-10-04T09:00:00Z', 'Europe/London')).toBe('2026-10-04T10:00');
    expect(fromSalonInput('2026-10-04T10:00', 'Europe/London')).toBe('2026-10-04T09:00:00.000Z');
    expect(fromSalonInput('2026-12-04T10:00', 'Europe/London')).toBe('2026-12-04T10:00:00.000Z');
  });
});

describe('another clock', () => {
  it('marks a time that is on a different clock from this computer', () => {
    const label = whenLabel('2026-10-04T09:00:00Z', 'Asia/Tokyo');
    expect(label.endsWith('18:00' + zoneMark('Asia/Tokyo'))).toBe(true);
  });
});
