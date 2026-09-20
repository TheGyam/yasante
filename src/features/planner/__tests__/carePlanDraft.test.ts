import { formFromPlan, planFromForm, validatePlan } from '../carePlanDraft';

const form = formFromPlan();

describe('the care plan form', () => {
  it('starts with one empty step to type into', () => {
    expect(form.steps).toEqual(['']);
    expect(form.frequency).toBe('weekly');
  });

  it('says what is missing', () => {
    expect(validatePlan(form)).toMatchObject({
      name: expect.stringContaining('name'),
      steps: expect.stringContaining('step'),
    });
    expect(
      validatePlan({ ...form, name: 'Wash day', frequency: 'specific-days', steps: ['Cleanse'] })
    ).toMatchObject({ specificDays: expect.stringContaining('day') });
    expect(validatePlan({ ...form, name: 'Wash day', steps: ['Cleanse'] })).toEqual({});
  });

  it('drops blank steps and days that no longer apply', () => {
    expect(
      planFromForm({
        ...form,
        name: '  Wash day  ',
        specificDays: [5, 1],
        steps: ['  Cleanse ', '', '   ', 'Deep condition'],
      })
    ).toEqual({
      name: 'Wash day',
      frequency: 'weekly',
      specificDays: undefined,
      timeOfDay: 'evening',
      remindersOn: false,
      steps: ['Cleanse', 'Deep condition'],
    });
  });

  it('keeps the chosen days in week order', () => {
    expect(
      planFromForm({ ...form, name: 'Oil', frequency: 'specific-days', specificDays: [5, 1] })
        .specificDays
    ).toEqual([1, 5]);
  });
});
