import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { bookingApi } from './api';
import type {
  BookingDraft,
  BookingRole,
  BookingStatus,
  CheckInAnswers,
  CheckInWeek,
  ReviewReportReason,
} from './types';

const KEY = 'bookings';

/** One side's bookings. Both sides are keyed by account: they see different fields. */
export function useBookings(role: BookingRole, status?: BookingStatus[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, role, user?.id, status?.join(',') ?? 'all'],
    queryFn: () => bookingApi.list(role, status),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useBooking(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'one', user?.id, id],
    queryFn: () => bookingApi.get(id),
    enabled: !!user?.id && !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Every transition re-reads rather than patching: the server decides what a
 * cancellation counted as, and which fields it just revealed.
 */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useRequestBooking() {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (draft: BookingDraft) => bookingApi.request(draft), onSuccess });
}

export function useAcceptRequest() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: {
      id: string;
      scheduledFor: string;
      deposit?: { amount: number; method: string };
    }) => bookingApi.accept(args.id, args.scheduledFor, args.deposit),
    onSuccess,
  });
}

export function useDeclineRequest() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; reason?: string }) => bookingApi.decline(args.id, args.reason),
    onSuccess,
  });
}

export function useMarkDepositReceived() {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (id: string) => bookingApi.markDepositReceived(id), onSuccess });
}

export function useCancelBooking() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; reason?: string }) => bookingApi.cancel(args.id, args.reason),
    onSuccess,
  });
}

export function useCloseBooking() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; outcome: 'attended' | 'no_show' }) =>
      bookingApi.close(args.id, args.outcome),
    onSuccess,
  });
}

/** A review changes the booking, and once it's published, her page. */
export function useLeaveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; rating: number; body?: string }) =>
      bookingApi.review(args.id, args.rating, args.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ['stylist', 'page'] });
    },
  });
}

export function useCheckIn() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; week: CheckInWeek; answers: CheckInAnswers }) =>
      bookingApi.checkIn(args.id, args.week, args.answers),
    onSuccess,
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: (args: { id: string; reason: ReviewReportReason; note?: string }) =>
      bookingApi.reportReview(args.id, args.reason, args.note),
  });
}
