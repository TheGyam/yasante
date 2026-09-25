import type { Schemas } from '@/shared/lib/api/types';

export type Look = Schemas['Look'];
export type LooksPage = Schemas['LooksPage'];
export type Style = Schemas['Style'];

/** What the feed can be narrowed by. Each is a query parameter on /api/looks/. */
export interface LookFilters {
  style?: string;
  area?: string;
  hair?: Look['hairTexture'];
}
