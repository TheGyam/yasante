/**
 * The API's shapes, generated from openapi.yaml into ./schema.d.ts (npm run api:types).
 * Features name the ones they use in their own types.ts.
 */
import type { components } from './schema';

export type Schemas = components['schemas'];
