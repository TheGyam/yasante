import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../index';
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
    onSuccess: (newPhoto) => {
      // Add new photo to list cache
      queryClient.setQueryData<ProgressPhoto[]>(
        [PHOTOS_QUERY_KEY, goalId],
        (old = []) => [...old, newPhoto]
      );
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
    onSuccess: (photoId) => {
      // Remove from list cache
      queryClient.setQueryData<ProgressPhoto[]>(
        [PHOTOS_QUERY_KEY, goalId],
        (old = []) => old.filter(photo => photo.id !== photoId)
      );
    },
  });
}

