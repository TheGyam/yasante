import { draftFromTreatment, treatmentFromDraft, validateTreatment } from '../treatmentDraft';

const NOW = new Date(2026, 8, 17, 23, 30);

describe('treatment draft', () => {
  it('saves the local calendar day, even late in the evening', () => {
    expect(
      treatmentFromDraft({ ...draftFromTreatment(undefined, NOW), name: 'Scalp oil' }).startDate
    ).toBe('2026-09-17');
  });

  it('requires days or wording for the frequencies that need them', () => {
    const base = { ...draftFromTreatment(undefined, NOW), name: 'Mask' };
    expect(validateTreatment(base)).toEqual({});
    expect(validateTreatment({ ...base, frequency: 'specific-days' })).toHaveProperty(
      'specificDays'
    );
    expect(validateTreatment({ ...base, frequency: 'custom' })).toHaveProperty('customFrequency');
    expect(validateTreatment({ ...base, name: ' ' })).toHaveProperty('name');
  });

  it('drops fields that do not apply to the chosen frequency', () => {
    const saved = treatmentFromDraft({
      ...draftFromTreatment(undefined, NOW),
      name: 'Rinse',
      frequency: 'weekly',
      specificDays: [3, 1],
      duration: 'abc',
    });
    expect(saved.specificDays).toBeUndefined();
    expect(saved.duration).toBeUndefined();
  });
});
