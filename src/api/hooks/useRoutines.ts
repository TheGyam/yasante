import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Routine } from '@/types/planner';

const ROUTINES_QUERY_KEY = 'routines';

export function useRoutines(userId: string = 'user-1') {
  return useQuery({
    queryKey: [ROUTINES_QUERY_KEY, userId],
    queryFn: async () => {
      const response = await api.routines.getAll(userId);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useRoutine(routineId: string) {
  return useQuery({
    queryKey: [ROUTINES_QUERY_KEY, routineId],
    queryFn: async () => {
      const response = await api.routines.getById(routineId);
      return response.data;
    },
    enabled: !!routineId,
  });
}

export function useCreateRoutine(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.routines.create(routine);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROUTINES_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateRoutine(routineId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Routine>) => {
      const response = await api.routines.update(routineId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROUTINES_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [ROUTINES_QUERY_KEY, routineId] });
    },
  });
}

export function useDeleteRoutine(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routineId: string) => {
      await api.routines.delete(routineId);
      return routineId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROUTINES_QUERY_KEY, userId] });
    },
  });
}

