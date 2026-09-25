import { useQuery } from '@tanstack/react-query';
import { getPolicy } from './api';
import type { PolicyType } from './types';

/** `['policy', type]` is also what the server inlines a policy page under. */
export const policyKeys = { current: (type: PolicyType) => ['policy', type] as const };

export function usePolicy(type: PolicyType) {
  return useQuery({
    queryKey: policyKeys.current(type),
    queryFn: () => getPolicy(type),
    staleTime: 60 * 60_000,
  });
}
