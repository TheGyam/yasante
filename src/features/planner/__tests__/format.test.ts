import { plain } from '@/shared/lib/format';
import { describePlan, dueLabel, nextDue, parsePlannerLink } from '../format';

describe('planner links', () => {
  it('parses collection and care plan links, ignoring query strings', () => {
    expect(parsePlannerLink('yasante://collection/abc?name=x')).toEqual({
      kind: 'collection',
      id: 'abc',
    });
    expect(parsePlannerLink('yasante://care-plan/p%201')).toEqual({
      kind: 'care-plan',
      id: 'p 1',
    });
    expect(parsePlannerLink('https://example.com/collection/abc')).toBeNull();
  });
});

describe('describing a care plan', () => {
  it('says how often and when', () => {
    expect(plain(describePlan({ frequency: 'weekly', timeOfDay: 'evening' }))).toBe(
      'Every week · Evening'
    );
    // Sunday = 0, and the days read in week order however they were picked.
    expect(
      plain(
        describePlan({ frequency: 'specific-days', specificDays: [3, 0], timeOfDay: 'morning' })
      )
    ).toBe('Sun, Wed · Morning');
  });
});

describe('when a care plan is next due', () => {
  const now = new Date('2026-09-20T09:00:00Z'); // a Sunday

  it('is due today when it has never been done', () => {
    expect(dueLabel({ frequency: 'weekly' }, now)).toBe('Due today');
  });

  it('counts from the last time it was done', () => {
    expect(nextDue({ frequency: 'daily', lastDoneAt: '2026-09-19T20:00:00Z' }, now)).toEqual(
      new Date(2026, 8, 20)
    );
    expect(dueLabel({ frequency: 'weekly', lastDoneAt: '2026-09-19T20:00:00Z' }, now)).toBe(
      'Due Saturday'
    );
  });

  it('says how late it is', () => {
    expect(dueLabel({ frequency: 'daily', lastDoneAt: '2026-09-17T20:00:00Z' }, now)).toBe(
      '2 days late'
    );
  });

  it('finds the next chosen weekday', () => {
    // Done on Sunday, wanted on Wednesdays and Fridays.
    expect(
      nextDue(
        { frequency: 'specific-days', specificDays: [3, 5], lastDoneAt: '2026-09-20T09:00:00Z' },
        now
      )
    ).toEqual(new Date(2026, 8, 23));
  });

  it('falls back to today when the days are missing or the date is nonsense', () => {
    expect(dueLabel({ frequency: 'specific-days', specificDays: [] }, now)).toBe('Due today');
    expect(dueLabel({ frequency: 'daily', lastDoneAt: 'not a date' }, now)).toBe('Due today');
  });
});
