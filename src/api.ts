/**
 * Composition root for the API.
 *
 * This is the one place allowed to reach into every feature, because it exists
 * to wire them together. `shared/` must not do this — see ARCHITECTURE.md.
 *
 * Services are required lazily so the axios instance in shared/lib/api/client
 * is created before any service module imports it.
 */
import type { authApi } from '@/features/auth/api';
import type { userApi } from '@/features/profile/api';
import type { favoritesApi } from '@/features/profile/favoritesApi';
import type { contentApi } from '@/features/education/api';
import type { goalsApi } from '@/features/planner/api/goalsApi';
import type { photosApi } from '@/features/planner/api/photosApi';
import type { activitiesApi } from '@/features/planner/api/activitiesApi';
import type { routinesApi } from '@/features/planner/api/routinesApi';
import type { treatmentsApi } from '@/features/planner/api/treatmentsApi';
import type { monthlyHairstylesApi } from '@/features/planner/api/monthlyHairstylesApi';
import type { moodBoardApi } from '@/features/planner/api/moodBoardApi';

export interface Api {
  auth: typeof authApi;
  user: typeof userApi;
  favorites: typeof favoritesApi;
  content: typeof contentApi;
  goals: typeof goalsApi;
  photos: typeof photosApi;
  activities: typeof activitiesApi;
  routines: typeof routinesApi;
  treatments: typeof treatmentsApi;
  monthlyHairstyles: typeof monthlyHairstylesApi;
  moodBoard: typeof moodBoardApi;
}

let _api: Api | null = null;

const getApi = (): Api => {
  if (!_api) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    _api = {
      auth: require('@/features/auth/api').authApi,
      user: require('@/features/profile/api').userApi,
      favorites: require('@/features/profile/favoritesApi').favoritesApi,
      content: require('@/features/education/api').contentApi,
      goals: require('@/features/planner/api/goalsApi').goalsApi,
      photos: require('@/features/planner/api/photosApi').photosApi,
      activities: require('@/features/planner/api/activitiesApi').activitiesApi,
      routines: require('@/features/planner/api/routinesApi').routinesApi,
      treatments: require('@/features/planner/api/treatmentsApi').treatmentsApi,
      monthlyHairstyles: require('@/features/planner/api/monthlyHairstylesApi')
        .monthlyHairstylesApi,
      moodBoard: require('@/features/planner/api/moodBoardApi').moodBoardApi,
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  }
  return _api;
};

export const api = new Proxy({} as Api, {
  get(_target, prop: string) {
    return getApi()[prop as keyof Api];
  },
}) as Api;
