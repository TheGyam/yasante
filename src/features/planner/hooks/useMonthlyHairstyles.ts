import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { MonthlyHairstyle } from '@/features/planner';
import { useAuth } from '@/features/auth';

const MONTHLY_HAIRSTYLES_QUERY_KEY = 'monthlyHairstyles';

export function useMonthlyHairstyles(userId: string | undefined, month: string, options?: { enabled?: boolean }) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, actualUserId, month],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.monthlyHairstyles.getAll(actualUserId, month);
      return response.data;
    },
    enabled: (options?.enabled !== false) && !!actualUserId && !!month,
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

export function useCreateMonthlyHairstyle(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (hairstyle: Omit<MonthlyHairstyle, 'id' | 'createdAt' | 'updatedAt'>) => {
      // The API speaks snake_case; the app speaks camelCase.
      const response = await api.monthlyHairstyles.create({
        month: hairstyle.month,
        photo_uri: hairstyle.photoUri,
        thumbnail_uri: hairstyle.thumbnailUri,
        notes: hairstyle.notes,
      });
      return response.data;
    },
    onSuccess: (newHairstyle) => {
      if (actualUserId) {
        // Add new hairstyle to list cache for the specific month
        queryClient.setQueryData<MonthlyHairstyle[]>(
          [MONTHLY_HAIRSTYLES_QUERY_KEY, actualUserId, newHairstyle.month],
          (old = []) => [...old, newHairstyle]
        );
        // Set detail cache
        queryClient.setQueryData([MONTHLY_HAIRSTYLES_QUERY_KEY, newHairstyle.id], newHairstyle);
      }
    },
  });
}

export function useUpdateMonthlyHairstyle(hairstyleId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (updates: Partial<MonthlyHairstyle>) => {
      const response = await api.monthlyHairstyles.update(hairstyleId, updates);
      return response.data;
    },
    onSuccess: (updatedHairstyle) => {
      if (actualUserId) {
        // Update list cache for the specific month
        queryClient.setQueryData<MonthlyHairstyle[]>(
          [MONTHLY_HAIRSTYLES_QUERY_KEY, actualUserId, updatedHairstyle.month],
          (old = []) => old.map(hairstyle => hairstyle.id === updatedHairstyle.id ? updatedHairstyle : hairstyle)
        );
        // Update detail cache
        queryClient.setQueryData([MONTHLY_HAIRSTYLES_QUERY_KEY, hairstyleId], updatedHairstyle);
      }
    },
  });
}

export function useDeleteMonthlyHairstyle(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (hairstyleId: string) => {
      const response = await api.monthlyHairstyles.getById(hairstyleId);
      const month = response.data.month;
      await api.monthlyHairstyles.delete(hairstyleId);
      return { hairstyleId, month };
    },
    onSuccess: ({ hairstyleId, month }) => {
      if (actualUserId) {
        // Remove from list cache for the specific month
        queryClient.setQueryData<MonthlyHairstyle[]>(
          [MONTHLY_HAIRSTYLES_QUERY_KEY, actualUserId, month],
          (old = []) => old.filter(hairstyle => hairstyle.id !== hairstyleId)
        );
        // Remove detail cache
        queryClient.removeQueries({ queryKey: [MONTHLY_HAIRSTYLES_QUERY_KEY, hairstyleId] });
      }
    },
  });
}

