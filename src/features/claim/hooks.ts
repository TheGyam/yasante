import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useAuthStore } from '@/features/auth';
import { claimApi } from './api';
import type { FinishState } from './types';

const FINISH = ['claim', 'finish'] as const;

/** What her link shows. A used or run-out link is a 410, never retried. */
export function useClaimPreview(code: string) {
  return useQuery({
    queryKey: ['claim', 'preview', code],
    queryFn: () => claimApi.preview(code),
    enabled: !!code,
    retry: false,
  });
}

/** Makes the page hers, and her account a stylist's. */
export function useClaimPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimApi.claim,
    onSuccess: user => {
      useAuthStore.getState().setUser(user);
      // Her page, profile and looks all just changed hands.
      void queryClient.invalidateQueries({ queryKey: ['stylist'] });
      void queryClient.invalidateQueries({ queryKey: ['looks'] });
    },
  });
}

/** The checklist, for a page that came from Yasante; nothing for anyone else. */
export function useFinishState() {
  const { user } = useAuth();
  const stylist = !!user?.roles?.includes('stylist');
  return useQuery({
    queryKey: [...FINISH, user?.id],
    // Most stylists set up their own page: nothing to finish is an answer, not an error,
    // and it's kept rather than asked for again on every screen.
    queryFn: async () => {
      try {
        return await claimApi.finish();
      } catch (error) {
        if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: stylist,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

function useFinishWrite<T>(write: (input: T) => Promise<FinishState>) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: write,
    onSuccess: state => {
      queryClient.setQueryData([...FINISH, user?.id], state);
      // A priced style is a new service, and its looks now carry a price.
      void queryClient.invalidateQueries({ queryKey: ['stylist'] });
      void queryClient.invalidateQueries({ queryKey: ['looks'] });
    },
  });
}

export const usePriceStyle = () => useFinishWrite(claimApi.price);
export const useTagsChecked = () => useFinishWrite(() => claimApi.tagsChecked());
