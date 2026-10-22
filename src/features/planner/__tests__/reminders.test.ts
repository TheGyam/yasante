import { reminderTimes } from '../reminders';

// A Wednesday, mid-morning.
const NOW = new Date(2026, 9, 21, 10, 0);
const plan = {
  id: 'p1',
  name: 'Wash day',
  frequency: 'daily' as const,
  timeOfDay: 'evening' as const,
  remindersOn: true,
};

describe('care plan reminders', () => {
  it('reminds every day it is due, at her time of day, for two weeks', () => {
    const times = reminderTimes([plan], NOW);
    expect(times).toHaveLength(15);
    expect(times[0].at).toEqual(new Date(2026, 9, 21, 19, 0));
    expect(times[1].at).toEqual(new Date(2026, 9, 22, 19, 0));
  });

  it('skips today once it is done, and a time already gone', () => {
    const done = reminderTimes([{ ...plan, lastDoneAt: NOW.toISOString() }], NOW);
    expect(done[0].at).toEqual(new Date(2026, 9, 22, 19, 0));
    const morning = reminderTimes([{ ...plan, timeOfDay: 'morning' }], NOW);
    expect(morning[0].at).toEqual(new Date(2026, 9, 22, 8, 0));
  });

  it('keeps to the chosen weekdays, and to every other day', () => {
    const days = reminderTimes(
      [{ ...plan, frequency: 'specific-days', specificDays: [0, 3] }],
      NOW
    ).map(t => t.at.getDay());
    expect(new Set(days)).toEqual(new Set([0, 3]));
    const alternate = reminderTimes([{ ...plan, frequency: 'every-2-days' }], NOW);
    expect(alternate[1].at.getDate() - alternate[0].at.getDate()).toBe(2);
  });

  it('starts today when it is late, and does nothing when reminders are off', () => {
    const late = reminderTimes(
      [{ ...plan, frequency: 'weekly', lastDoneAt: new Date(2026, 9, 1).toISOString() }],
      NOW
    );
    expect(late[0].at).toEqual(new Date(2026, 9, 21, 19, 0));
    expect(late[1].at).toEqual(new Date(2026, 9, 28, 19, 0));
    expect(reminderTimes([{ ...plan, remindersOn: false }], NOW)).toEqual([]);
  });

  it('never asks the phone to hold more than it can', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...plan, id: `p${i}` }));
    expect(reminderTimes(many, NOW)).toHaveLength(60);
  });
});
