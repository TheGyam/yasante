import { api } from '@/shared/lib/api/client';
import type { Booking, BookingDraft, BookingStatus, CloseOut, Deposit, FreeSlots } from './types';

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

/* The client's side. */

/** Her bookings, as a client: every one, newest first. */
export const listMyBookings = () => api.get<Booking[]>('/bookings/', { role: 'client' });

/** The stylist's free times for this job (its options change how long it runs). */
export const getFreeSlots = (handle: string, serviceId: string, optionIds: string[]) =>
  api.get<FreeSlots>(`/stylists/by-handle/${handle}/slots/`, {
    service: serviceId,
    options: optionIds.join(',') || undefined,
  });

/** She asks. The server prices it from the stylist's menu and checks the time is free. */
export const requestBooking = (draft: BookingDraft) => api.post<Booking>('/bookings/', draft);

/** "Yes, I'm coming". */
export const confirmAttendance = (id: string) => api.post<Booking>(`/bookings/${id}/attending/`);

/** The stylist suggested another time: she takes it, or doesn't. */
export const answerProposal = (id: string, accept: boolean) =>
  api.post<Booking>(`/bookings/${id}/proposal/`, { accept });

/** Ask to move it. One move is free. */
export const requestMove = (id: string, scheduledFor: string) =>
  api.post<Booking>(`/bookings/${id}/move/`, { scheduledFor });

/** The other side asked to move it: yes or no. */
export const answerMove = (id: string, accept: boolean) =>
  api.post<Booking>(`/bookings/${id}/move/answer/`, { accept });

/** Did it start on time? Her one tap, after. */
export const startedOnTime = (id: string, onTime: boolean) =>
  api.post<Booking>(`/bookings/${id}/started-on-time/`, { onTime });

/** Her review of a finished appointment: once, and checked before it shows. */
export const reviewBooking = (id: string, rating: number, body?: string) =>
  api.post<unknown>(`/bookings/${id}/review/`, { rating, body });
