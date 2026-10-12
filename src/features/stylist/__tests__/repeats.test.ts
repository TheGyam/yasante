import { nextOccurrences, repeatChoices, repeatLabel } from '../format';

describe('blocks that come round again', () => {
  it('says when they repeat the way a person would', () => {
    expect(repeatLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(repeatLabel([5, 1, 2, 3, 4])).toBe('Weekdays');
    expect(repeatLabel([1, 2, 3, 4, 5, 6])).toBe('Monday to Saturday');
    expect(repeatLabel([5])).toBe('Every Friday');
    expect(repeatLabel([0, 3, 1])).toBe('Mon, Wed, Sun');
  });

  it('offers once, daily, weekdays and the day picked', () => {
    expect(repeatChoices(5).map(c => c.label)).toEqual([
      'Just once',
      'Every day',
      'Weekdays',
      'Every Friday',
    ]);
    expect(repeatChoices(5)[3].days).toEqual([5]);
  });

  it('lists the next days a block lands on, from today', () => {
    // Monday 12 October 2026; weekdays.
    expect(nextOccurrences([1, 2, 3, 4, 5], '2026-10-12', 6)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-19',
    ]);
    expect(nextOccurrences([0], '2026-10-12', 2)).toEqual(['2026-10-18', '2026-10-25']);
  });
});
