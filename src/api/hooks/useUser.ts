import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { User, HairProfile } from '@/types/user';

const USER_QUERY_KEY = 'user';

export function useUser(userId: string = 'user-1') {
  return useQuery({
    queryKey: [USER_QUERY_KEY, userId],
    queryFn: async () => {
      const response = await api.user.getProfile(userId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUser(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const response = await api.user.updateProfile(userId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateHairProfile(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hairProfile: HairProfile) => {
      const response = await api.user.updateHairProfile(userId, hairProfile);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY, userId] });
    },
  });
}

