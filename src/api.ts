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

export interface Api {
  auth: typeof authApi;
  user: typeof userApi;
  favorites: typeof favoritesApi;
  content: typeof contentApi;
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
