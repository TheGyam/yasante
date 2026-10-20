import { becauseOf } from '../format';

describe('why something is suggested', () => {
  it('names what the matching used, in plain words', () => {
    const hair = { texture: 'coily', porosity: 'low' } as const;
    expect(becauseOf(hair, ['texture', 'porosity'])).toBe(
      'Because you have coily, low-porosity hair'
    );
    expect(becauseOf(hair, ['texture'])).toBe('Because you have coily hair');
  });

  it('says nothing when none of it is known', () => {
    expect(becauseOf({ porosity: 'high' }, ['texture'])).toBeUndefined();
    expect(becauseOf(undefined, ['texture', 'porosity'])).toBeUndefined();
  });
});
