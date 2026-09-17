import { appointmentOf, boardTotal, describeTreatment, parsePlannerLink } from '../format';

describe('planner format', () => {
  it('parses board and treatment links, ignoring query strings', () => {
    expect(parsePlannerLink('yasante://moodboard/abc?name=x')).toEqual({
      kind: 'board',
      id: 'abc',
    });
    expect(parsePlannerLink('yasante://treatment/t%201')).toEqual({ kind: 'treatment', id: 't 1' });
    expect(parsePlannerLink('https://example.com/moodboard/abc')).toBeNull();
  });

  it('describes a treatment, preferring custom wording', () => {
    expect(describeTreatment({ frequency: 'weekly', timeOfDay: 'evening' })).toBe(
      'Every week · Evening'
    );
    expect(
      describeTreatment({
        frequency: 'custom',
        timeOfDay: 'night',
        customFrequency: 'Twice a month',
      })
    ).toBe('Twice a month · Night');
  });

  it('handles money and dates the API sends as strings', () => {
    expect(boardTotal({ stylistPrice: '40' as unknown as number, hairPrice: 25.5 })).toBe(65.5);
    expect(appointmentOf({ appointmentTime: 'not a date' })).toBeNull();
    expect(appointmentOf({ appointmentTime: '' })).toBeNull();
  });
});
