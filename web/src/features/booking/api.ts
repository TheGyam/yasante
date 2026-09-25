import { api } from '@/shared/lib/api/client';
import type { Booking, BookingStatus, CloseOut, Deposit } from './types';

/** Her side of the bookings, newest first. */
export const listBookings = (status: BookingStatus[]) =>
  api.get<Booking[]>('/bookings/', { role: 'stylist', status: status.join(',') });

export const getBooking = (id: string) => api.get<Booking>(`/bookings/${id}/`);

/** She picks one of the asked-for times, and names her deposit if she takes one. */
export const acceptBooking = (id: string, scheduledFor: string, deposit?: Deposit) =>
  api.post<Booking>(`/bookings/${id}/accept/`, { scheduledFor, deposit });

/** None of the asked-for times work: she suggests another. */
export const proposeTime = (id: string, scheduledFor: string, deposit?: Deposit) =>
  api.post<Booking>(`/bookings/${id}/propose/`, { scheduledFor, deposit });

export const declineBooking = (id: string) => api.post<Booking>(`/bookings/${id}/decline/`, {});

/** The deposit arrived: this is what confirms the booking and shares her address. */
export const depositReceived = (id: string) =>
  api.post<Booking>(`/bookings/${id}/deposit-received/`);

/** After the appointment: attended or a no-show, what was paid, how the time went. */
export const closeBooking = (id: string, closeOut: CloseOut) =>
  api.post<Booking>(`/bookings/${id}/close/`, closeOut);

/** She has to cancel. Their deposit is always returned, and it counts against her. */
export const cancelBooking = (id: string) => api.post<Booking>(`/bookings/${id}/cancel/`, {});
