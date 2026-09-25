import { useMutation } from '@tanstack/react-query';
import { authApi } from './api';
import { consentsAtSignup, recordConsents } from './consents';
import { currentSession, endSession, startSession, updateUser } from './session';
import type { LoginRequest, SignupRequest } from './types';

export function useSignup() {
  return useMutation({
    mutationFn: (body: SignupRequest) => authApi.signup(body),
    onSuccess: auth => {
      startSession(auth);
      // She ticked the box for the terms, privacy and stylist terms: on the record.
      void recordConsents(auth.user.id, consentsAtSignup());
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: startSession,
  });
}

export function useStartEmail() {
  return useMutation({ mutationFn: authApi.startEmail });
}

export function useVerifyEmail() {
  return useMutation({ mutationFn: authApi.verifyEmail, onSuccess: updateUser });
}

/** Signs out here and on the server. Signed out locally whatever the server says. */
export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = currentSession()?.refreshToken;
      if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    },
    onSettled: endSession,
  });
}
