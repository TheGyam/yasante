import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { User, HairProfile } from '@/features/profile';
import { useAuth } from '@/features/auth';

const USER_QUERY_KEY = 'user';

export function useUser(userId?: string, options?: { enabled?: boolean }) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [USER_QUERY_KEY, actualUserId],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.user.getProfile(actualUserId);
      return response.data;
    },
    enabled: (options?.enabled !== false) && !!actualUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUser(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      // The API speaks snake_case; the app speaks camelCase.
      const response = await api.user.updateProfile(actualUserId, {
        name: updates.name ?? '',
        email: updates.email ?? '',
        avatar_uri: updates.avatarUri,
      });
      return response.data;
    },
    onSuccess: (updatedUser) => {
      if (actualUserId) {
        // Update user cache
        queryClient.setQueryData([USER_QUERY_KEY, actualUserId], updatedUser);
      }
    },
  });
}

export function useUpdateHairProfile(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (hairProfile: HairProfile) => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.user.updateHairProfile(actualUserId, hairProfile);
      return response.data;
    },
    onSuccess: (updatedHairProfile) => {
      if (actualUserId) {
        // Update user cache - hair profile is part of user data
        queryClient.setQueryData<User>(
          [USER_QUERY_KEY, actualUserId],
          (old) => old ? { ...old, hairProfile: updatedHairProfile } : undefined
        );
      }
    },
  });
}

