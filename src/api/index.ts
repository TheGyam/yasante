/**
 * API exports
 * 
 * This file exports the api object to avoid circular dependencies.
 * It imports services after apiClient is created in client.ts
 */

// Import apiClient first (this creates the axios instance)
export { apiClient, default as defaultApiClient } from './client';

// Import and export api object (lazy loaded to avoid circular dependency)
let _api: any = null;
export const getApi = () => {
  if (!_api) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const services = require('./services');
    _api = {
      auth: services.authApi,
      user: services.userApi,
      goals: services.goalsApi,
      photos: services.photosApi,
      activities: services.activitiesApi,
      routines: services.routinesApi,
      content: services.contentApi,
      favorites: services.favoritesApi,
      monthlyHairstyles: services.monthlyHairstylesApi,
      moodBoard: services.moodBoardApi,
      treatments: services.treatmentsApi,
    };
  }
  return _api;
};

// Export api as a Proxy for lazy loading
export const api = new Proxy({} as any, {
  get(target, prop: string) {
    return getApi()[prop];
  },
});

