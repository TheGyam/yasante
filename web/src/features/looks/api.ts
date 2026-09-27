import { api } from '@/shared/lib/api/client';
import type { Schemas } from '@/shared/lib/api/types';
import type { Look, LookFilters, LooksPage, Style } from './types';

/** A page of the feed: newest and liveliest first, as the server orders it. */
export const getLooks = (filters: LookFilters, cursor?: string, limit = 24) =>
  api.get<LooksPage>('/looks/', { ...filters, cursor, limit });

export const getLook = (id: string) => api.get<Look>(`/looks/${id}/`);

/** The taxonomy looks are tagged from. `id` is the slug. */
export const getStyles = () => api.get<Style[]>('/styles/');

/** Districts that have public looks in them. */
export const getAreas = () => api.get<string[]>('/looks/areas/');

export type NewLook = Schemas['LookCreateRequestRequest'];

/** Her own looks, newest first: everything she's posted, public or not. */
export const getMyLooks = () => api.get<Look[]>('/looks/mine/');

export const postLook = (look: NewLook) => api.post<Look>('/looks/', look);

export const deleteLook = (id: string) => api.delete(`/looks/${id}/`);
