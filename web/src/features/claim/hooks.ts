import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '@/features/auth';
import {
  checkFinishTags,
  claimPage,
  getClaimPreview,
  getFinishState,
  saveFinishPrice,
} from './api';
import type { FinishPriceRequest } from './types';

export const claimKeys = {
  preview: (code: string) => ['claim', code] as const,
  finish: ['stylist', 'finish'] as const,
};

export function useClaimPreview(code: string) {
  return useQuery({
    queryKey: claimKeys.preview(code),
    queryFn: () => getClaimPreview(code),
    enabled: !!code,
    retry: false,
  });
}

export function useClaimPage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => claimPage(code),
    onSuccess: user => {
      updateUser(user);
      client.invalidateQueries();
    },
  });
}

export function useFinishState() {
  return useQuery({
    queryKey: claimKeys.finish,
    queryFn: getFinishState,
    retry: false,
  });
}

export function useSaveFinishPrice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: FinishPriceRequest) => saveFinishPrice(data),
    onSuccess: finish => {
      client.setQueryData(claimKeys.finish, finish);
      client.invalidateQueries({ queryKey: ['stylist'] });
    },
  });
}

export function useCheckFinishTags() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => checkFinishTags(),
    onSuccess: finish => {
      client.setQueryData(claimKeys.finish, finish);
      client.invalidateQueries({ queryKey: ['stylist'] });
    },
  });
}
