import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { stylistApi, type Within } from './api';
import { handleProblem } from './handle';
import type {
  MenuItemDraft,
  PortfolioPhotoDraft,
  StylistProfile,
  StylistProfileDraft,
} from './types';

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

/** Who does a style, with their price for it and a photo of their work in it. */
export function useStylistsForStyle(
  style?: string,
  { enabled = true, within }: { enabled?: boolean; within?: Within } = {}
) {
  return useQuery({
    queryKey: [KEY, 'style', style, within],
    queryFn: () => stylistApi.byStyle(style!, within),
    placeholderData: previous => previous,
    enabled: enabled && !!style,
    staleTime: 5 * 60 * 1000,
  });
}

/** Stylists whose name, handle or area matches what's typed. */
export function useStylistSearch(q: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: [KEY, 'search', q],
    queryFn: () => stylistApi.search(q),
    enabled: enabled && !!q,
    staleTime: 60 * 1000,
  });
}

/** Her page, by handle — what a client opens from a look or a shared link. */
export function useStylistPage(handle?: string) {
  return useQuery({
    ...pageQuery(handle!),
    enabled: !!handle,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
}

const pageQuery = (handle: string) => ({
  queryKey: [KEY, 'page', handle],
  queryFn: () => stylistApi.getPage(handle),
  staleTime: 5 * 60 * 1000,
});

/**
 * Loads a stylist's page ahead of the tap most likely to come next (her name or
 * Book, from one of her looks), so it opens with everything in place. Once per
 * handle, and not at all if a fresh copy is cached.
 */
export function usePrefetchStylistPage(handle?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (handle) queryClient.prefetchQuery(pageQuery(handle));
  }, [handle, queryClient]);
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

/** Her week. Fresh on each visit — it's the screen she checks. */
export function useStylistNumbers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'numbers', user?.id],
    queryFn: stylistApi.getNumbers,
    enabled: !!user?.roles?.includes('stylist'),
    staleTime: 0,
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

/** Her menu. A stylist has a handful of services, so it arrives as one list. */
export function useMenu() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'menu', user?.id],
    queryFn: stylistApi.getMenu,
    enabled: !!user?.roles?.includes('stylist'),
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
}

/** Writes the menu the server just returned back into the list. */
/**
 * Every menu write re-reads the list rather than patching the cache by hand. A
 * patch that lands after an in-flight read duplicated a whole pasted list once;
 * the menu is a handful of rows, so reading it again is cheaper than being clever.
 */
function useRefreshMenu() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () => queryClient.invalidateQueries({ queryKey: [KEY, 'menu', user?.id] });
}

export function useAddMenuItem() {
  const onSuccess = useRefreshMenu();
  return useMutation({
    mutationFn: (draft: MenuItemDraft) => stylistApi.addMenuItem(draft),
    onSuccess,
  });
}

export function useUpdateMenuItem(id: string) {
  const onSuccess = useRefreshMenu();
  return useMutation({
    mutationFn: (changes: Partial<MenuItemDraft>) => stylistApi.updateMenuItem(id, changes),
    onSuccess,
  });
}

export function useRemoveMenuItem(id: string) {
  const onSuccess = useRefreshMenu();
  return useMutation({ mutationFn: () => stylistApi.removeMenuItem(id), onSuccess });
}

/** A pasted price list, added to whatever is already there. */
export function useImportMenu() {
  const onSuccess = useRefreshMenu();
  return useMutation({
    mutationFn: (drafts: MenuItemDraft[]) => stylistApi.importMenu(drafts),
    onSuccess,
  });
}

/** Her portfolio. Virtualised where it's drawn, so it can grow without limit. */
export function usePortfolio() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'portfolio', user?.id],
    queryFn: stylistApi.getPortfolio,
    enabled: !!user?.roles?.includes('stylist'),
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });
}

function useRefreshPortfolio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () => queryClient.invalidateQueries({ queryKey: [KEY, 'portfolio', user?.id] });
}

/** A batch of photos, tagged as she imported them. */
export function useAddPhotos() {
  const refresh = useRefreshPortfolio();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      photos,
      postAsLooks,
    }: {
      photos: PortfolioPhotoDraft[];
      postAsLooks: boolean;
    }) => stylistApi.addPhotos(photos, postAsLooks),
    onSuccess: added => {
      // Anything shared is new in the feed and on her own looks.
      if (added.some(photo => photo.lookId)) queryClient.invalidateQueries({ queryKey: ['looks'] });
      return refresh();
    },
  });
}

/** Takes the id per call: a grid re-tags whichever photo was tapped. */
export function useUpdatePhoto() {
  const onSuccess = useRefreshPortfolio();
  return useMutation({
    mutationFn: ({ id, ...changes }: Partial<PortfolioPhotoDraft> & { id: string }) =>
      stylistApi.updatePhoto(id, changes),
    onSuccess,
  });
}

export function useRemovePhoto() {
  const onSuccess = useRefreshPortfolio();
  return useMutation({ mutationFn: (id: string) => stylistApi.removePhoto(id), onSuccess });
}
