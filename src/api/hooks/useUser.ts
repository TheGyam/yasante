import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../index';
import { User, HairProfile } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

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
      const response = await api.user.updateProfile(actualUserId, updates);
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

