import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays } from 'date-fns';
import { apiClient, type ApiSchemas } from '@/shared/lib/api';
import { localTimestamp } from '@/shared/lib/analytics';

/** A trim, a wash day or a style taken out: appended, never edited. */
export type HairLogEntry = ApiSchemas['HairLog'];
export type HairLogKind = HairLogEntry['kind'];
/** Why a style came out. "hurt" is health data: only offered with hair details consent. */
export type TakeDownReason = 'time' | 'hurt' | 'frizzy' | 'event' | 'other';

/** The answers to "why did it come out?", in the order they're offered. */
export const TAKE_DOWN_REASONS: { value: TakeDownReason; label: string }[] = [
  { value: 'time', label: 'It was time' },
  { value: 'hurt', label: 'It hurt' },
  { value: 'frizzy', label: 'It got frizzy' },
  { value: 'event', label: 'For an event' },
  { value: 'other', label: 'Other' },
];

const KEY = ['hair-log'];

export function useHairLog(enabled = true) {
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async () => (await apiClient.get<HairLogEntry[]>('/api/hair-log/')).data,
  });
}

export function useLogHair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      entry:
        | HairLogKind
        | { kind: HairLogKind; at?: string; bookingId?: string; reason?: TakeDownReason }
    ) => {
      const { kind, ...rest } = typeof entry === 'string' ? { kind: entry } : entry;
      return (
        await apiClient.post<HairLogEntry>('/api/hair-log/', {
          kind,
          localAt: localTimestamp(),
          ...rest,
        })
      ).data;
    },
    onSuccess: entry =>
      queryClient.setQueryData<HairLogEntry[]>(KEY, list => [entry, ...(list ?? [])]),
  });
}

/** Take back something noted by mistake (the server allows it within a day). */
export function useUnlogHair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/hair-log/${id}/`),
    onSuccess: (_, id) =>
      queryClient.setQueryData<HairLogEntry[]>(KEY, list => (list ?? []).filter(e => e.id !== id)),
  });
}

/** "Today", "Yesterday", "12 days ago" — since the last one of a kind, if there is one. */
export function sinceLast(
  entries: HairLogEntry[] | undefined,
  kind: HairLogKind,
  now = new Date()
) {
  const last = entries?.find(e => e.kind === kind);
  if (!last) return undefined;
  const days = differenceInCalendarDays(now, new Date(last.at));
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
}
