import { mergeGaps } from '../format';
import { lengthIsStale, progressOf } from '../quiz/sections';

describe('the progressive profile', () => {
  it('counts answered sections, and names the next one', () => {
    expect(progressOf(null)).toMatchObject({ done: 0, total: 9, next: { key: 'texture' } });
    const some = progressOf({ texture: 'coily', length: 'shoulder', goals: ['growth'] });
    expect(some).toMatchObject({ done: 3, next: { key: 'density' } });
  });

  it('treats "no chemicals, ever" as an answer, and not saying as none', () => {
    expect(progressOf({ chemicals: [] }).done).toBe(1);
    expect(progressOf({}).done).toBe(0);
  });

  it('asks about length again a month on', () => {
    const now = new Date('2026-09-21T12:00:00Z');
    expect(lengthIsStale({ length: 'chin', lengthMeasuredAt: '2026-09-01T12:00:00Z' }, now)).toBe(
      false
    );
    expect(lengthIsStale({ length: 'chin', lengthMeasuredAt: '2026-08-20T12:00:00Z' }, now)).toBe(
      true
    );
    expect(lengthIsStale({ lengthMeasuredAt: '2026-01-01T12:00:00Z' }, now)).toBe(false);
  });
});

describe('syncing after signup', () => {
  it('fills only what the account is missing — the account’s answers win', () => {
    expect(
      mergeGaps(
        { texture: 'coily', goals: ['growth'] },
        { texture: 'kinky', length: 'chin', scalp: ['dry'] }
      )
    ).toEqual({ length: 'chin', scalp: ['dry'] });
  });
});
