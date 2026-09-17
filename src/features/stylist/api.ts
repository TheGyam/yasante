import { apiClient } from '@/shared/lib/api/client';
import type { StylistProfile, StylistProfileDraft, StylistSummary } from './types';

export interface HandleCheck {
  handle: string;
  available: boolean;
  /** Free handles close to the one asked for, when it's taken. */
  suggestions?: string[];
}

export const stylistApi = {
  /** GET /api/stylists/me/ — 404 when the account has no stylist profile yet. */
  getMine: async () => (await apiClient.get<StylistProfile>('/api/stylists/me/')).data,

  /** GET /api/stylists/me/summary/ */
  getSummary: async () => (await apiClient.get<StylistSummary>('/api/stylists/me/summary/')).data,

  /** GET /api/stylists/handle-available/?handle=… — public, so signup can check as she types. */
  checkHandle: async (handle: string) =>
    (
      await apiClient.get<HandleCheck>('/api/stylists/handle-available/', {
        params: { handle },
      })
    ).data,

  /** POST /api/stylists/ — creates her profile as a draft. */
  create: async (draft: StylistProfileDraft) =>
    (await apiClient.post<StylistProfile>('/api/stylists/', draft)).data,

  /** PATCH /api/stylists/me/ */
  update: async (changes: Partial<StylistProfileDraft>) =>
    (await apiClient.patch<StylistProfile>('/api/stylists/me/', changes)).data,

  /** POST /api/stylists/me/publish/ — puts the page live. Needs a verified phone. */
  publish: async () => (await apiClient.post<StylistProfile>('/api/stylists/me/publish/')).data,
};
