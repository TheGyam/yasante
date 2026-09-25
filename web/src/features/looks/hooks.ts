import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { getAreas, getLook, getLooks, getStyles } from './api';
import type { Look, LookFilters, LooksPage } from './types';

/**
 * Query keys. `['look', id]` is also what the server inlines a look page under
 * (backend/apps/web/views.py), so keep the two in step.
 */
export const lookKeys = {
  feed: (filters: LookFilters) => ['looks', 'feed', filters] as const,
  look: (id: string) => ['look', id] as const,
  styles: ['styles'] as const,
  areas: ['looks', 'areas'] as const,
};

/** The feed, a page at a time. */
export function useLooks(filters: LookFilters, limit?: number) {
  return useInfiniteQuery({
    queryKey: [...lookKeys.feed(filters), limit],
    queryFn: ({ pageParam }) => getLooks(filters, pageParam, limit),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor || undefined,
  });
}

/** A look already on screen in a feed, so its page can open on it at once. */
function fromFeeds(client: QueryClient, id: string) {
  for (const [, data] of client.getQueriesData<InfiniteData<LooksPage>>({
    queryKey: ['looks', 'feed'],
  })) {
    const found = data?.pages.flatMap(page => page.data).find(look => look.id === id);
    if (found) return found;
  }
  return undefined;
}

export function useLook(id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: lookKeys.look(id),
    queryFn: () => getLook(id),
    placeholderData: () => fromFeeds(client, id),
  });
}

/** Start loading a look before the click lands. */
export function usePrefetchLook() {
  const client = useQueryClient();
  return (id: string) =>
    client.prefetchQuery({ queryKey: lookKeys.look(id), queryFn: () => getLook(id) });
}

export function useStyles() {
  return useQuery({ queryKey: lookKeys.styles, queryFn: getStyles, staleTime: 60 * 60_000 });
}

export function useAreas() {
  return useQuery({ queryKey: lookKeys.areas, queryFn: getAreas, staleTime: 60 * 60_000 });
}

/** Style slug → its name, for labelling a look's tags. */
export function useStyleNames() {
  const { data } = useStyles();
  return new Map((data ?? []).map(style => [style.id, style.name]));
}

export type { Look };
