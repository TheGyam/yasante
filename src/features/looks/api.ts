import { apiClient } from '@/shared/lib/api/client';
import type { Look, LookDraft, LooksPage, ReportReason } from './types';

export const looksApi = {
  /** GET /api/looks/?cursor=&limit= — newest first, minus anyone you've blocked. */
  getPage: async (cursor?: string, limit = 12) =>
    (await apiClient.get<LooksPage>('/api/looks/', { params: { cursor, limit } })).data,

  /** POST /api/looks/ — the server fills in the author and the tagged service. */
  create: async (draft: LookDraft) => (await apiClient.post<Look>('/api/looks/', draft)).data,

  /** DELETE /api/looks/:id/ — your own look only. */
  remove: async (id: string) => {
    await apiClient.delete(`/api/looks/${id}/`);
  },

  /** POST /api/looks/:id/report/ — goes to moderation, not to the author. */
  report: async (id: string, reason: ReportReason, note?: string) => {
    await apiClient.post(`/api/looks/${id}/report/`, { reason, note });
  },

  /** POST /api/blocks/ — hides everything by that account, both ways. */
  block: async (accountId: string) => {
    await apiClient.post('/api/blocks/', { accountId });
  },
};
