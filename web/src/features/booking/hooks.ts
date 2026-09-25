import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptBooking,
  cancelBooking,
  closeBooking,
  declineBooking,
  depositReceived,
  getBooking,
  listBookings,
  proposeTime,
} from './api';
import type { Booking, BookingStatus, CloseOut, Deposit } from './types';

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (status: BookingStatus[]) => ['bookings', 'stylist', status] as const,
  one: (id: string) => ['bookings', 'one', id] as const,
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
