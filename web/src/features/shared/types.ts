import type { Schemas } from '@/shared/lib/api/types';

export type SharedCollection = Schemas['SharedCollectionResponse'];
export type SharedCarePlan = Schemas['SharedCarePlanResponse'];
export type SharedKind = 'collection' | 'care-plan';
