import { api } from '@/shared/lib/api/client';
import type { SharedCarePlan, SharedCollection } from './types';

export const getSharedCollection = (code: string) =>
  api.get<SharedCollection>(`/shared/collections/${encodeURIComponent(code)}/`);

export const getSharedCarePlan = (code: string) =>
  api.get<SharedCarePlan>(`/shared/care-plans/${encodeURIComponent(code)}/`);
