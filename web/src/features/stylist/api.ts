import { api } from '@/shared/lib/api/client';
import type {
  HandleCheck,
  StylistFilters,
  StylistPage,
  StylistProfile,
  StylistProfileDraft,
  StylistSearchResult,
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

/** Makes the account a stylist, with a draft page only she can see. */
export const createProfile = (draft: StylistProfileDraft) =>
  api.post<StylistProfile>('/stylists/', draft);

export const updateProfile = (draft: Partial<StylistProfileDraft>) =>
  api.patch<StylistProfile>('/stylists/me/', draft);

export const publishProfile = () => api.post<StylistProfile>('/stylists/me/publish/');

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
