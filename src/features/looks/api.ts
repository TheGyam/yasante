import { apiClient } from '@/shared/lib/api/client';
import { uploadImage } from '@/shared/lib/imageService';
import type {
  CommentsPage,
  Look,
  LookComment,
  LookDraft,
  LookFilters,
  LooksPage,
  ReportReason,
  Style,
} from './types';

export const looksApi = {
  /** GET /api/looks/?cursor=&limit=&hair=&style=&area= — newest first, minus anyone you've blocked. */
  getPage: async (filters: LookFilters, cursor?: string, limit = 12) =>
    (
      await apiClient.get<LooksPage>('/api/looks/', {
        params: { cursor, limit, ...filters },
      })
    ).data,

  /** GET /api/looks/mine/ — her own, private ones included. */
  mine: async () => (await apiClient.get<Look[]>('/api/looks/mine/')).data,

  /** GET /api/looks/:id/ */
  get: async (id: string) => (await apiClient.get<Look>(`/api/looks/${id}/`)).data,

  /** POST /api/looks/ — the server fills in the author, the stylist and the tagged service. */
  create: async (draft: LookDraft) => {
    // The photo goes up first; the look points at where it now lives.
    const photo = await uploadImage(draft.photoUri);
    return (
      await apiClient.post<Look>('/api/looks/', {
        ...draft,
        photoUri: photo.uri,
        thumbUri: photo.thumbUri,
        photoAspect: photo.photoAspect,
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

  /** POST /api/blocks/ — hides everything by that account, both ways. */
  block: async (accountId: string) => {
    await apiClient.post('/api/blocks/', { accountId });
  },

  /** GET /api/styles/ — the taxonomy looks are tagged from. */
  styles: async () => (await apiClient.get<Style[]>('/api/styles/')).data,

  /** GET /api/looks/areas/ — districts that have looks in them. */
  areas: async () => (await apiClient.get<string[]>('/api/looks/areas/')).data,
};
