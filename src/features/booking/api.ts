import { apiClient } from '@/shared/lib/api/client';
import type {
  Booking,
  BookingDraft,
  BookingRole,
  BookingStatus,
  CheckInAnswers,
  CheckInWeek,
  CloseOut,
  SlotInterest,
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

  /** POST /api/bookings/:id/close/ — attended or a no-show, with how the time went. Stylist only. */
  close: async (id: string, closeOut: CloseOut) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/close/`, closeOut)).data,

  /**
   * POST /api/bookings/:id/propose/ — none of her days work, so she suggests one.
   * The client then says yes or no.
   */
  propose: async (id: string, scheduledFor: string, deposit?: { amount: number; method: string }) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/propose/`, { scheduledFor, deposit })).data,

  /** POST /api/bookings/:id/proposal/ — the client takes the suggested time, or doesn't. */
  answerProposal: async (id: string, accept: boolean) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/proposal/`, { accept })).data,

  /** POST /api/bookings/:id/attending/ — "Yes, I'm coming". */
  confirmAttendance: async (id: string) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/attending/`)).data,

  /** POST /api/bookings/:id/move/ — ask to move it. One move is free. */
  requestMove: async (id: string, scheduledFor: string) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/move/`, { scheduledFor })).data,

  /** POST /api/bookings/:id/move/answer/ — the other side agrees to the move, or doesn't. */
  answerMove: async (id: string, accept: boolean) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/move/answer/`, { accept })).data,

  /** POST /api/bookings/:id/started-on-time/ — the client's one tap. */
  startedOnTime: async (id: string, onTime: boolean) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/started-on-time/`, { onTime })).data,

  /** POST /api/bookings/:id/contest/ — once for a no-show, once for a timing record. */
  contest: async (id: string, what: 'no_show' | 'timing', note?: string) =>
    (await apiClient.post<Booking>(`/api/bookings/${id}/contest/`, { what, note })).data,

  /** GET /api/slot-interests/ — the days she's waiting on, and any that opened. */
  slotInterests: async () => (await apiClient.get<SlotInterest[]>('/api/slot-interests/')).data,

  /** POST /api/slot-interests/ */
  watchSlots: async (stylistId: string, from: string, to: string) =>
    (await apiClient.post<SlotInterest>('/api/slot-interests/', { stylistId, from, to })).data,

  /** DELETE /api/slot-interests/:id/ */
  unwatchSlots: async (id: string) => {
    await apiClient.delete(`/api/slot-interests/${id}/`);
  },

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
