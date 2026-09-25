import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  checkHandle,
  createProfile,
  getMyProfile,
  getStylistPage,
  publishProfile,
  searchStylists,
  updateProfile,
  uploadProof,
} from './api';
import { handleProblem } from './handle';
import type { StylistFilters, StylistProfile, StylistProfileDraft } from './types';

/**
 * Query keys. `['stylist', handle]` (lower case) is also what the server inlines her
 * page under (backend/apps/web/views.py), so keep the two in step.
 */
export const stylistKeys = {
  page: (handle: string) => ['stylist', handle.toLowerCase()] as const,
  search: (filters: StylistFilters) => ['stylists', filters] as const,
  mine: (accountId: string) => ['stylist', 'mine', accountId] as const,
  handle: (handle: string) => ['stylists', 'handle', handle] as const,
};

export function useStylistPage(handle: string) {
  return useQuery({
    queryKey: stylistKeys.page(handle),
    queryFn: () => getStylistPage(handle),
  });
}

/** Start loading her page before the click lands. */
export function usePrefetchStylist() {
  const client = useQueryClient();
  return (handle: string) =>
    client.prefetchQuery({
      queryKey: stylistKeys.page(handle),
      queryFn: () => getStylistPage(handle),
    });
}

export function useStylistSearch(filters: StylistFilters) {
  return useQuery({
    queryKey: stylistKeys.search(filters),
    queryFn: () => searchStylists(filters),
    enabled: Object.values(filters).some(Boolean),
  });
}

/** Her own page, or null when she hasn't made one yet. */
export function useMyProfile(accountId: string) {
  return useQuery({
    queryKey: stylistKeys.mine(accountId),
    queryFn: () =>
      getMyProfile().catch(error => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
    staleTime: 0,
  });
}

/** Whether a handle is free, checked once she stops typing. As the app's. */
export function useHandleAvailability(handle: string) {
  const settled = useDebouncedValue(handle.trim(), 400);
  const problem = handleProblem(settled);
  const query = useQuery({
    queryKey: stylistKeys.handle(settled),
    queryFn: () => checkHandle(settled),
    enabled: !problem,
    staleTime: 60_000,
    retry: false,
  });
  return {
    problem,
    /** Still deciding: waiting for her to stop typing, or for the answer. */
    checking: !problem && (query.isFetching || settled !== handle.trim()),
    available: query.data?.handle === settled ? query.data.available : undefined,
    suggestions: query.data?.suggestions ?? [],
  };
}

/**
 * Saves her page and puts it live: creates it the first time, updates it after, with
 * the proof photo uploaded on the way if she picked one.
 */
export function useGoLive(accountId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      draft,
      proof,
      existing,
    }: {
      draft: StylistProfileDraft;
      proof?: File;
      existing: StylistProfile | null;
    }) => {
      const proofPhotoUri = proof ? (await uploadProof(proof)).uri : draft.proofPhotoUri;
      const body = { ...draft, proofPhotoUri: proofPhotoUri || undefined };
      if (existing) await updateProfile(body);
      else await createProfile(body);
      return publishProfile();
    },
    onSuccess: profile => {
      client.setQueryData(stylistKeys.mine(accountId), profile);
      client.invalidateQueries({ queryKey: stylistKeys.page(profile.handle) });
    },
  });
}
