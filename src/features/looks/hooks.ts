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
import { prefetchImages } from '@/shared/ui/RemoteImage';
import { looksApi, type UploadCache, type UploadProgress } from './api';
import type {
  CommentsPage,
  Look,
  LookComment,
  LookDraft,
  LookFilters,
  LooksPage,
  ReportReason,
  LookVisibility,
} from './types';
import { track } from '@/shared/lib/analytics';

const KEY = 'looks';
/** Enough to fill a couple of screens of the grid, so the first page never ends early. */
const PAGE_SIZE = 20;
const COMMENTS = 'look-comments';

/**
 * The feed, a page at a time — it grows without limit. Keyed by account, because
 * who you've blocked decides what's in it, and by filters.
 */
export function useLooks(filters: LookFilters = {}, { enabled = true } = {}) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [KEY, 'feed', user?.id, filters],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const page = await looksApi.getPage(filters, pageParam, PAGE_SIZE);
      // Decode the photos now, while they're still below the fold.
      prefetchImages(page.data.map(look => look.thumbUri ?? look.photoUri));
      return page;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor,
    staleTime: 60 * 1000,
    // Changing a filter keeps the last results up, dimmed, until the new ones land.
    placeholderData: keepPreviousData,
    enabled,
  });
}

type Cached = InfiniteData<LooksPage> | Look | Look[] | undefined;

/** Every cached copy of a look, in any feed or on its own. */
function findLook(queryClient: QueryClient, id: string) {
  for (const [, data] of queryClient.getQueriesData<Cached>({ queryKey: [KEY] })) {
    if (!data) continue;
    if (Array.isArray(data)) {
      const found = data.find(look => look.id === id);
      if (found) return found;
    } else if ('pages' in data) {
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
    if (Array.isArray(data)) return data.map(look => (look.id === id ? change(look) : look));
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

/** Her own looks, private included. Under the same key, so a like or a post updates it. */
export function useMyLooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'mine', user?.id],
    queryFn: looksApi.mine,
    enabled: !!user?.id,
  });
}

/** One look. Opens instantly from the feed's copy while the fresh one loads. */
const gone = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status === 404;

/** "More like this" under a look. Kept with the looks, so a like or save shows here too. */
export function useRelatedLooks(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, 'related', user?.id, id],
    queryFn: () => looksApi.related(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLook(id: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [KEY, 'one', user?.id, id],
    queryFn: () => looksApi.get(id),
    placeholderData: () => findLook(queryClient, id),
    enabled: !!id,
    staleTime: 30 * 1000,
    // Gone is an answer: asking again won't bring it back.
    retry: (count, error) => !gone(error) && count < 2,
  });
  // Taken down or removed: it's gone for everyone, whatever copy this phone kept.
  return gone(query.error) ? { ...query, data: undefined } : query;
}

/**
 * After a save to a collection: mark the look saved wherever it's cached, so the feed
 * and grids show it at once instead of on their next read.
 */
export function useMarkLookSaved() {
  const queryClient = useQueryClient();
  return (id: string) =>
    patchLook(queryClient, id, look =>
      look.saved ? look : { ...look, saved: true, saveCount: (look.saveCount ?? 0) + 1 }
    );
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

/**
 * Cuts every cached copy of a paged list back to its first page. Refetching an
 * infinite query re-reads every page it holds, one after another — fifty pages
 * scrolled is fifty requests. Nobody needs page fifty refreshed: they're at the top.
 */
export function keepFirstPage(queryClient: QueryClient, queryKey: readonly unknown[]) {
  queryClient.setQueriesData<InfiniteData<unknown, unknown>>({ queryKey }, data =>
    data && 'pages' in data && data.pages.length > 1
      ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) }
      : data
  );
}

/** Pull to refresh: the newest page, fresh, without re-reading the rest. */
export function useRefreshLooks() {
  const queryClient = useQueryClient();
  return () => {
    keepFirstPage(queryClient, [KEY, 'feed']);
    return queryClient.refetchQueries({ queryKey: [KEY, 'feed'], type: 'active' });
  };
}

/** Anything that changes what the feed should contain re-reads it — its first page. */
function useRefreshFeed() {
  const queryClient = useQueryClient();
  return () => {
    keepFirstPage(queryClient, [KEY]);
    return queryClient.invalidateQueries({ queryKey: [KEY] });
  };
}

