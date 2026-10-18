import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';

export type FeatureKey = 'multi_photo_looks' | 'video_posts';

type FeaturesResponse = { features: Record<string, boolean> };

/**
 * Which switches Yaw has turned on. Open to everyone — the answer doesn't
 * depend on who's signed in — so this stays free of the auth feature.
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

/** `true` only once the server has said so. Fails closed: off until loaded, and on error. */
export function useFeature(key: FeatureKey): boolean {
  const { data, isSuccess } = useQuery(featuresQuery);
  return isSuccess && data?.[key] === true;
}
