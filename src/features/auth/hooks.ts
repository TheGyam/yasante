import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useAuth } from '@/features/auth';
import { AuthTokens } from '@/features/auth';
import type { SignupRequest } from './api';

export function useLogin() {
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Pass as object to match LoginRequest interface
      const response = await api.auth.login({ email, password });
      return response.data;
    },
    onSuccess: data => {
      if (__DEV__) {
        console.log('✅ Login successful, setting auth state:', {
          hasUser: !!data?.user,
          hasTokens: !!(data?.accessToken && data?.refreshToken),
          userId: data?.user?.id,
        });
      }

      if (!data?.user || !data?.accessToken || !data?.refreshToken) {
        console.error('❌ Invalid login response:', data);
        throw new Error('Invalid login response: missing user or tokens');
      }

      // Convert expiresAt to timestamp if it's a string
      const expiresAt =
        typeof data.expiresAt === 'string' ? new Date(data.expiresAt).getTime() : data.expiresAt;

      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt,
      };

      login(data.user, tokens);
      // Invalidate and refetch user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useSignup() {
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SignupRequest) => (await api.auth.signup(request)).data,
    onSuccess: data => {
      if (__DEV__) {
        console.log('✅ Signup successful, setting auth state:', {
          hasUser: !!data?.user,
          hasTokens: !!(data?.accessToken && data?.refreshToken),
          userId: data?.user?.id,
        });
      }

      if (!data?.user || !data?.accessToken || !data?.refreshToken) {
        console.error('❌ Invalid signup response:', data);
        throw new Error('Invalid signup response: missing user or tokens');
      }

      // Convert expiresAt to timestamp if it's a string
      const expiresAt =
        typeof data.expiresAt === 'string' ? new Date(data.expiresAt).getTime() : data.expiresAt;

      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt,
      };

      login(data.user, tokens);
      // Invalidate and refetch user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await api.auth.forgotPassword(email);
      return response.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (reset: { uid: string; token: string; password: string }) => {
      const response = await api.auth.resetPassword(reset);
      return response.data;
    },
  });
}

export function useRefreshToken() {
  const { refreshToken: refreshTokenFn } = useAuth();

  return useMutation({
    mutationFn: async () => {
      await refreshTokenFn();
      return true;
    },
  });
}
