import { useEffect, useRef } from 'react';
import { uploadImage } from '@/shared/lib/imageService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { User, HairProfile } from '@/features/profile';
import { useAuth } from '@/features/auth';
import { mergeGaps } from './format';
import { useUserStore } from './store';

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
    enabled: options?.enabled !== false && !!actualUserId,
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
      // Only what changed: an empty email would be refused as invalid.
      const avatar = updates.avatarUri
        ? (await uploadImage(updates.avatarUri, 'avatar')).uri
        : undefined;
      const response = await api.user.updateProfile(actualUserId, {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.email && { email: updates.email }),
        ...(avatar && { avatar_uri: avatar }),
      });
      return response.data;
    },
    onSuccess: updatedUser => {
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
    onSuccess: updatedHairProfile => {
      if (actualUserId) {
        // Update user cache - hair profile is part of user data
        queryClient.setQueryData<User>([USER_QUERY_KEY, actualUserId], old =>
          old ? { ...old, hairProfile: updatedHairProfile } : undefined
        );
      }
    },
  });
}

/**
 * After signing up or in: answers given on this device before the account existed
 * go to the account, filling only what the account hasn't got — what's already on
 * the account wins. Runs once per account per launch.
 */
export function useHairProfileSync() {
  const { user, isAuthenticated } = useAuth();
  const { data: account, isSuccess } = useUser(user?.id, { enabled: isAuthenticated });
  const save = useUpdateHairProfile();
  const done = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !isSuccess || done.current === user.id) return;
    done.current = user.id;

    const store = useUserStore.getState();
    const server = account?.hairProfile ?? {};
    // Someone else's answers on a shared phone are never merged in.
    const local =
      store.hairProfileOwner && store.hairProfileOwner !== user.id ? {} : (store.hairProfile ?? {});
    const gaps = mergeGaps(server, local);

    if (Object.keys(gaps).length) save.mutate({ ...server, ...gaps });
    store.setHairProfile({ ...server, ...gaps });
    store.setHairProfileOwner(user.id);
  }, [isAuthenticated, user?.id, isSuccess, account, save]);
}
