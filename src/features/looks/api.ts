import { apiClient } from '@/shared/lib/api/client';
import { uploadImage, type UploadedPhoto } from '@/shared/lib/imageService';
import type {
  CommentsPage,
  Look,
  LookComment,
  LookDraft,
  LookFilters,
  LooksPage,
  ReportReason,
  Style,
  LookVisibility,
} from './types';

/** Uploads this many of a look's photos at once. */
const MAX_CONCURRENT_UPLOADS = 3;

export interface UploadProgress {
  done: number;
  total: number;
}

/** Local uri -> where it ended up, kept by the composer across a retry. */
export type UploadCache = Map<string, UploadedPhoto>;

/** Thrown when a photo can't be uploaded, after one retry. Names which one. */
export class PhotoUploadError extends Error {
  constructor(public readonly photoIndex: number) {
    super(`Photo ${photoIndex + 1} couldn’t be uploaded.`);
  }
}

/**
 * Uploads a draft's local photos, at most {@link MAX_CONCURRENT_UPLOADS} at a
 * time, keeping their order. Anything already in `cache` (by local uri) is
 * reused rather than sent again, so calling this again after a failure only
 * re-sends the photos that didn't make it. A photo that fails twice (one retry)
 * stops the whole upload — nothing is posted with photos missing.
 */
