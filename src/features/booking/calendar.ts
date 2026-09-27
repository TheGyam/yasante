import { Linking, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { calendarLink, serviceLine } from './format';
import type { Booking } from './types';

/**
 * The phone's own "new event" screen, filled in: Apple Calendar on an iPhone, the
 * calendar app on Android. It asks for no calendar access — they save it themselves.
 * The web gets a Google Calendar link.
 */
export async function addToCalendar(booking: Booking) {
  if (!booking.scheduledFor) return;
  if (Platform.OS === 'web') {
    const link = calendarLink(booking);
    if (link) await Linking.openURL(link).catch(() => {});
    return;
  }
  const startDate = new Date(booking.scheduledFor);
  await Calendar.createEventInCalendarAsync({
    title: `${serviceLine(booking)} with ${booking.stylistName}`,
    startDate,
    endDate: new Date(startDate.getTime() + (booking.durationMinutes ?? 120) * 60_000),
    location: booking.address ?? booking.area,
    notes: 'Booked on Yasante',
  });
}
