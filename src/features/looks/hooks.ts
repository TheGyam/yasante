import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { looksApi } from './api';
import type { LookDraft, ReportReason } from './types';

const KEY = 'looks';

/**
 * The feed, a page at a time — it grows without limit. Keyed by account, because
 * who you've blocked decides what's in it.
 */
export function useLooks() {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [KEY, 'feed', user?.id],
    queryFn: ({ pageParam }: { pageParam?: string }) => looksApi.getPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor,
    staleTime: 60 * 1000,
  });
}

/** Anything that changes what the feed should contain re-reads it. */
function useRefreshFeed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return () => queryClient.invalidateQueries({ queryKey: [KEY, 'feed', user?.id] });
}

export function usePostLook() {
  const onSuccess = useRefreshFeed();
  return useMutation({ mutationFn: (draft: LookDraft) => looksApi.create(draft), onSuccess });
}

export function useRemoveLook() {
  const onSuccess = useRefreshFeed();
  return useMutation({ mutationFn: (id: string) => looksApi.remove(id), onSuccess });
}

export function useReportLook() {
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: ReportReason; note?: string }) =>
      looksApi.report(id, reason, note),
  });
}

/** Blocking hides their looks straight away, so the feed is re-read. */
export function useBlockAuthor() {
  const onSuccess = useRefreshFeed();
  return useMutation({ mutationFn: (accountId: string) => looksApi.block(accountId), onSuccess });
}
