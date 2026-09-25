import { api } from '@/shared/lib/api/client';
import type { StylistFilters, StylistPage, StylistSearchResult } from './types';

/** Her public page: profile, menu, work, reviews. */
export const getStylistPage = (handle: string) =>
  api.get<StylistPage>(`/stylists/by-handle/${encodeURIComponent(handle)}/`);

/** Live pages matching every filter given. With none, the server answers an empty list. */
export const searchStylists = (filters: StylistFilters) =>
  api.get<StylistSearchResult[]>('/stylists/', { ...filters });
