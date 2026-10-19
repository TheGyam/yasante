import type { Schemas } from '@/shared/lib/api/types';

export type StylistPage = Schemas['StylistPageResponse'];
export type PublicProfile = Schemas['PublicProfile'];
export type MenuItem = Schemas['MenuItem'];
export type PortfolioPhoto = Schemas['PortfolioPhoto'];
export type PageReview = Schemas['PageReview'];
export type Availability = Schemas['Availability'];
export type TimeBlock = Schemas['TimeBlock'];
export type StylistSearchResult = Schemas['StylistSearchResult'];

/** What the stylist search can be narrowed by (GET /api/stylists/). */
export interface StylistFilters {
  q?: string;
  style?: string;
  area?: string;
}

/** Her own page, as she sees it (drafts included). */
export type Country = Schemas['Country'];
export type StylistProfile = Schemas['StylistProfile'];
export type StylistProfileDraft = Schemas['StylistProfileDraftRequest'];
export type StylistPolicies = Schemas['PoliciesRequest'];
export type ServiceModel = Schemas['ServiceModelsBafEnum'];
export type HandleCheck = Schemas['HandleCheckResponse'];
export type Upload = Schemas['UploadResponse'];
export type MenuItemDraft = Schemas['MenuItemDraftRequest'];
export type MenuOption = Schemas['MenuOption'];
export type OptionGroup = MenuOption['group'];
export type PaymentMethod = Schemas['PaymentMethodRequest'];
export type Numbers = Schemas['Numbers'];
export type StylistSummary = Schemas['StylistSummary'];
