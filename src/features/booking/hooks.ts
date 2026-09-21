import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { bookingApi } from './api';
import type {
  BookingDraft,
  BookingRole,
  BookingStatus,
  CheckInAnswers,
  CheckInWeek,
  CloseOut,
  ReviewReportReason,
} from './types';
import { track } from '@/shared/lib/analytics';

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

/**
 * A stylist's free times for the job being asked for. Fresh for half a minute:
 * a slot someone else takes should stop showing soon, and the server refuses a
 * clash either way.
 */
export function useFreeSlots(handle: string, serviceId?: string, optionIds: string[] = []) {
  return useQuery({
    queryKey: ['slots', handle, serviceId, [...optionIds].sort().join(',')],
    queryFn: () => bookingApi.slots(handle, serviceId!, optionIds),
    enabled: !!handle && !!serviceId,
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
  return () => {
    // Any change to a booking can free or take a slot.
    queryClient.invalidateQueries({ queryKey: ['slots'] });
    return queryClient.invalidateQueries({ queryKey: [KEY] });
  };
}

export function useRequestBooking() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (draft: BookingDraft) => bookingApi.request(draft),
    onSuccess: booking => {
      track('submit_booking', { serviceId: booking.serviceId, stylistId: booking.stylistId });
      return onSuccess();
    },
  });
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
    onSuccess: booking => {
      track('cancel_booking', { outcome: booking.status });
      return onSuccess();
    },
  });
}

export function useCloseBooking() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: ({ id, ...closeOut }: { id: string } & CloseOut) => bookingApi.close(id, closeOut),
    onSuccess,
  });
}

/** A review changes the booking, and once it's published, her page. */
export function useLeaveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; rating: number; body?: string }) =>
      bookingApi.review(args.id, args.rating, args.body),
    onSuccess: (_review, args) => {
      track('leave_review', { rating: args.rating, withText: !!args.body });
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
    onSuccess: (_data, args) => {
      track('complete_checkin', { week: args.week });
      return onSuccess();
    },
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: (args: { id: string; reason: ReviewReportReason; note?: string }) =>
      bookingApi.reportReview(args.id, args.reason, args.note),
  });
}

export function useProposeTime() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: {
      id: string;
      scheduledFor: string;
      deposit?: { amount: number; method: string };
    }) => bookingApi.propose(args.id, args.scheduledFor, args.deposit),
    onSuccess,
  });
}

export function useAnswerProposal() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; accept: boolean }) =>
      bookingApi.answerProposal(args.id, args.accept),
    onSuccess,
  });
}

export function useConfirmAttendance() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (id: string) => bookingApi.confirmAttendance(id),
    onSuccess: () => {
      track('confirm_attendance', { from: 'app' });
      return onSuccess();
    },
  });
}

export function useRequestMove() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; scheduledFor: string }) =>
      bookingApi.requestMove(args.id, args.scheduledFor),
    onSuccess,
  });
}

export function useAnswerMove() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; accept: boolean }) =>
      bookingApi.answerMove(args.id, args.accept),
    onSuccess,
  });
}

export function useStartedOnTime() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; onTime: boolean }) =>
      bookingApi.startedOnTime(args.id, args.onTime),
    onSuccess,
  });
}

export function useContest() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; what: 'no_show' | 'timing'; note?: string }) =>
      bookingApi.contest(args.id, args.what, args.note),
    onSuccess,
  });
}

const SLOTS = 'slot-interests';

export function useSlotInterests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SLOTS, user?.id],
    queryFn: bookingApi.slotInterests,
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useWatchSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { stylistId: string; from: string; to: string }) =>
      bookingApi.watchSlots(args.stylistId, args.from, args.to),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SLOTS] }),
  });
}

export function useUnwatchSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.unwatchSlots(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SLOTS] }),
  });
}
