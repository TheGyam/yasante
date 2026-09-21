import { apiClient } from '@/shared/lib/api/client';
import type {
  Booking,
  BookingDraft,
  BookingRole,
  BookingStatus,
  CheckInAnswers,
  CheckInWeek,
  Review,
  ReviewReportReason,
} from './types';

export const bookingApi = {
  /** GET /api/bookings/?role=&status= — one side's bookings, newest first. */
  list: async (role: BookingRole, status?: BookingStatus[]) =>
    (
      await apiClient.get<Booking[]>('/api/bookings/', {
        params: { role, status: status?.join(',') },
      })
    ).data,

  /** GET /api/bookings/:id/ */
  get: async (id: string) => (await apiClient.get<Booking>(`/api/bookings/${id}/`)).data,

  /** POST /api/bookings/ — the client asks. Her phone must be verified. */
  request: async (draft: BookingDraft) =>
    (await apiClient.post<Booking>('/api/bookings/', draft)).data,

  /**
   * POST /api/bookings/:id/accept/ — she picks one of the times and names her
   * deposit. No deposit goes straight to confirmed.
   */
  accept: async (id: string, scheduledFor: string, deposit?: { amount: number; method: string }) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/accept/`, { scheduledFor, deposit })).data,

  /** POST /api/bookings/:id/decline/ */
  decline: async (id: string, reason?: string) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/decline/`, { reason })).data,

  /** POST /api/bookings/:id/deposit-received/ — this is what confirms it. */
  markDepositReceived: async (id: string) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/deposit-received/`)).data,

  /**
   * POST /api/bookings/:id/cancel/ — the server decides whether it was in time,
   * late, or the stylist's, from her notice window and who asked.
   */
  cancel: async (id: string, reason?: string) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/cancel/`, { reason })).data,

  /** POST /api/bookings/:id/close/ — attended or a no-show. Stylist only. */
  close: async (id: string, outcome: 'attended' | 'no_show') =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/close/`, { outcome })).data,

  /** POST /api/bookings/:id/review/ — completed bookings only, once. Goes to moderation. */
  review: async (id: string, rating: number, body?: string) =>
    (await apiClient.post<Review>(`/api/bookings/${id}/review/`, { rating, body })).data,

  /** POST /api/bookings/:id/check-in/ — for the week the server asked about. */
  checkIn: async (id: string, week: CheckInWeek, answers: CheckInAnswers) =>
    (await apiClient.post<null>(`/api/bookings/${id}/check-in/`, { week, ...answers })).data,

  /** POST /api/reviews/:id/report/ */
  reportReview: async (id: string, reason: ReviewReportReason, note?: string) =>
    (await apiClient.post<null>(`/api/reviews/${id}/report/`, { reason, note })).data,
};
