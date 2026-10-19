import type { User } from '@/features/profile';
import { apiClient } from '@/shared/lib/api/client';
import type { ClaimPreview, FinishState, StylePrice } from './types';

const claimPath = (code: string) => `/api/featured/claim/${encodeURIComponent(code)}/`;

export const claimApi = {
  /** GET /api/featured/claim/:code/ — 410 once the link is used or has run out. */
  preview: async (code: string) => (await apiClient.get<ClaimPreview>(claimPath(code))).data,

  /** POST /api/featured/claim/:code/ — the page, its looks and photos become hers. */
  claim: async (code: string) => (await apiClient.post<User>(claimPath(code))).data,

  /** GET /api/stylists/me/finish/ — 404 unless her page came from Yasante. */
  finish: async () => (await apiClient.get<FinishState>('/api/stylists/me/finish/')).data,

  /** POST /api/stylists/me/finish/price/ — prices a style: its service, and every photo of it. */
  price: async (price: StylePrice) =>
    (await apiClient.post<FinishState>('/api/stylists/me/finish/price/', price)).data,

  /** POST /api/stylists/me/finish/tags-checked/ */
  tagsChecked: async () =>
    (await apiClient.post<FinishState>('/api/stylists/me/finish/tags-checked/')).data,
};
