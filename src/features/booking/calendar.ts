import { Linking, Platform } from 'react-native';
import { calendarLink, serviceLine } from './format';
import type { Booking } from './types';

/**
 * "Add to calendar". Android: the phone's own new-event screen, filled in, with no
 * calendar access asked. iPhone: the server's calendar file (.ics), which opens in
 * iOS's own "Add to Calendar" screen. (expo-calendar isn't in iOS builds: its native
 * module stopped every Expo module after it from starting — see package.json
 * expo.autolinking.ios.exclude.) The web gets a Google Calendar link.
 */
export async function addToCalendar(booking: Booking) {
  if (!booking.scheduledFor) return;
  if (Platform.OS === 'android') {
    // Loaded only here, so iOS never asks for the native module it doesn't have.
    const Calendar = require('expo-calendar') as typeof import('expo-calendar');
    const startDate = new Date(booking.scheduledFor);
    await Calendar.createEventInCalendarAsync({
      title: `${serviceLine(booking)} with ${booking.stylistName}`,
      startDate,
      endDate: new Date(startDate.getTime() + (booking.durationMinutes ?? 120) * 60_000),
      location: booking.address ?? booking.area,
      notes: 'Booked on Yasante',
    });
    return;
  }
  const link = calendarLink(booking);
  if (link) await Linking.openURL(link);
}
