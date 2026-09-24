import { apiClient } from '@/shared/lib/api/client';
import { uploadImage } from '@/shared/lib/imageService';
import type {
  StylistSearchResult,
  MenuItem,
  MenuItemDraft,
  PortfolioPhoto,
  PortfolioPhotoDraft,
  StylistPage,
  StylistProfile,
  StylistProfileDraft,
  StylistNumbers,
  StylistSummary,
} from './types';

export interface HandleCheck {
  handle: string;
  available: boolean;
  /** Free handles close to the one asked for, when it's taken. */
  suggestions?: string[];
}

export const stylistApi = {
  /** GET /api/stylists/?q= — live pages matching a name, handle or area. */
  search: async (q: string) =>
    (await apiClient.get<StylistSearchResult[]>('/api/stylists/', { params: { q } })).data,

  /** GET /api/stylists/me/ — 404 when the account has no stylist profile yet. */
  getMine: async () => (await apiClient.get<StylistProfile>('/api/stylists/me/')).data,

  /**
   * GET /api/stylists/by-handle/:handle/ — her page, as a client sees it. Public:
   * the same read the web pages on yasante.com will use.
   */
  getPage: async (handle: string) =>
    (await apiClient.get<StylistPage>(`/api/stylists/by-handle/${handle}/`)).data,

  /** GET /api/stylists/me/numbers/ — this week against last, and how her services really run. */
  getNumbers: async () => (await apiClient.get<StylistNumbers>('/api/stylists/me/numbers/')).data,

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
  create: async (draft: StylistProfileDraft) => {
    const proofPhotoUri = draft.proofPhotoUri
      ? (await uploadImage(draft.proofPhotoUri, 'proof')).uri
      : undefined;
    return (await apiClient.post<StylistProfile>('/api/stylists/', { ...draft, proofPhotoUri }))
      .data;
  },

  /** PATCH /api/stylists/me/ */
  update: async (changes: Partial<StylistProfileDraft>) => {
    const body = { ...changes };
    if (body.proofPhotoUri) body.proofPhotoUri = (await uploadImage(body.proofPhotoUri, 'proof')).uri;
    return (await apiClient.patch<StylistProfile>('/api/stylists/me/', body)).data;
  },

  /** POST /api/stylists/me/publish/ — puts the page live. Needs a verified phone. */
  publish: async () => (await apiClient.post<StylistProfile>('/api/stylists/me/publish/')).data,

  /** GET /api/stylists/me/menu/ — her whole menu, in the order she arranged it. */
  getMenu: async () => (await apiClient.get<MenuItem[]>('/api/stylists/me/menu/')).data,

  /** POST /api/stylists/me/menu/ */
  addMenuItem: async (draft: MenuItemDraft) =>
    (await apiClient.post<MenuItem>('/api/stylists/me/menu/', draft)).data,

  /** PATCH /api/stylists/me/menu/:id/ */
  updateMenuItem: async (id: string, changes: Partial<MenuItemDraft>) =>
    (await apiClient.patch<MenuItem>(`/api/stylists/me/menu/${id}/`, changes)).data,

  /** DELETE /api/stylists/me/menu/:id/ */
  removeMenuItem: async (id: string) => {
    await apiClient.delete(`/api/stylists/me/menu/${id}/`);
  },

  /** POST /api/stylists/me/menu/import/ — a pasted price list, appended in one go. */
  importMenu: async (items: MenuItemDraft[]) =>
    (await apiClient.post<MenuItem[]>('/api/stylists/me/menu/import/', { items })).data,

  /** GET /api/stylists/me/portfolio/ */
  getPortfolio: async () =>
    (await apiClient.get<PortfolioPhoto[]>('/api/stylists/me/portfolio/')).data,

  /**
   * POST /api/stylists/me/portfolio/ — photos always arrive as a batch, even a batch
   * of one. Each photo is uploaded first, a few at a time.
   */
  addPhotos: async (photos: PortfolioPhotoDraft[], postAsLooks = false) => {
    const uploaded = [];
    for (let i = 0; i < photos.length; i += 4) {
      const batch = photos.slice(i, i + 4);
      const done = await Promise.all(batch.map(p => uploadImage(p.uri, 'portfolio')));
      uploaded.push(
        ...batch.map((p, j) => ({ ...p, uri: done[j].uri, thumbUri: done[j].thumbUri }))
      );
    }
    return (
      await apiClient.post<PortfolioPhoto[]>('/api/stylists/me/portfolio/', {
        photos: uploaded,
        postAsLooks,
      })
    ).data;
  },

  /** PATCH /api/stylists/me/portfolio/:id/ — re-tag a photo. */
  updatePhoto: async (id: string, changes: Partial<PortfolioPhotoDraft>) =>
    (await apiClient.patch<PortfolioPhoto>(`/api/stylists/me/portfolio/${id}/`, changes)).data,

  /** DELETE /api/stylists/me/portfolio/:id/ */
  removePhoto: async (id: string) => {
    await apiClient.delete(`/api/stylists/me/portfolio/${id}/`);
  },
};
