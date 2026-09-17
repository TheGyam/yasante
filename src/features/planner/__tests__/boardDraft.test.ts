import { draftFromEntry, entryFromDraft } from '../boardDraft';

const NOW = new Date(2026, 8, 17, 15, 30);

describe('board draft', () => {
  it('starts a new board with an appointment slot tomorrow at 10:00', () => {
    const draft = draftFromEntry(undefined, NOW);
    expect(draft.hasAppointment).toBe(false);
    expect(draft.appointment).toEqual(new Date(2026, 8, 18, 10, 0));
  });

  it('files a board without an appointment under the current month', () => {
    const entry = entryFromDraft({ ...draftFromEntry(undefined, NOW), name: '  Knotless  ' }, NOW);
    expect(entry).toMatchObject({ name: 'Knotless', month: '2026-09', appointmentTime: '' });
  });

  it('files a booked board under its appointment month and parses prices', () => {
    const draft = {
      ...draftFromEntry(undefined, NOW),
      name: 'Braids',
      hasAppointment: true,
      appointment: new Date(2026, 10, 2, 9, 0),
      stylistPrice: '£120',
      hairPrice: '',
    };
    expect(entryFromDraft(draft, NOW)).toMatchObject({
      month: '2026-11',
      stylistPrice: 120,
      hairPrice: 0,
    });
  });

  it('round-trips an existing entry', () => {
    const draft = draftFromEntry(
      {
        name: 'Twists',
        mainPhotoUri: 'a.jpg',
        appointmentTime: '2026-10-01T09:00:00.000Z',
        stylistPrice: 80,
      },
      NOW
    );
    expect(draft).toMatchObject({
      photos: ['a.jpg'],
      hasAppointment: true,
      stylistPrice: '80',
      hairPrice: '',
    });
  });
});
