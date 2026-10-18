import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';

export type FeatureKey = 'multi_photo_looks' | 'video_posts';

type FeaturesResponse = { features: Record<string, boolean> };

/**
 * Which switches Yaw has turned on. Per signed-in account — staff, listed
 * accounts and percentages all depend on who's asking — so `app/_layout.tsx`
 * refetches this when the account changes. Stays free of the auth feature
 * (rule 2 in ARCHITECTURE.md) by taking no part in deciding when to refetch.
 */
export const featuresQuery = {
  queryKey: ['features'] as const,
  queryFn: async () => {
    const { data } = await apiClient.get<FeaturesResponse>('/api/features/');
    return data.features;
  },
  staleTime: 60 * 1000,
  gcTime: 7 * 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: true,
};

/**
 * `true` when the last known answer says so — the latest successful fetch,
 * not necessarily the most recent one. A failed refetch (coming back with a
 * weak signal) must not drop this back to false while an earlier answer is
 * still in `data`; that would, for example, trim a draft's photos away under
 * her. Fails closed: off until something has ever loaded, and off for an
 * unknown key.
 */
export function useFeature(key: FeatureKey): boolean {
  const { data } = useQuery(featuresQuery);
  return data?.[key] === true;
}
