import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { Routine } from '@/features/planner';
import { useAuth } from '@/features/auth';

const ROUTINES_QUERY_KEY = 'routines';

export function useRoutines(userId?: string, options?: { enabled?: boolean }) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [ROUTINES_QUERY_KEY, actualUserId],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.routines.getAll(actualUserId);
      return response.data;
    },
    enabled: options?.enabled !== false && !!actualUserId,
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

export function useCreateRoutine(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.routines.create(routine);
      return response.data;
    },
    onSuccess: newRoutine => {
      if (actualUserId) {
        // Add new routine to list cache
        queryClient.setQueryData<Routine[]>([ROUTINES_QUERY_KEY, actualUserId], (old = []) => [
          ...old,
          newRoutine,
        ]);
        // Set detail cache
        queryClient.setQueryData([ROUTINES_QUERY_KEY, newRoutine.id], newRoutine);
      }
    },
  });
}

export function useUpdateRoutine(routineId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (updates: Partial<Routine>) => {
      const response = await api.routines.update(routineId, updates);
      return response.data;
    },
    onSuccess: updatedRoutine => {
      if (actualUserId) {
        // Update list cache
        queryClient.setQueryData<Routine[]>([ROUTINES_QUERY_KEY, actualUserId], (old = []) =>
          old.map(routine => (routine.id === updatedRoutine.id ? updatedRoutine : routine))
        );
        // Update detail cache
        queryClient.setQueryData([ROUTINES_QUERY_KEY, routineId], updatedRoutine);
      }
    },
  });
}

export function useDeleteRoutine(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (routineId: string) => {
      await api.routines.delete(routineId);
      return routineId;
    },
    onSuccess: routineId => {
      if (actualUserId) {
        // Remove from list cache
        queryClient.setQueryData<Routine[]>([ROUTINES_QUERY_KEY, actualUserId], (old = []) =>
          old.filter(routine => routine.id !== routineId)
        );
        // Remove detail cache
        queryClient.removeQueries({ queryKey: [ROUTINES_QUERY_KEY, routineId] });
      }
    },
  });
}
