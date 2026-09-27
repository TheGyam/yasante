import type { Schemas } from '@/shared/lib/api/types';

export type WaitlistRequest = Schemas['WaitlistRequestRequest'];
export type WaitlistRole = NonNullable<WaitlistRequest['role']>;
