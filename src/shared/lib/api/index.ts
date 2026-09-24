/**
 * The HTTP client and its auth bridge.
 *
 * The aggregated `api` object lives in src/api.ts, because composing every
 * feature's endpoints is a composition-root job — shared/ must stay free of
 * feature imports. See ARCHITECTURE.md.
 */
export { apiClient, default as defaultApiClient, setAuthBridge } from './client';
export type { AuthBridge } from './client';

/** Shapes generated from the backend's OpenAPI schema (npm run api:types). */
export type { components, paths } from './schema';
export type ApiSchemas = import('./schema').components['schemas'];
