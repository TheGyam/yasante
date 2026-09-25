import { useMutation } from '@tanstack/react-query';
import type { User } from '@/features/profile';
import { apiClient } from '@/shared/lib/api/client';

export interface PhoneChallenge {
  /** Seconds until another code can be requested. */
  resendInSeconds: number;
  expiresInSeconds: number;
}

export const verificationApi = {
  /** POST /api/auth/phone/start/ — texts a six-digit code. Rate limited. */
  start: async (phone: string) =>
    (await apiClient.post<PhoneChallenge>('/api/auth/phone/start/', { phone })).data,

  /** POST /api/auth/phone/verify/ — returns the account with the phone verified. */
  verify: async (phone: string, code: string) =>
    (await apiClient.post<User>('/api/auth/phone/verify/', { phone, code })).data,
};

export function useStartPhoneVerification() {
  return useMutation({ mutationFn: verificationApi.start });
}

/**
 * Returns the verified account. The screen stores it after its success animation —
 * storing it is what closes the sign-up flow.
 */
export function useVerifyPhone() {
  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      verificationApi.verify(phone, code),
  });
}

// Kept here too: most screens import it from auth.
export { errorMessage } from '@/shared/lib/errors';
