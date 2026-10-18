import type { Schemas } from '@/shared/lib/api/types';

export type Booking = Schemas['Booking'];
export type BookingStatus = Schemas['BookingStatusEnum'];
export type CloseOut = Schemas['CloseRequestRequest'];
export type Deposit = Schemas['MoneyMethodRequest'];
export type FreeSlots = Schemas['FreeSlots'];
export type SlotInterest = Schemas['SlotInterest'];

/** Which free times to ask for: a job from her menu, or an appointment to move. */
export interface SlotQuery {
  handle: string;
  serviceId?: string;
  optionIds?: string[];
  /** Moving this appointment: its own length, its own time counted free. */
  booking?: string;
}
export type BookingDraft = Schemas['BookingCreateRequestRequest'];
