import { repeatChoices, repeatLabel } from '../format';

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
});
