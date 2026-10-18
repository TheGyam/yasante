import { api } from '@/shared/lib/api/client';
import type { ClaimPreview, Finish, FinishPriceRequest, User } from './types';

/** Preview what her page looks like before claiming it. */
export const getClaimPreview = (code: string) =>
  api.get<ClaimPreview>(`/featured/claim/${encodeURIComponent(code)}/`);

/** Make the page hers. Answers with the updated user. */
export const claimPage = (code: string) =>
  api.post<User>(`/featured/claim/${encodeURIComponent(code)}/`);

/** The checklist state for finishing a claimed page. */
export const getFinishState = () => api.get<Finish>('/stylists/me/finish/');

/** Price a style from her photos to create the service. */
export const saveFinishPrice = (data: FinishPriceRequest) =>
  api.post<Finish>('/stylists/me/finish/price/', data);

/** Confirm the tags on her photos are right. */
export const checkFinishTags = () =>
  api.post<Finish>('/stylists/me/finish/tags-checked/');
