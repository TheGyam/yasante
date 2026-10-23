import { useQuery } from '@tanstack/react-query';
import { isNotFound } from '@/shared/lib/errors';
import { getSharedCarePlan, getSharedCollection } from './api';

/**
 * Query keys. `['shared', kind, code]` is also what the server inlines a shared page
 * under (backend/apps/web/views.py), so keep the two in step.
 */
export const sharedKeys = {
  collection: (code: string) => ['shared', 'collection', code] as const,
  carePlan: (code: string) => ['shared', 'care-plan', code] as const,
};

// A link that's stopped stays stopped: no point asking again.
const retry = (count: number, error: unknown) => !isNotFound(error) && count < 2;

export function useSharedCollection(code: string) {
  return useQuery({
    queryKey: sharedKeys.collection(code),
    queryFn: () => getSharedCollection(code),
    retry,
  });
}

export function useSharedCarePlan(code: string) {
  return useQuery({
    queryKey: sharedKeys.carePlan(code),
    queryFn: () => getSharedCarePlan(code),
    retry,
  });
}
