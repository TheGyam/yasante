import { calendarLink, directionsLink, prepList } from '../format';
import type { Booking } from '../types';

const booking = {
  serviceName: 'Knotless braids',
  optionLabels: ['Waist'],
  stylistName: 'Braids by Ama',
  scheduledFor: '2026-10-03T09:00:00.000Z',
  durationMinutes: 300,
  area: 'Peckham',
  address: '12 Bellenden Road, Peckham',
  bringingOwnHair: false,
} as Booking;

describe('getting ready for the day', () => {
  it('builds a calendar entry for the whole appointment', () => {
    const url = new URL(calendarLink(booking)!);
    expect(url.searchParams.get('text')).toBe('Knotless braids · Waist with Braids by Ama');
    expect(url.searchParams.get('dates')).toBe('20261003T090000Z/20261003T140000Z');
    expect(url.searchParams.get('location')).toBe('12 Bellenden Road, Peckham');
  });

  it('prefers the server’s own calendar link', () => {
    expect(calendarLink({ ...booking, calendarUrl: 'https://x/ics' })).toBe('https://x/ics');
  });

  it('opens directions in the phone’s own maps', () => {
    expect(directionsLink('12 Bellenden Road', 'ios')).toMatch(/^http:\/\/maps\.apple\.com/);
    expect(directionsLink('12 Bellenden Road', 'android')).toMatch(/google\.com\/maps\/dir/);
  });

  it('adds buying hair only when she has to bring it', () => {
    expect(prepList({ ...booking, hairIncluded: true }).some(i => i.id === 'hair')).toBe(false);
    expect(prepList({ ...booking, hairIncluded: false }).some(i => i.id === 'hair')).toBe(true);
  });
});
