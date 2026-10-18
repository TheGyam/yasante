import { useRef, useState } from 'react';
import {
  useMutation,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { addToPortfolio, uploadPhoto } from '@/features/stylist';
import {
  deleteLook,
  getAreas,
  getLook,
  getLooks,
  getMyLooks,
  getStyles,
  postLook,
  updateLook,
} from './api';
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
    enabled: !!id,
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

type UploadedPhoto = Awaited<ReturnType<typeof uploadPhoto>>;

/** Uploads this many of a look's photos at once. */
const MAX_CONCURRENT_UPLOADS = 3;

export interface LookPhotosProgress {
  done: number;
  total: number;
}

/** Thrown when a photo can't be uploaded, after one retry. Names which one. */
export class PhotoUploadError extends Error {
  constructor(public readonly photoIndex: number) {
    super(`Photo ${photoIndex + 1} didn’t upload. Try again.`);
  }
}

/**
 * Uploads a look's photos, at most {@link MAX_CONCURRENT_UPLOADS} at a time, keeping
 * their order. Anything already in `cache` (by file) is reused rather than sent again,
 * so calling this again after a failure only re-sends the photos that didn't make it.
 * A photo that fails twice (one retry) stops the whole upload.
 */
async function uploadLookPhotos(
  files: File[],
  cache: Map<File, UploadedPhoto>,
  onProgress?: (progress: LookPhotosProgress) => void
): Promise<UploadedPhoto[]> {
  const total = files.length;
  const results: (UploadedPhoto | undefined)[] = files.map(file => cache.get(file));
  let done = results.filter(Boolean).length;
  let next = 0;
  let failedAt = -1;
  onProgress?.({ done, total });

  const worker = async () => {
    while (failedAt === -1) {
      const i = next++;
      if (i >= total) return;
      if (results[i]) continue;
      const file = files[i];
      try {
        let uploaded: UploadedPhoto;
        try {
          uploaded = await uploadPhoto(file, 'look');
        } catch {
          uploaded = await uploadPhoto(file, 'look'); // one retry
        }
        cache.set(file, uploaded);
        results[i] = uploaded;
        done++;
        onProgress?.({ done, total });
      } catch {
        failedAt = i;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, total) }, worker));
  if (failedAt !== -1) throw new PhotoUploadError(failedAt);
  return results as UploadedPhoto[];
}

/** One look, several photos: the shared fields that stand in for every photo's own. */
export interface LookPhotosDraft {
  files: File[];
  style: string;
  serviceId?: string;
  caption: string;
}

/**
 * Posts several photos as one look: uploaded together (in order), then one `postLook`
 * call. A failed upload posts nothing; retrying only re-sends what didn't make it, since
 * what already uploaded stays cached for as long as this hook is mounted.
 */
export function usePostLookPhotos() {
  const client = useQueryClient();
  const [progress, setProgress] = useState<LookPhotosProgress>();
  const cache = useRef(new Map<File, UploadedPhoto>()).current;

  const post = async (draft: LookPhotosDraft, onPage: boolean) => {
    setProgress({ done: 0, total: draft.files.length });
    try {
      const uploaded = await uploadLookPhotos(draft.files, cache, setProgress);
      const look = await postLook({
        photoUris: uploaded.map(photo => photo.uri ?? ''),
        thumbUri: uploaded[0]?.thumbUri,
        feedUri: uploaded[0]?.feedUri,
        photoAspect: uploaded[0]?.photoAspect,
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
      cache.clear();
      client.invalidateQueries({ queryKey: lookKeys.mine });
      client.invalidateQueries({ queryKey: ['looks', 'feed'] });
      client.invalidateQueries({ queryKey: ['stylist', 'portfolio'] });
      return undefined;
    } catch (error) {
      return error;
    } finally {
      setProgress(undefined);
    }
  };

  return { post, progress, reset: () => setProgress(undefined) };
}

export function useUpdateLook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { styles?: string[]; hairTexture?: Look['hairTexture'] | null };
    }) => updateLook(id, patch),
    onSuccess: look => {
      client.setQueryData(lookKeys.look(look.id), look);
      client.invalidateQueries({ queryKey: lookKeys.mine });
      client.invalidateQueries({ queryKey: ['looks', 'feed'] });
    },
  });
}
