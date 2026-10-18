import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptBooking,
  answerMove,
  answerProposal,
  confirmAttendance,
  getFreeSlots,
  listMyBookings,
  watchSlots,
  requestBooking,
  requestMove,
  reviewBooking,
  startedOnTime,
  cancelBooking,
  closeBooking,
  declineBooking,
  depositReceived,
  getBooking,
  listBookings,
  proposeTime,
} from './api';
import type { Booking, BookingDraft, BookingStatus, CloseOut, Deposit, SlotQuery } from './types';

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (status: BookingStatus[]) => ['bookings', 'stylist', status] as const,
  one: (id: string) => ['bookings', 'one', id] as const,
  mine: ['bookings', 'client'] as const,
  slots: (query: SlotQuery, from?: string, to?: string) =>
    [
      'slots',
      query.handle,
      query.booking ?? query.serviceId ?? '',
      [...(query.optionIds ?? [])].sort().join(','),
      from,
      to,
    ] as const,
};

export function useBookings(status: BookingStatus[]) {
  return useQuery({
    queryKey: bookingKeys.list(status),
    queryFn: () => listBookings(status),
    refetchInterval: 60_000,
  });
}

export function useBooking(id: string) {
  return useQuery({ queryKey: bookingKeys.one(id), queryFn: () => getBooking(id) });
}

/** Every answer she gives changes the booking: the new one replaces it, and lists re-read. */
function useBookingAction<A>(action: (args: A) => Promise<Booking>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: booking => {
      client.setQueryData(bookingKeys.one(booking.id), booking);
      client.invalidateQueries({ queryKey: ['bookings', 'stylist'] });
      client.invalidateQueries({ queryKey: bookingKeys.mine });
      client.invalidateQueries({ queryKey: ['stylist', 'summary'] });
    },
  });
}

export const useAccept = () =>
  useBookingAction(({ id, at, deposit }: { id: string; at: string; deposit?: Deposit }) =>
    acceptBooking(id, at, deposit)
  );
export const usePropose = () =>
  useBookingAction(({ id, at, deposit }: { id: string; at: string; deposit?: Deposit }) =>
    proposeTime(id, at, deposit)
  );
export const useDecline = () => useBookingAction((id: string) => declineBooking(id));
export const useDepositReceived = () => useBookingAction((id: string) => depositReceived(id));
export const useCancel = () => useBookingAction((id: string) => cancelBooking(id));
export const useClose = () =>
  useBookingAction(({ id, closeOut }: { id: string; closeOut: CloseOut }) =>
    closeBooking(id, closeOut)
  );

/* The client's side. */

export function useMyBookings(enabled = true) {
  return useQuery({ queryKey: bookingKeys.mine, queryFn: listMyBookings, enabled });
}

/**
 * Her free times for the job, fresh for half a minute: a slot someone else takes should
 * stop showing soon (and the server refuses a clash anyway). The last times stay up,
 * dimmed, while new ones load.
 */
export function useFreeSlots(query: SlotQuery, from?: string, to?: string, enabled = true) {
  return useQuery({
    queryKey: bookingKeys.slots(query, from, to),
    queryFn: () => getFreeSlots(query, from, to),
    enabled: enabled && !!query.handle && !!(query.booking || query.serviceId),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** After a time was taken from under someone: every picker asks again. */
export function useRefreshFreeSlots() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['slots'] });
}

export function useWatchSlots() {
  return useMutation({
    mutationFn: ({ stylistId, from, to }: { stylistId: string; from: string; to: string }) =>
      watchSlots(stylistId, from, to),
  });
}

export function useRequestBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: BookingDraft) => requestBooking(draft),
    onSuccess: booking => {
      client.setQueryData(bookingKeys.one(booking.id), booking);
      client.invalidateQueries({ queryKey: bookingKeys.mine });
    },
  });
}

export const useConfirmAttendance = () => useBookingAction((id: string) => confirmAttendance(id));
export const useAnswerProposal = () =>
  useBookingAction(({ id, accept }: { id: string; accept: boolean }) => answerProposal(id, accept));
export const useRequestMove = () =>
  useBookingAction(({ id, at }: { id: string; at: string }) => requestMove(id, at));
export const useAnswerMove = () =>
  useBookingAction(({ id, accept }: { id: string; accept: boolean }) => answerMove(id, accept));
export const useStartedOnTime = () =>
  useBookingAction(({ id, onTime }: { id: string; onTime: boolean }) => startedOnTime(id, onTime));

/** A review changes the booking (it now has one): read it again. */
export function useReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, body }: { id: string; rating: number; body?: string }) =>
      reviewBooking(id, rating, body),
    onSuccess: (_review, { id }) => client.invalidateQueries({ queryKey: bookingKeys.one(id) }),
  });
}
