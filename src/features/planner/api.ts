import { apiClient } from '@/shared/lib/api/client';
import { localTimestamp } from '@/shared/lib/analytics';
import type {
  CarePlan,
  CarePlanDraft,
  CarePlanSession,
  Collection,
  CollectionItem,
  CollectionItemKind,
} from './types';

export const plannerApi = {
  /** GET /api/collections/ */
  getCollections: async () => (await apiClient.get<Collection[]>('/api/collections/')).data,

  /** POST /api/collections/ */
  createCollection: async (name: string, isPrivate: boolean) =>
    (await apiClient.post<Collection>('/api/collections/', { name, isPrivate })).data,

  /** PATCH /api/collections/:id/ */
  updateCollection: async (id: string, changes: { name?: string; isPrivate?: boolean }) =>
    (await apiClient.patch<Collection>(`/api/collections/${id}/`, changes)).data,

  /** DELETE /api/collections/:id/ — the saved things stay, the set goes. */
  deleteCollection: async (id: string) => {
    await apiClient.delete(`/api/collections/${id}/`);
  },

  /** GET /api/collections/:id/items/ */
  getItems: async (id: string) =>
    (await apiClient.get<CollectionItem[]>(`/api/collections/${id}/items/`)).data,

  /**
   * POST /api/collections/:id/items/ — the server reads the title and picture off a
   * look. Content is admin-authored elsewhere, so for that the app sends what it has.
   */
  addItem: async (
    id: string,
    kind: CollectionItemKind,
    refId: string,
    shown?: { title?: string; imageUri?: string }
  ) =>
    (
      await apiClient.post<CollectionItem>(`/api/collections/${id}/items/`, {
        kind,
        refId,
        ...shown,
      })
    ).data,

  /** DELETE /api/collections/:id/items/:itemId/ */
  removeItem: async (id: string, itemId: string) => {
    await apiClient.delete(`/api/collections/${id}/items/${itemId}/`);
  },

  /** GET /api/care-plans/ */
  getCarePlans: async () => (await apiClient.get<CarePlan[]>('/api/care-plans/')).data,

  /** POST /api/care-plans/ */
  createCarePlan: async (draft: CarePlanDraft) =>
    (await apiClient.post<CarePlan>('/api/care-plans/', draft)).data,

  /** PATCH /api/care-plans/:id/ */
  updateCarePlan: async (id: string, draft: Partial<CarePlanDraft>) =>
    (await apiClient.patch<CarePlan>(`/api/care-plans/${id}/`, draft)).data,

  /** DELETE /api/care-plans/:id/ */
  deleteCarePlan: async (id: string) => {
    await apiClient.delete(`/api/care-plans/${id}/`);
  },

  /** GET /api/care-plans/:id/sessions/ — every time it was followed, newest first. */
  getSessions: async (id: string) =>
    (await apiClient.get<CarePlanSession[]>(`/api/care-plans/${id}/sessions/`)).data,

  /** POST /api/care-plans/:id/sessions/ — done, with an optional note. Appended, never edited. */
  logSession: async (id: string, notes?: string) =>
    (
      await apiClient.post<CarePlanSession>(`/api/care-plans/${id}/sessions/`, {
        notes,
        // Her own clock, so "you do this on Sundays" is her Sunday.
        localAt: localTimestamp(),
      })
    ).data,
};
