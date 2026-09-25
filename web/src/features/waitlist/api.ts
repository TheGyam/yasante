import { api } from '@/shared/lib/api/client';
import type { WaitlistRequest } from './types';

/** Joining twice is fine: the answer is the same, so nobody learns who signed up. */
export const joinWaitlist = (body: WaitlistRequest) => api.post<void>('/waitlist/', body);
