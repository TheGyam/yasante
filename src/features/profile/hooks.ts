import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/lib/api';
import { uploadImage } from '@/shared/lib/imageService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { User, HairProfile } from '@/features/profile';
import { useAuth } from '@/features/auth';
import { becauseOf, mergeGaps } from './format';
import { useUserStore } from './store';
import { useConsentStore } from '@/shared/config/consentStore';

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
        ...(updates.username && { username: updates.username }),
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
      // A stylist's page wears the same photo.
      queryClient.invalidateQueries({ queryKey: ['stylist'] });
    },
  });
}

/** Whether a username is free, checked as she types (after a short pause). */
export function useUsernameCheck(value: string, current?: string) {
  const wanted = value.trim().replace(/^@/, '').toLowerCase();
  const [settled, setSettled] = useState(wanted);
  useEffect(() => {
    const pause = setTimeout(() => setSettled(wanted), 350);
    return () => clearTimeout(pause);
  }, [wanted]);
  return useQuery({
    queryKey: ['username-check', settled],
    queryFn: async () =>
      (
        await apiClient.get<{ username: string; available: boolean; reason?: string }>(
          '/api/users/username-check/',
          { params: { username: settled } }
        )
      ).data,
    enabled: settled.length >= 3 && settled === wanted && settled !== current,
    staleTime: 30 * 1000,
    // A failed check isn't worth waiting on: the server checks again on save.
    retry: false,
  });
}

/**
 * A username field's state and what to say under it as she types: free, taken and
 * why, or too short. Shared by Edit profile and the username prompt.
 */
export function useUsernameField(current?: string) {
  const [username, setUsername] = useState(current ?? '');
  const check = useUsernameCheck(username, current);
  const wanted = username.trim().replace(/^@/, '').toLowerCase();
  const changed = !!wanted && wanted !== current;
  const taken = changed && check.data?.username === wanted && !check.data.available;
  const hint = !changed
    ? current
      ? 'It’s what your looks and comments show.'
      : 'Letters, numbers, dots and underscores'
    : check.data?.username === wanted
      ? check.data.available
        ? 'That one’s yours if you want it'
        : (check.data.reason ?? 'Someone already has that')
      : wanted.length < 3
        ? 'At least 3 characters'
        : check.isError
          ? 'We’ll check it when you save'
          : 'Checking…';
  return {
    username,
    // No spaces in a username; they're dropped as she types.
    setUsername: (text: string) => setUsername(text.replace(/\s/g, '')),
    wanted,
    changed,
    taken,
    hint,
    tooShort: wanted.length < 3,
  };
}

/**
 * True for someone about to post or comment with no username yet: what's shown on
 * a post is the username, so she's asked for one first. Stylists post under their
 * brand name and are never asked.
 */
export function useNeedsUsername() {
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: user } = useUser(authUser?.id, { enabled: isAuthenticated });
  const me = user ?? authUser;
  return isAuthenticated && !!me && !me.roles?.includes('stylist') && !me.username;
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

    // Only with her yes to using hair details: the server keeps nothing without it.
    const allowed = useConsentStore.getState().isGranted('personalisation');
    if (allowed && Object.keys(gaps).length) save.mutate({ ...server, ...gaps });
    store.setHairProfile({ ...server, ...gaps });
    store.setHairProfileOwner(user.id);
  }, [isAuthenticated, user?.id, isSuccess, account, save]);
}

/**
 * Why her feed or library comes in the order it does, or undefined when her hair
 * isn't used for it: signed in, with her yes, exactly when the server matches on it.
 */
export function useWhySuggested(on: ('texture' | 'porosity')[]) {
  const { user, isAuthenticated } = useAuth();
  const { data: account } = useUser(user?.id, { enabled: isAuthenticated });
  const allowed = useConsentStore(s => s.consents.personalisation?.granted ?? false);
  return isAuthenticated && allowed ? becauseOf(account?.hairProfile, on) : undefined;
}
