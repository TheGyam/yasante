import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { looksApi } from './api';
import type { Look, LookDraft, LookFilters, LooksPage, ReportReason } from './types';
import { track } from '@/shared/lib/analytics';

const KEY = 'looks';
const COMMENTS = 'look-comments';

/**
 * The feed, a page at a time — it grows without limit. Keyed by account, because
 * who you've blocked decides what's in it, and by filters.
 */
export function useLooks(filters: LookFilters = {}, { enabled = true } = {}) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [KEY, 'feed', user?.id, filters],
    queryFn: ({ pageParam }: { pageParam?: string }) => looksApi.getPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor,
    staleTime: 60 * 1000,
    // Changing a filter keeps the last results up, dimmed, until the new ones land.
    placeholderData: keepPreviousData,
    enabled,
  });
}

type Cached = InfiniteData<LooksPage> | Look | undefined;

/** Every cached copy of a look, in any feed or on its own. */
function findLook(queryClient: QueryClient, id: string) {
  for (const [, data] of queryClient.getQueriesData<Cached>({ queryKey: [KEY] })) {
    if (!data) continue;
    if ('pages' in data) {
      const found = data.pages.flatMap(page => page.data).find(look => look.id === id);
      if (found) return found;
    } else if (data.id === id) return data;
  }
  return undefined;
}

/** Changes one look wherever it's cached, so a like shows in the feed and the detail at once. */
function patchLook(queryClient: QueryClient, id: string, change: (look: Look) => Look) {
  queryClient.setQueriesData<Cached>({ queryKey: [KEY] }, data => {
    if (!data) return data;
    if ('pages' in data) {
      return {
        ...data,
        pages: data.pages.map(page => ({
          ...page,
          data: page.data.map(look => (look.id === id ? change(look) : look)),
        })),
      };
    }
    return data.id === id ? change(data) : data;
  });
}

/** One look. Opens instantly from the feed's copy while the fresh one loads. */
export function useLook(id: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'one', user?.id, id],
    queryFn: () => looksApi.get(id),
    placeholderData: () => findLook(queryClient, id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * A like is answered on the spot, and put back if the server says no. It's the
 * one place the cache is patched rather than re-read: re-reading every page of a
 * feed per tap would cost more than the like is worth.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => looksApi.like(id, liked),
    onMutate: ({ id, liked }) => {
      const flip = (look: Look) => ({
        ...look,
        liked,
        likeCount: Math.max(0, look.likeCount + (liked ? 1 : -1)),
      });
      patchLook(queryClient, id, flip);
    },
    onError: (_error, { id, liked }) =>
      patchLook(queryClient, id, look => ({
        ...look,
        liked: !liked,
        likeCount: Math.max(0, look.likeCount + (liked ? -1 : 1)),
      })),
  });
}

/** Anything that changes what the feed should contain re-reads it. */
function useRefreshFeed() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function usePostLook() {
  const onSuccess = useRefreshFeed();
  return useMutation({
    mutationFn: (draft: LookDraft) => looksApi.create(draft),
    onSuccess: look => {
      track('post_look', { styles: look.styles.join(','), creditsStylist: !!look.stylist });
      return onSuccess();
    },
  });
}

export function useRemoveLook() {
  const onSuccess = useRefreshFeed();
  return useMutation({ mutationFn: (id: string) => looksApi.remove(id), onSuccess });
}

export function useComments(lookId: string) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [COMMENTS, user?.id, lookId],
    queryFn: ({ pageParam }: { pageParam?: string }) => looksApi.comments(lookId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor,
    enabled: !!lookId,
  });
}

export function useAddComment(lookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => looksApi.comment(lookId, body),
    onSuccess: () => {
      patchLook(queryClient, lookId, look => ({ ...look, commentCount: look.commentCount + 1 }));
      return queryClient.invalidateQueries({ queryKey: [COMMENTS] });
    },
  });
}

export function useRemoveComment(lookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => looksApi.removeComment(id),
    onSuccess: () => {
      patchLook(queryClient, lookId, look => ({
        ...look,
        commentCount: Math.max(0, look.commentCount - 1),
      }));
      return queryClient.invalidateQueries({ queryKey: [COMMENTS] });
    },
  });
}

export type ReportTarget = 'look' | 'comment' | 'profile';

/** Reports go to moderation. The person reported is never told who. */
export function useReport() {
  return useMutation({
    mutationFn: ({
      kind,
      id,
      reason,
      note,
    }: {
      kind: ReportTarget;
      id: string;
      reason: ReportReason;
      note?: string;
    }) =>
      kind === 'comment'
        ? looksApi.reportComment(id, reason, note)
        : kind === 'profile'
          ? looksApi.reportProfile(id, reason, note)
          : looksApi.report(id, reason, note),
  });
}

/** Blocking hides their looks and comments straight away, so all of it is re-read. */
export function useBlockAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => looksApi.block(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: [COMMENTS] });
    },
  });
}

export function useStyleTaxonomy() {
  return useQuery({ queryKey: ['styles'], queryFn: looksApi.styles, staleTime: 60 * 60 * 1000 });
}

export function useLookAreas() {
  return useQuery({ queryKey: ['look-areas'], queryFn: looksApi.areas, staleTime: 10 * 60 * 1000 });
}
