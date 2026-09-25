import { api } from '@/shared/lib/api/client';
import type { Look, LookFilters, LooksPage, Style } from './types';

/** A page of the feed: newest and liveliest first, as the server orders it. */
export const getLooks = (filters: LookFilters, cursor?: string, limit = 24) =>
  api.get<LooksPage>('/looks/', { ...filters, cursor, limit });

export const getLook = (id: string) => api.get<Look>(`/looks/${id}/`);

/** The taxonomy looks are tagged from. `id` is the slug. */
export const getStyles = () => api.get<Style[]>('/styles/');

/** Districts that have public looks in them. */
export const getAreas = () => api.get<string[]>('/looks/areas/');
