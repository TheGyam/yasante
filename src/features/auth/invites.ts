import { useMutation, useQuery } from '@tanstack/react-query';
import type { User } from '@/features/profile';
import { apiClient } from '@/shared/lib/api/client';
import { useAuthStore } from './store';

export interface Invite {
  code: string;
  role: 'stylist';
  /** Who sent it, as they should be introduced: "Akua from Yasante". */
  invitedBy: string;
  expiresAt: string;
}

export const invitesApi = {
  /** GET /api/invites/:code/ — 404 unknown, 410 used or expired. Public. */
  get: async (code: string) =>
    (await apiClient.get<Invite>(`/api/invites/${encodeURIComponent(code)}/`)).data,

  /** POST /api/invites/:code/redeem/ — adds the stylist role to the signed-in account. */
  redeem: async (code: string) =>
    (await apiClient.post<User>(`/api/invites/${encodeURIComponent(code)}/redeem/`)).data,
};

export function useInvite(code: string | undefined) {
  return useQuery({
    queryKey: ['invite', code],
    queryFn: () => invitesApi.get(code!),
    enabled: !!code,
    retry: false,
  });
}

export function useRedeemInvite() {
  return useMutation({
    mutationFn: invitesApi.redeem,
    onSuccess: user => useAuthStore.getState().setUser(user),
  });
}
