import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../index';
import { Treatment } from '@/types/planner';
import { useAuth } from '@/contexts/AuthContext';

const TREATMENTS_QUERY_KEY = 'treatments';

export function useTreatments(userId?: string, options?: { enabled?: boolean }) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [TREATMENTS_QUERY_KEY, actualUserId],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.treatments.getAll(actualUserId);
      return response.data;
    },
    enabled: (options?.enabled !== false) && !!actualUserId,
  });
}

export function useTreatment(treatmentId: string) {
  return useQuery({
    queryKey: [TREATMENTS_QUERY_KEY, treatmentId],
    queryFn: async () => {
      const response = await api.treatments.getById(treatmentId);
      return response.data;
    },
    enabled: !!treatmentId,
  });
}

export function useCreateTreatment(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (treatment: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.treatments.create(treatment);
      return response.data;
    },
    onSuccess: (newTreatment) => {
      if (actualUserId) {
        // Add new treatment to list cache
        queryClient.setQueryData<Treatment[]>(
          [TREATMENTS_QUERY_KEY, actualUserId],
          (old = []) => [...old, newTreatment]
        );
        // Set detail cache
        queryClient.setQueryData([TREATMENTS_QUERY_KEY, newTreatment.id], newTreatment);
      }
    },
  });
}

export function useUpdateTreatment(treatmentId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (updates: Partial<Treatment>) => {
      const response = await api.treatments.update(treatmentId, updates);
      return response.data;
    },
    onSuccess: (updatedTreatment) => {
      if (actualUserId) {
        // Update list cache
        queryClient.setQueryData<Treatment[]>(
          [TREATMENTS_QUERY_KEY, actualUserId],
          (old = []) => old.map(treatment => treatment.id === updatedTreatment.id ? updatedTreatment : treatment)
        );
        // Update detail cache
        queryClient.setQueryData([TREATMENTS_QUERY_KEY, treatmentId], updatedTreatment);
      }
    },
  });
}

export function useDeleteTreatment(treatmentId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async () => {
      await api.treatments.delete(treatmentId);
      return treatmentId;
    },
    onSuccess: (treatmentId) => {
      if (actualUserId) {
        // Remove from list cache
        queryClient.setQueryData<Treatment[]>(
          [TREATMENTS_QUERY_KEY, actualUserId],
          (old = []) => old.filter(treatment => treatment.id !== treatmentId)
        );
        // Remove detail cache
        queryClient.removeQueries({ queryKey: [TREATMENTS_QUERY_KEY, treatmentId] });
      }
    },
  });
}

