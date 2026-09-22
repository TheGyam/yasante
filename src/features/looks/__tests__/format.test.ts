import { postedLabel } from '../format';

const now = new Date('2026-09-21T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('how long ago a look went up', () => {
  it('reads short enough to sit beside a handle', () => {
    expect(postedLabel(ago(10_000), now)).toBe('just now');
    expect(postedLabel(ago(5 * MINUTE), now)).toBe('5m');
    expect(postedLabel(ago(3 * HOUR), now)).toBe('3h');
    expect(postedLabel(ago(2 * DAY), now)).toBe('2d');
    expect(postedLabel(ago(20 * DAY), now)).toBe('2w');
    expect(postedLabel(ago(400 * DAY), now)).toBe('1y');
  });

  it('says nothing rather than something wrong', () => {
    expect(postedLabel('not a date', now)).toBe('');
  });
});

describe('styleForService', () => {
  const taxonomy = [
    { id: 'knotless', name: 'Knotless braids' },
    { id: 'box-braids', name: 'Box braids' },
    { id: 'cornrows', name: 'Cornrows' },
  ];
  it('reads the style from how she named the service', () => {
    const { styleForService } = jest.requireActual('../format');
    expect(styleForService('Knotless braids', taxonomy)).toBe('knotless');
    expect(styleForService('Boho knotless', taxonomy)).toBe('knotless');
    expect(styleForService('Cornrows', taxonomy)).toBe('cornrows');
    expect(styleForService('Take down and wash', taxonomy)).toBeUndefined();
  });
});
