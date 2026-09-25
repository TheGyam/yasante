import type { Schemas } from '@/shared/lib/api/types';

export type StylistPage = Schemas['StylistPageResponse'];
export type PublicProfile = Schemas['PublicProfile'];
export type MenuItem = Schemas['MenuItem'];
export type PortfolioPhoto = Schemas['PortfolioPhoto'];
export type PageReview = Schemas['PageReview'];
export type Availability = Schemas['Availability'];
export type StylistSearchResult = Schemas['StylistSearchResult'];

/** What the stylist search can be narrowed by (GET /api/stylists/). */
export interface StylistFilters {
  q?: string;
  style?: string;
  area?: string;
}
