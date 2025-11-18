import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { ProgressPhoto } from '@/types/planner';

const PHOTOS_QUERY_KEY = 'photos';

export function usePhotos(goalId: string) {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, goalId],
    queryFn: async () => {
      const response = await api.photos.getByGoal(goalId);
      return response.data;
    },
    enabled: !!goalId,
  });
}

export function useUploadPhoto(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: Omit<ProgressPhoto, 'id' | 'createdAt'>) => {
      const response = await api.photos.upload(photo);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY, goalId] });
    },
  });
}

export function useDeletePhoto(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      await api.photos.delete(photoId);
      return photoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY, goalId] });
    },
  });
}

