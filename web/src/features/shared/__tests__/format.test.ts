import { describe, expect, it } from 'vitest';
import { describePlan, updatedLabel } from '../format';

describe('shared pages', () => {
  it('describes a plan the way the app does', () => {
    expect(describePlan({ frequency: 'weekly', timeOfDay: 'evening' })).toContain('Every week');
    expect(
      describePlan({ frequency: 'specific-days', specificDays: [3, 0], timeOfDay: 'morning' })
    ).toMatch(/^Wed, Sun/);
  });

  it('says when it last changed in words', () => {
    const now = new Date('2026-10-22T12:00:00Z').getTime();
    expect(updatedLabel('2026-10-20T12:00:00Z', now)).toBe('Updated 2 days ago');
    expect(updatedLabel('2026-10-22T11:59:30Z', now)).toBe('Updated just now');
  });
});
