/**
 * Switches Yaw turns on and off from the admin (GET /api/features/). Open to everyone;
 * the server answers differently for whoever's token it sees (Vary: Authorization), so
 * the query key carries the signed-in account — read straight from session storage
 * (shared/ never imports a feature) rather than through the auth feature.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './api/client';
import { readJson } from './storage';

export type FeatureKey = 'multi_photo_looks' | 'video_posts';

interface FeaturesResponse {
  features: Record<string, boolean>;
}

function accountId() {
  return readJson<{ user: { id: string } }>('yasante.session', 'session')?.user.id;
}

/** `true` only once the server has said so for this key; `false` while loading, on an
 * error, or for a key it didn't send. */
export function useFeature(key: FeatureKey): boolean {
  const { data } = useQuery({
    queryKey: ['features', accountId()] as const,
    queryFn: () => api.get<FeaturesResponse>('/features/'),
    staleTime: 60_000,
  });
  return data?.features[key] === true;
}
