import { api } from '@/shared/lib/api/client';
import type { Policy, PolicyType } from './types';

/** The version in effect now. */
export const getPolicy = (type: PolicyType) => api.get<Policy>(`/policies/${type}/`);
