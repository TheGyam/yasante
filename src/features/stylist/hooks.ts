import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { stylistApi } from './api';
import { handleProblem } from './handle';
import type { StylistProfile, StylistProfileDraft } from './types';

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
    // A missing profile is an answer, not a failure worth retrying.
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
}

/** Counts shown on the mode switch. */
export function useStylistSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'summary', user?.id],
    queryFn: stylistApi.getSummary,
    enabled: !!user?.roles?.includes('stylist'),
    staleTime: 60 * 1000,
  });
}

/**
 * Is this handle free? Checked as she types, once she's stopped, and only when the
 * handle could be valid at all — so a half-typed name never hits the server.
 */
export function useHandleAvailability(handle: string) {
  const settled = useDebouncedValue(handle.trim(), 400);
  const problem = handleProblem(settled);
  const query = useQuery({
    queryKey: [KEY, 'handle', settled],
    queryFn: () => stylistApi.checkHandle(settled),
    enabled: !problem,
    staleTime: 60 * 1000,
    retry: false,
  });

  return {
    problem,
    /** Still deciding: either waiting for her to stop typing, or for the answer. */
    checking: !problem && (query.isFetching || settled !== handle.trim()),
    available: query.data?.handle === settled ? query.data.available : undefined,
    suggestions: query.data?.suggestions ?? [],
  };
}

function useSaveProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return (profile: StylistProfile) => queryClient.setQueryData([KEY, 'me', user?.id], profile);
}

export function useCreateStylistProfile() {
  const save = useSaveProfile();
  return useMutation({
    mutationFn: (draft: StylistProfileDraft) => stylistApi.create(draft),
    onSuccess: save,
  });
}

export function useUpdateStylistProfile() {
  const save = useSaveProfile();
  return useMutation({
    mutationFn: (changes: Partial<StylistProfileDraft>) => stylistApi.update(changes),
    onSuccess: save,
  });
}

/** Puts the page live. The server refuses until the phone is verified. */
export function usePublishPage() {
  const save = useSaveProfile();
  return useMutation({ mutationFn: stylistApi.publish, onSuccess: save });
}
