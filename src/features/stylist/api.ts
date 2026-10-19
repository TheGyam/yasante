import { apiClient } from '@/shared/lib/api/client';
import { uploadImage } from '@/shared/lib/imageService';
import { deviceZone } from '@/shared/lib/timeZone';
import type {
  StylistSearchResult,
  MenuItem,
  MenuItemDraft,
  PortfolioPhoto,
  PortfolioPhotoDraft,
  StylistPage,
  StylistProfile,
  TimeBlock,
  StylistProfileDraft,
  StylistNumbers,
  StylistSummary,
} from './types';

export interface Country {
  /** ISO 3166, e.g. "GH". */
  code: string;
  name: string;
  /** ISO 4217, e.g. "GHS": every price a stylist there sets is in it. */
  currency: string;
  units: 'km' | 'mi';
}

export interface HandleCheck {
  handle: string;
  available: boolean;
  /** Free handles close to the one asked for, when it's taken. */
  suggestions?: string[];
}

/** How far to look, in miles, or anywhere. */
export type Within = number | 'any';

export const stylistApi = {
  /** GET /api/stylists/?q= — live pages matching a name, handle or area. */
  search: async (q: string) =>
    (await apiClient.get<StylistSearchResult[]>('/api/stylists/', { params: { q } })).data,

  /** GET /api/stylists/?style= — who does a style: their price for it and their work in it. */
  byStyle: async (style: string, within?: Within) =>
    (
      await apiClient.get<StylistSearchResult[]>('/api/stylists/', {
        params: { style, ...(within !== undefined && { near: 'me', within }) },
      })
    ).data,

  /** GET /api/countries/ — every country, its currency and its distance units. */
  countries: async () => (await apiClient.get<Country[]>('/api/countries/')).data,

  /** GET /api/places/suggest/ — areas matching what she's typed, outside the UK. Never kept. */
  places: async (q: string, country: string) =>
    (
      await apiClient.get<{ name: string; context: string }[]>('/api/places/suggest/', {
        params: { q, country },
      })
    ).data,

  /** GET /api/stylists/me/ — 404 when the account has no stylist profile yet. */
  getMine: async () => (await apiClient.get<StylistProfile>('/api/stylists/me/')).data,

  /**
   * GET /api/stylists/by-handle/:handle/ — her page, as a client sees it. Public:
   * the same read the web pages on yasante.com will use.
   */
  getPage: async (handle: string) =>
    (await apiClient.get<StylistPage>(`/api/stylists/by-handle/${handle}/`)).data,

  /** PUT / DELETE /api/stylists/by-handle/:handle/waitlist/ — a featured stylist's waitlist. */
  setWaitlist: async (handle: string, join: boolean) =>
    (
      await apiClient.request<{ joined: boolean }>({
        method: join ? 'PUT' : 'DELETE',
        url: `/api/stylists/by-handle/${encodeURIComponent(handle)}/waitlist/`,
      })
    ).data,

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
    // Her working hours are on this phone's clock.
    return (
      await apiClient.post<StylistProfile>('/api/stylists/', {
        ...draft,
        proofPhotoUri,
        timeZone: deviceZone(),
      })
    ).data;
  },

  /** PATCH /api/stylists/me/ */
  /**
   * POST /api/stylists/me/closed-days/ — she has enough clients that day: no new
   * requests for it. What's already booked stays. `closed: false` opens it again.
   */
  closeDay: async (date: string, closed: boolean) =>
    (await apiClient.post<StylistProfile>('/api/stylists/me/closed-days/', { date, closed })).data,

  /** GET /api/stylists/me/blocks/ — time she's blocked out, still to come. */
  blocks: async () => (await apiClient.get<TimeBlock[]>('/api/stylists/me/blocks/')).data,

  /** POST /api/stylists/me/blocks/ — refused over an appointment or a waiting request. */
  addBlock: async (block: Omit<TimeBlock, 'id'>) =>
    (await apiClient.post<TimeBlock>('/api/stylists/me/blocks/', block)).data,

  /** POST /api/stylists/me/blocks/:id/skip/ — one day of a repeating block off, or on again. */
  skipBlock: async ({ id, date, skip }: { id: string; date: string; skip: boolean }) =>
    (await apiClient.post<TimeBlock>(`/api/stylists/me/blocks/${id}/skip/`, { date, skip })).data,

  /** DELETE /api/stylists/me/blocks/:id/ */
  removeBlock: async (id: string) => {
    await apiClient.delete(`/api/stylists/me/blocks/${id}/`);
  },

  update: async (changes: Partial<StylistProfileDraft>) => {
    const body = { ...changes };
    if (body.proofPhotoUri)
      body.proofPhotoUri = (await uploadImage(body.proofPhotoUri, 'proof')).uri;
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
    (
      await apiClient.patch<PortfolioPhoto>(`/api/stylists/me/portfolio/${id}/`, {
        ...changes,
        // "No service" is undefined here, and undefined never reaches the server; null clears it.
        ...('serviceId' in changes && { serviceId: changes.serviceId ?? null }),
      })
    ).data,

  /** DELETE /api/stylists/me/portfolio/:id/ */
  removePhoto: async (id: string) => {
    await apiClient.delete(`/api/stylists/me/portfolio/${id}/`);
  },
};
