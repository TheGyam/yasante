import { useState } from 'react';
import {
  useMutation,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { addToPortfolio, uploadPhoto } from '@/features/stylist';
import { deleteLook, getAreas, getLook, getLooks, getMyLooks, getStyles, postLook } from './api';
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
  mine: ['looks', 'mine'] as const,
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

export function useMyLooks() {
  return useQuery({ queryKey: lookKeys.mine, queryFn: getMyLooks });
}

export function useDeleteLook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteLook,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: lookKeys.mine });
      client.invalidateQueries({ queryKey: ['looks', 'feed'] });
    },
  });
}

/** One photo to post, as she tagged it. */
export interface WorkDraft {
  file: File;
  style: string;
  serviceId?: string;
  caption: string;
}

export interface PostProgress {
  done: number;
  total: number;
  /** Photos that didn't post, with why, so she can try just those again. */
  failed: { draft: WorkDraft; error: unknown }[];
}

/**
 * Posts her work a photo at a time: uploaded once, posted as a look (the feed), and
 * added to her page linked to that look. One failure doesn't stop the rest.
 */
export function usePostWork() {
  const client = useQueryClient();
  const [progress, setProgress] = useState<PostProgress>();

  const post = async (drafts: WorkDraft[], onPage: boolean) => {
    const failed: PostProgress['failed'] = [];
    setProgress({ done: 0, total: drafts.length, failed });
    for (const [index, draft] of drafts.entries()) {
      try {
        const photo = await uploadPhoto(draft.file, 'look');
        const look = await postLook({
          photoUri: photo.uri ?? '',
          feedUri: photo.feedUri,
          thumbUri: photo.thumbUri,
          photoAspect: photo.photoAspect,
          styles: [draft.style],
          serviceId: draft.serviceId,
          caption: draft.caption.trim(),
          visibility: 'public',
        });
        if (onPage) {
          await addToPortfolio([
            {
              uri: look.photoUri,
              thumbUri: look.thumbUri,
              serviceId: draft.serviceId,
              lookId: look.id,
            },
          ]);
        }
      } catch (error) {
        failed.push({ draft, error });
      }
      setProgress({ done: index + 1, total: drafts.length, failed: [...failed] });
    }
    client.invalidateQueries({ queryKey: lookKeys.mine });
    client.invalidateQueries({ queryKey: ['looks', 'feed'] });
    client.invalidateQueries({ queryKey: ['stylist', 'portfolio'] });
    return failed;
  };

  return { post, progress, reset: () => setProgress(undefined) };
}
