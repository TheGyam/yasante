import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { useAuth } from '@/contexts/AuthContext';
import { AuthTokens } from '@/state/stores/authStore';

export function useLogin() {
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.auth.login(email, password);
      return response.data;
    },
    onSuccess: (data) => {
      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
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
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const response = await api.auth.signup(name, email, password);
      return response.data;
    },
    onSuccess: (data) => {
      const tokens: AuthTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
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
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await api.auth.resetPassword(token, password);
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

