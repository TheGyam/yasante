import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { MonthlyHairstyle } from '@/types/planner';

const MONTHLY_HAIRSTYLES_QUERY_KEY = 'monthlyHairstyles';

export function useMonthlyHairstyles(userId: string = 'user-1', month: string) {
  return useQuery({
    queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, userId, month],
    queryFn: async () => {
      const response = await api.monthlyHairstyles.getByMonth(userId, month);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useMonthlyHairstyle(hairstyleId: string) {
  return useQuery({
    queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, hairstyleId],
    queryFn: async () => {
      const response = await api.monthlyHairstyles.getById(hairstyleId);
      return response.data;
    },
    enabled: !!hairstyleId,
  });
}

export function useCreateMonthlyHairstyle(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hairstyle: Omit<MonthlyHairstyle, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.monthlyHairstyles.create(hairstyle);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, userId, data.month] });
    },
  });
}

export function useUpdateMonthlyHairstyle(hairstyleId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<MonthlyHairstyle>) => {
      const response = await api.monthlyHairstyles.update(hairstyleId, updates);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, userId, data.month] });
      queryClient.invalidateQueries({ queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, hairstyleId] });
    },
  });
}

export function useDeleteMonthlyHairstyle(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hairstyleId: string) => {
      const response = await api.monthlyHairstyles.getById(hairstyleId);
      const month = response.data.month;
      await api.monthlyHairstyles.delete(hairstyleId);
      return { hairstyleId, month };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, userId, data.month] });
    },
  });
}

