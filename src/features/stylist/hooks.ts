import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { stylistApi } from './api';

const KEY = 'stylist';

/** True when the request failed because there's nothing there — not because of the network. */
export const isNotFound = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status === 404;

/** The signed-in account's stylist profile, when it has the stylist role. */
export function useMyStylistProfile() {
  const { user } = useAuth();
  const isStylist = !!user?.roles?.includes('stylist');
  return useQuery({
    queryKey: [KEY, 'me', user?.id],
    queryFn: stylistApi.getMine,
    enabled: isStylist,
    staleTime: 10 * 60 * 1000,
  });
}

/** Counts shown on the mode switch. Refreshed when the app returns to the foreground. */
export function useStylistSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'summary', user?.id],
    queryFn: stylistApi.getSummary,
    enabled: !!user?.roles?.includes('stylist'),
    staleTime: 60 * 1000,
  });
}