async function uploadLookPhotos(
  uris: string[],
  cache: UploadCache,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedPhoto[]> {
  const total = uris.length;
  const results: (UploadedPhoto | undefined)[] = uris.map(uri => cache.get(uri));
  let done = results.filter(Boolean).length;
  let next = 0;
  let failedAt = -1;
  onProgress?.({ done, total });

  const worker = async () => {
    while (failedAt === -1) {
      const i = next++;
      if (i >= total) return;
      if (results[i]) continue;
      const uri = uris[i];
      try {
        let uploaded: UploadedPhoto;
        try {
          uploaded = await uploadImage(uri, 'look');
        } catch {
          uploaded = await uploadImage(uri, 'look'); // one retry
        }
        cache.set(uri, uploaded);
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

export const looksApi = {
  /** GET /api/looks/?cursor=&limit=&hair=&style=&area= — newest first, minus anyone you've blocked. */
  getPage: async (filters: LookFilters, cursor?: string, limit = 12) =>
    (
      await apiClient.get<LooksPage>('/api/looks/', {
        params: { cursor, limit, ...filters },
      })
    ).data,

  /** GET /api/looks/:id/related/ — "More like this", closest and best for her first, paged. */
  related: async (id: string, cursor?: string, limit = 20) =>
    (await apiClient.get<LooksPage>(`/api/looks/${id}/related/`, { params: { cursor, limit } }))
      .data,

  /** GET /api/looks/mine/ — her own, private ones included. */
  mine: async () => (await apiClient.get<Look[]>('/api/looks/mine/')).data,

  /** PATCH /api/looks/:id/ — who sees her own look: everyone, or just her. */
  setVisibility: async (id: string, visibility: LookVisibility) =>
    (await apiClient.patch<Look>(`/api/looks/${id}/`, { visibility })).data,

  /** PATCH /api/looks/:id/ — her own look's styles and hair type. */
  updateTags: async (id: string, tags: { styles?: string[]; hairTexture?: string | null }) =>
    (
      await apiClient.patch<Look>(`/api/looks/${id}/`, {
        ...(tags.styles && { styles: tags.styles }),
        ...(tags.hairTexture !== undefined && { hairTexture: tags.hairTexture ?? '' }),
      })
    ).data,

  /** GET /api/looks/:id/ */
  get: async (id: string) => (await apiClient.get<Look>(`/api/looks/${id}/`)).data,

  /** POST /api/looks/ — the server fills in the author, the stylist and the tagged service. */
  create: async (
    draft: LookDraft,
    options: { cache?: UploadCache; onProgress?: (progress: UploadProgress) => void } = {}
  ) => {
    // The photos go up first, in order; the look points at where they now live.
    const uploaded = await uploadLookPhotos(
      draft.photoUris,
      options.cache ?? new Map(),
      options.onProgress
    );
    return (
      await apiClient.post<Look>('/api/looks/', {
        ...draft,
        photoUris: uploaded.map(photo => photo.uri),
      })
    ).data;
  },

  /** DELETE /api/looks/:id/ — your own look only. */
  remove: async (id: string) => {
    await apiClient.delete(`/api/looks/${id}/`);
  },

  /** POST / DELETE /api/looks/:id/like/ */
  like: async (id: string, liked: boolean) => {
    if (liked) await apiClient.post(`/api/looks/${id}/like/`);
    else await apiClient.delete(`/api/looks/${id}/like/`);
  },

  /** GET /api/looks/:id/comments/?cursor= — the top of each thread, newest first. */
  comments: async (id: string, cursor?: string) =>
    (
      await apiClient.get<CommentsPage>(`/api/looks/${id}/comments/`, {
        params: { cursor, limit: 10 },
      })
    ).data,

  /** GET /api/comments/:id/replies/?cursor= — one thread's replies, oldest first. */
  replies: async (commentId: string, cursor?: string) =>
    (
      await apiClient.get<CommentsPage>(`/api/comments/${commentId}/replies/`, {
        params: { cursor, limit: 10 },
      })
    ).data,

  /** POST /api/looks/:id/comments/ — `replyTo` is any comment, top-level or a reply. */
  comment: async (id: string, body: string, replyTo?: string) =>
    (await apiClient.post<LookComment>(`/api/looks/${id}/comments/`, { body, replyTo })).data,

  /** POST / DELETE /api/comments/:id/like/ */
  likeComment: async (id: string, liked: boolean) => {
    if (liked) await apiClient.post(`/api/comments/${id}/like/`);
    else await apiClient.delete(`/api/comments/${id}/like/`);
  },

  /** DELETE /api/comments/:id/ — your own comment only. */
  removeComment: async (id: string) => {
    await apiClient.delete(`/api/comments/${id}/`);
  },

  /** POST /api/looks/:id/report/ — goes to moderation, not to the author. */
  report: async (id: string, reason: ReportReason, note?: string) => {
    await apiClient.post(`/api/looks/${id}/report/`, { reason, note });
  },

  /** POST /api/comments/:id/report/ */
  reportComment: async (id: string, reason: ReportReason, note?: string) => {
    await apiClient.post(`/api/comments/${id}/report/`, { reason, note });
  },

  /** POST /api/stylists/:accountId/report/ — a profile, usually for work that isn't hers. */
  reportProfile: async (accountId: string, reason: ReportReason, note?: string) => {
    await apiClient.post(`/api/stylists/${accountId}/report/`, { reason, note });
  },

  /** POST /api/shared/collections/:code/report/ (or care-plans): someone's shared one. */
  reportShared: async (
    kind: 'collection' | 'care-plan',
    code: string,
    reason: ReportReason,
    note?: string
  ) => {
    await apiClient.post(
      `/api/shared/${kind === 'collection' ? 'collections' : 'care-plans'}/${code}/report/`,
      { reason, note }
    );
  },

  /** POST /api/blocks/ — hides everything by that account, both ways. */
  block: async (accountId: string) => {
    await apiClient.post('/api/blocks/', { accountId });
  },

  /** POST /api/not-for-me/ — a look, or a stylist's account: her feed shows fewer like it. */
  notForMe: async (what: { lookId: string } | { stylistId: string }) => {
    await apiClient.post('/api/not-for-me/', what);
  },

  /** GET /api/styles/ — the taxonomy looks are tagged from. */
  styles: async () => (await apiClient.get<Style[]>('/api/styles/')).data,

  /** GET /api/looks/areas/ — districts that have looks in them. */
  areas: async () => (await apiClient.get<string[]>('/api/looks/areas/')).data,
};
