import { useMutation } from '@tanstack/react-query';
import type { User } from '@/features/profile';
import { apiClient } from '@/shared/lib/api/client';

export interface CodeSent {
  /** Seconds until another code can be requested. */
  resendInSeconds: number;
  expiresInSeconds: number;
}

export const emailVerificationApi = {
  /** POST /api/auth/email/start/ — emails a six-digit code, to a corrected address if given. */
  start: async (email?: string) =>
    (await apiClient.post<CodeSent>('/api/auth/email/start/', email ? { email } : {})).data,

  /** POST /api/auth/email/verify/ — returns the account with the email confirmed. */
  verify: async (code: string) =>
    (await apiClient.post<User>('/api/auth/email/verify/', { code })).data,
};

export function useStartEmailVerification() {
  return useMutation({ mutationFn: emailVerificationApi.start });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: emailVerificationApi.verify });
}

// Kept here too: most screens import it from auth.
export { errorMessage } from '@/shared/lib/errors';
