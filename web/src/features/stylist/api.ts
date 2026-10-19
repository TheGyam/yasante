import { api } from '@/shared/lib/api/client';
import type {
  Country,
  MenuItem,
  MenuItemDraft,
  Numbers,
  PortfolioPhoto,
  StylistSummary,
  HandleCheck,
  StylistFilters,
  StylistPage,
  StylistProfile,
  StylistProfileDraft,
  StylistSearchResult,
  TimeBlock,
  Upload,
} from './types';

/** Her public page: profile, menu, work, reviews. */
export const getStylistPage = (handle: string) =>
  api.get<StylistPage>(`/stylists/by-handle/${encodeURIComponent(handle)}/`);

/** Live pages matching every filter given. With none, the server answers an empty list. */
export const searchStylists = (filters: StylistFilters) =>
  api.get<StylistSearchResult[]>('/stylists/', { ...filters });

/** Her own page, draft or live. A 404 means she hasn't made one yet. */
export const getMyProfile = () => api.get<StylistProfile>('/stylists/me/');

/** Every country, its currency and its distance units. */
export const getCountries = () => api.get<Country[]>('/countries/');

/** Makes the account a stylist, with a draft page only she can see. */
export const createProfile = (draft: StylistProfileDraft) =>
  api.post<StylistProfile>('/stylists/', draft);

export const updateProfile = (draft: Partial<StylistProfileDraft>) =>
  api.patch<StylistProfile>('/stylists/me/', draft);

export const publishProfile = () => api.post<StylistProfile>('/stylists/me/publish/');

/** Time she's blocked out of her diary, still to come. Clients see it as booked. */
export const getTimeBlocks = () => api.get<TimeBlock[]>('/stylists/me/blocks/');
export const addTimeBlock = (block: {
  start: string;
  end: string;
  note?: string;
  repeats?: number[];
}) => api.post<TimeBlock>('/stylists/me/blocks/', block);
export const removeTimeBlock = (id: string) => api.delete(`/stylists/me/blocks/${id}/`);
/** One day of a repeating block off, or on again. */
export const skipTimeBlock = ({ id, date, skip }: { id: string; date: string; skip: boolean }) =>
  api.post<TimeBlock>(`/stylists/me/blocks/${id}/skip/`, { date, skip });

/** Enough clients that day: no new requests for it (what's booked stays), or open again. */
export const closeDay = (date: string, closed: boolean) =>
  api.post<StylistProfile>('/stylists/me/closed-days/', { date, closed });

export const checkHandle = (handle: string) =>
  api.get<HandleCheck>('/stylists/handle-available/', { handle });

/** The proof photo: private, seen only by Yasante when checking her page. */
export function uploadProof(file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', 'proof');
  form.append('visibility', 'private');
  return api.upload<Upload>('/uploads/', form);
}

/** Her whole menu, in the order she arranged it. */
export const getMenu = () => api.get<MenuItem[]>('/stylists/me/menu/');
export const addMenuItem = (draft: MenuItemDraft) =>
  api.post<MenuItem>('/stylists/me/menu/', draft);
export const updateMenuItem = (id: string, draft: Partial<MenuItemDraft>) =>
  api.patch<MenuItem>(`/stylists/me/menu/${id}/`, draft);
export const removeMenuItem = (id: string) => api.delete(`/stylists/me/menu/${id}/`);

export const getPortfolio = () => api.get<PortfolioPhoto[]>('/stylists/me/portfolio/');
export const removePortfolioPhoto = (id: string) => api.delete(`/stylists/me/portfolio/${id}/`);

/** This week against last, and how her services really run. */
export const getNumbers = () => api.get<Numbers>('/stylists/me/numbers/');
/** What's waiting: requests to answer, appointments today. */
export const getSummary = () => api.get<StylistSummary>('/stylists/me/summary/');

/** A photo for the feed or her portfolio: public, resized, with a feed and thumbnail copy. */
export function uploadPhoto(file: File, kind: 'look' | 'portfolio') {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  form.append('source', 'camera_roll');
  return api.upload<Upload>('/uploads/', form);
}

/** Photos for her page's "Their work", each linked to the look it was posted as. */
export const addToPortfolio = (
  photos: { uri: string; thumbUri?: string; serviceId?: string; lookId?: string }[]
) => api.post<PortfolioPhoto[]>('/stylists/me/portfolio/', { photos });

/** Join or leave the waitlist for a featured stylist. */
export const joinPageWaitlist = (handle: string) =>
  api.put<{ joined: boolean }>(`/stylists/by-handle/${encodeURIComponent(handle)}/waitlist/`);

export const leavePageWaitlist = (handle: string) =>
  api.delete<{ joined: boolean }>(`/stylists/by-handle/${encodeURIComponent(handle)}/waitlist/`);
