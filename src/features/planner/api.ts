import { apiClient } from '@/shared/lib/api/client';
import { localTimestamp } from '@/shared/lib/analytics';
import type {
  CarePlan,
  CarePlanDraft,
  CarePlanSchedule,
  CarePlanSession,
  Collection,
  CollectionItem,
  CollectionItemKind,
  SharedCarePlan,
  SharedCollection,
  Sharing,
} from './types';

export const plannerApi = {
  /** GET /api/collections/ */
  getCollections: async () => (await apiClient.get<Collection[]>('/api/collections/')).data,

  /** POST /api/collections/ — only hers until she shares it. */
  createCollection: async (name: string) =>
    (await apiClient.post<Collection>('/api/collections/', { name })).data,

  /** PATCH /api/collections/:id/ */
  updateCollection: async (id: string, changes: { name?: string }) =>
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

  // Sharing. A link carries only a random code: everything else is fetched for whoever opens it.

  /** POST /api/collections/:id/share/ to share by link; DELETE to stop (the link stops working). */
  shareCollection: async (id: string, sharing: Sharing) =>
    (sharing === 'link'
      ? await apiClient.post<Collection>(`/api/collections/${id}/share/`)
      : await apiClient.delete<Collection>(`/api/collections/${id}/share/`)
    ).data,

  /** GET /api/shared/collections/:code/ — what anyone with the link sees. */
  getSharedCollection: async (code: string) =>
    (await apiClient.get<SharedCollection>(`/api/shared/collections/${code}/`)).data,

  /** POST /api/shared/collections/:code/follow/ — it joins her Planner, kept up to date. */
  followCollection: async (code: string) =>
    (await apiClient.post<Collection>(`/api/shared/collections/${code}/follow/`)).data,

  /**
   * POST /api/shared/collections/:code/make-mine/ — her own version to change. From one
   * she follows, POST /api/collections/:id/make-mine/ turns that one into hers.
   */
  makeCollectionMine: async (from: { code?: string; id?: string }, name: string) =>
    (
      await apiClient.post<Collection>(
        from.id
          ? `/api/collections/${from.id}/make-mine/`
          : `/api/shared/collections/${from.code}/make-mine/`,
        { name }
      )
    ).data,

  /** POST /api/care-plans/:id/share/ to share by link; DELETE to stop. */
  shareCarePlan: async (id: string, sharing: Sharing) =>
    (sharing === 'link'
      ? await apiClient.post<CarePlan>(`/api/care-plans/${id}/share/`)
      : await apiClient.delete<CarePlan>(`/api/care-plans/${id}/share/`)
    ).data,

  /** GET /api/shared/care-plans/:code/ */
  getSharedCarePlan: async (code: string) =>
    (await apiClient.get<SharedCarePlan>(`/api/shared/care-plans/${code}/`)).data,

  /** POST /api/shared/care-plans/:code/follow/ — the author's steps, on her own schedule. */
  followCarePlan: async (code: string, schedule: CarePlanSchedule) =>
    (await apiClient.post<CarePlan>(`/api/shared/care-plans/${code}/follow/`, schedule)).data,

  /** As makeCollectionMine: her schedule stays, and the steps become hers to change. */
  makeCarePlanMine: async (from: { code?: string; id?: string }, name: string) =>
    (
      await apiClient.post<CarePlan>(
        from.id
          ? `/api/care-plans/${from.id}/make-mine/`
          : `/api/shared/care-plans/${from.code}/make-mine/`,
        { name }
      )
    ).data,
};
