import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  addMenuItem,
  addTimeBlock,
  checkHandle,
  closeDay,
  getTimeBlocks,
  removeTimeBlock,
  skipTimeBlock,
  createProfile,
  getMenu,
  getMyProfile,
  getNumbers,
  getPortfolio,
  getStylistPage,
  getSummary,
  publishProfile,
  removeMenuItem,
  removePortfolioPhoto,
  searchStylists,
  updateMenuItem,
  updateProfile,
  uploadProof,
  joinPageWaitlist,
  leavePageWaitlist,
} from './api';
import { handleProblem } from './handle';
import type {
  MenuItemDraft,
  StylistFilters,
  StylistPage,
  StylistProfile,
  StylistProfileDraft,
} from './types';

/**
 * Query keys. `['stylist', handle]` (lower case) is also what the server inlines her
 * page under (backend/apps/web/views.py), so keep the two in step.
 */
export const stylistKeys = {
  page: (handle: string) => ['stylist', handle.toLowerCase()] as const,
  search: (filters: StylistFilters) => ['stylists', filters] as const,
  mine: (accountId: string) => ['stylist', 'mine', accountId] as const,
  handle: (handle: string) => ['stylists', 'handle', handle] as const,
  menu: (accountId: string) => ['stylist', 'menu', accountId] as const,
  portfolio: (accountId: string) => ['stylist', 'portfolio', accountId] as const,
  numbers: (accountId: string) => ['stylist', 'numbers', accountId] as const,
  summary: (accountId: string) => ['stylist', 'summary', accountId] as const,
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

export function useMenu(accountId: string) {
  return useQuery({ queryKey: stylistKeys.menu(accountId), queryFn: getMenu });
}

/** Adds a service, or changes one when it has an id. */
export function useSaveMenuItem(accountId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id?: string; draft: MenuItemDraft }) =>
      id ? updateMenuItem(id, draft) : addMenuItem(draft),
    onSuccess: () => client.invalidateQueries({ queryKey: stylistKeys.menu(accountId) }),
  });
}

export function useRemoveMenuItem(accountId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: removeMenuItem,
    onSuccess: () => client.invalidateQueries({ queryKey: stylistKeys.menu(accountId) }),
  });
}

export function usePortfolio(accountId: string) {
  return useQuery({ queryKey: stylistKeys.portfolio(accountId), queryFn: getPortfolio });
}

export function useRemovePortfolioPhoto(accountId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: removePortfolioPhoto,
    onSuccess: () => client.invalidateQueries({ queryKey: stylistKeys.portfolio(accountId) }),
  });
}

/** Changes to her page: hours, payment details, address, anything from setup. */
export function useUpdateProfile(accountId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<StylistProfileDraft> & { address?: string }) =>
      updateProfile(changes),
    onSuccess: profile => client.setQueryData(stylistKeys.mine(accountId), profile),
  });
}

export function useTimeBlocks(accountId: string) {
  return useQuery({ queryKey: ['stylist', 'blocks', accountId], queryFn: getTimeBlocks });
}

function useBlockChange<A>(accountId: string, change: (args: A) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: change,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['stylist', 'blocks', accountId] });
      client.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export const useAddTimeBlock = (accountId: string) => useBlockChange(accountId, addTimeBlock);
export const useRemoveTimeBlock = (accountId: string) => useBlockChange(accountId, removeTimeBlock);
export const useSkipTimeBlock = (accountId: string) => useBlockChange(accountId, skipTimeBlock);

/** Closes a day to new bookings, or opens it again. */
export function useCloseDay(accountId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ date, closed }: { date: string; closed: boolean }) => closeDay(date, closed),
    onSuccess: profile => client.setQueryData(stylistKeys.mine(accountId), profile),
  });
}

export function useNumbers(accountId: string) {
  return useQuery({ queryKey: stylistKeys.numbers(accountId), queryFn: getNumbers });
}

export function useSummary(accountId: string) {
  return useQuery({
    queryKey: stylistKeys.summary(accountId),
    queryFn: getSummary,
    // Requests arrive while she's looking: check again every minute.
    refetchInterval: 60_000,
  });
}

/** Toggles whether the signed-in visitor is on a featured stylist's waitlist. */
export function useTogglePageWaitlist(handle: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (join: boolean) => (join ? joinPageWaitlist(handle) : leavePageWaitlist(handle)),
    onMutate: async (join: boolean) => {
      const key = stylistKeys.page(handle);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<StylistPage>(key);
      client.setQueryData<StylistPage>(key, old => (old ? { ...old, waitlistJoined: join } : old));
      return { previous };
    },
    onError: (_err, _join, context) => {
      if (context?.previous) {
        client.setQueryData(stylistKeys.page(handle), context.previous);
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: stylistKeys.page(handle) });
    },
  });
}

