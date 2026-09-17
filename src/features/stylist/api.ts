import { apiClient } from '@/shared/lib/api/client';
import type { StylistProfile, StylistSummary } from './types';

export const stylistApi = {
  /** GET /api/stylists/me/ — 404 when the account has no stylist profile yet. */
  getMine: async () => (await apiClient.get<StylistProfile>('/api/stylists/me/')).data,

  /** GET /api/stylists/me/summary/ */
  getSummary: async () => (await apiClient.get<StylistSummary>('/api/stylists/me/summary/')).data,
};
