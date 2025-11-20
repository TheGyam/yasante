import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { treatmentsApi } from '@/api/mock/server';
import { Treatment } from '@/types/planner';
import { ApiResponse } from '@/types/api';

const TREATMENTS_QUERY_KEY = 'treatments';

export function useTreatments(userId: string = 'user-1', options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [TREATMENTS_QUERY_KEY, userId],
    queryFn: async () => {
      const response = await treatmentsApi.getAll(userId);
      return response.data;
    },
    enabled: options?.enabled !== false && !!userId,
  });
}

export function useTreatment(treatmentId: string) {
  return useQuery({
    queryKey: [TREATMENTS_QUERY_KEY, treatmentId],
    queryFn: async () => {
      const response = await treatmentsApi.getById(treatmentId);
      return response.data;
    },
    enabled: !!treatmentId,
  });
}

export function useCreateTreatment(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (treatment: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await treatmentsApi.create(treatment);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TREATMENTS_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateTreatment(treatmentId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Treatment>) => {
      const response = await treatmentsApi.update(treatmentId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TREATMENTS_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [TREATMENTS_QUERY_KEY, treatmentId] });
    },
  });
}

export function useDeleteTreatment(treatmentId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await treatmentsApi.delete(treatmentId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TREATMENTS_QUERY_KEY, userId] });
    },
  });
}

