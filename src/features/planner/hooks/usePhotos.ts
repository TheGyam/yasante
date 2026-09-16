import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { ProgressPhoto } from '@/features/planner';

const PHOTOS_QUERY_KEY = 'photos';

export function usePhotos(goalId: string) {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, goalId],
    queryFn: async () => {
      const response = await api.photos.getAll(goalId);
      return response.data;
    },
    enabled: !!goalId,
  });
}

export function useUploadPhoto(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: Omit<ProgressPhoto, 'id' | 'createdAt'>) => {
      // The API speaks snake_case; the app speaks camelCase.
      const response = await api.photos.create({
        goal_id: photo.goalId,
        uri: photo.uri,
        thumbnail_uri: photo.thumbnailUri,
        date: photo.date,
        caption: photo.caption,
        location: photo.location,
      });
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