export function usePostLook() {
  const onSuccess = useRefreshFeed();
  return useMutation({
    mutationFn: (vars: {
      draft: LookDraft;
      cache?: UploadCache;
      onProgress?: (progress: UploadProgress) => void;
    }) => looksApi.create(vars.draft, vars),
    onSuccess: look => {
      track('post_look', { styles: look.styles.join(','), creditsStylist: !!look.stylist });
      return onSuccess();
    },
  });
}

/** Her own look, shown to everyone or just her. It keeps its date either way. */
export function useSetLookVisibility() {
  const onSuccess = useRefreshFeed();
  return useMutation({
    mutationFn: (vars: { id: string; visibility: LookVisibility }) =>
      looksApi.setVisibility(vars.id, vars.visibility),
    onSuccess,
  });
}

export function useRemoveLook() {
  const onSuccess = useRefreshFeed();
  return useMutation({ mutationFn: (id: string) => looksApi.remove(id), onSuccess });
}

/** The top of each thread under a look, newest first, a page at a time. */
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

/** One thread's replies — only fetched once someone opens it. */
export function useReplies(lookId: string, commentId: string, enabled: boolean) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [COMMENTS, user?.id, lookId, 'replies', commentId],
    queryFn: ({ pageParam }: { pageParam?: string }) => looksApi.replies(commentId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor,
    enabled,
  });
}

type CommentPages = InfiniteData<CommentsPage, string | undefined>;

/**
 * Posting a comment or a reply. The new one is put straight into the cached
 * thread rather than re-reading it: re-reading a long conversation to show one
 * line would cost more than the line.
 */
export function useAddComment(lookId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ body, replyTo }: { body: string; replyTo?: LookComment }) =>
      looksApi.comment(lookId, body, replyTo?.id),
    onSuccess: comment => {
      patchLook(queryClient, lookId, look => ({ ...look, commentCount: look.commentCount + 1 }));
      const threads = [COMMENTS, user?.id, lookId];
      if (!comment.parentId) {
        // Newest first, so a new thread goes on top.
        queryClient.setQueryData<CommentPages>(threads, data =>
          data
            ? {
                ...data,
                pages: data.pages.map((page, i) =>
                  i === 0 ? { ...page, data: [comment, ...page.data] } : page
                ),
              }
            : data
        );
        return;
      }
      // The thread's count goes up wherever it's shown...
      queryClient.setQueryData<CommentPages>(threads, data =>
        data
          ? {
              ...data,
              pages: data.pages.map(page => ({
                ...page,
                data: page.data.map(c =>
                  c.id === comment.parentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c
                ),
              })),
            }
          : data
      );
      // ...and the reply joins the end of it, if the end is already loaded.
      queryClient.setQueryData<CommentPages>([...threads, 'replies', comment.parentId], data => {
        if (!data) return data;
        const last = data.pages.length - 1;
        if (data.pages[last].nextCursor) return data;
        return {
          ...data,
          pages: data.pages.map((page, i) =>
            i === last ? { ...page, data: [...page.data, comment] } : page
          ),
        };
      });
    },
  });
}

/**
 * A comment's heart answers on the spot, wherever that comment is cached — in the
 * threads or an open thread's replies — and goes back if the server says no.
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const patch = (id: string, liked: boolean) =>
    queryClient.setQueriesData<CommentPages>({ queryKey: [COMMENTS] }, data =>
      data && 'pages' in data
        ? {
            ...data,
            pages: data.pages.map(page => ({
              ...page,
              data: page.data.map(c =>
                c.id === id && c.liked !== liked
                  ? { ...c, liked, likeCount: Math.max(0, c.likeCount + (liked ? 1 : -1)) }
                  : c
              ),
            })),
          }
        : data
    );
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => looksApi.likeComment(id, liked),
    onMutate: ({ id, liked }) => patch(id, liked),
    onError: (_e, { id, liked }) => patch(id, !liked),
  });
}

export function useRemoveComment(_lookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => looksApi.removeComment(id),
    onSuccess: () => {
      // The look's count comes back from the server; a thread can take its replies with it.
      keepFirstPage(queryClient, [COMMENTS]);
      queryClient.invalidateQueries({ queryKey: [KEY, 'one'] });
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

/** "Not for me": the feed shows fewer like it, so it's read again. */
export function useNotForMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: looksApi.notForMe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useStyleTaxonomy() {
  return useQuery({ queryKey: ['styles'], queryFn: looksApi.styles, staleTime: 60 * 60 * 1000 });
}

export function useLookAreas() {
  return useQuery({ queryKey: ['look-areas'], queryFn: looksApi.areas, staleTime: 10 * 60 * 1000 });
}
