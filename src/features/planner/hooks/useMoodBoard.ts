import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { MoodBoardEntry } from '@/features/planner';
import { useAuth } from '@/features/auth';

const MOOD_BOARD_QUERY_KEY = 'moodBoard';

export function useMoodBoardEntries(
  userId?: string,
  month?: string,
  options?: { enabled?: boolean }
) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [MOOD_BOARD_QUERY_KEY, actualUserId, month],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.moodBoard.getAll(actualUserId, month);
      return response.data;
    },
    enabled: options?.enabled !== false && !!actualUserId,
  });
}

export function useSavedMoodBoardEntries(
  userId?: string,
  month?: string,
  options?: { enabled?: boolean }
) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: ['savedMoodBoard', actualUserId, month],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.moodBoard.getSaved(actualUserId, month);
      return response.data;
    },
    enabled: options?.enabled !== false && !!actualUserId,
  });
}

export function useMoodBoardEntry(entryId: string) {
  return useQuery({
    queryKey: [MOOD_BOARD_QUERY_KEY, entryId],
    queryFn: async () => {
      const response = await api.moodBoard.getById(entryId);
      return response.data;
    },
    enabled: !!entryId,
  });
}

export function useCreateMoodBoardEntry(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (entry: any) => {
      // Transform camelCase to snake_case for backend API
      // Backend expects photos as an array, not an object
      let photosArray: string[] = [];
      if (entry.photos) {
        if (Array.isArray(entry.photos)) {
          // Filter out empty/null values and keep only valid URIs
          photosArray = entry.photos.filter((uri: string) => uri && uri.trim());
        } else if (typeof entry.photos === 'object') {
          // Convert object to array if needed
          photosArray = Object.values(entry.photos).filter(
            (uri): uri is string => typeof uri === 'string' && uri.length > 0
          );
        }
      }

      // For local file URIs, we need to upload them first or use a placeholder
      // For now, we'll send the URIs as-is and let the backend handle validation
      // In production, images should be uploaded first via multipart/form-data
      const mainPhotoUri = entry.mainPhotoUri || entry.main_photo_uri;

      // Build the API entry, ensuring photos is always an array
      const apiEntry: any = {
        month: entry.month,
        name: entry.name,
        main_photo_uri: mainPhotoUri,
        photos: photosArray, // Always send as array, even if empty
        stylist_price:
          typeof entry.stylistPrice === 'number'
            ? entry.stylistPrice.toString()
            : entry.stylistPrice || entry.stylist_price || '0',
        hair_price:
          typeof entry.hairPrice === 'number'
            ? entry.hairPrice.toString()
            : entry.hairPrice || entry.hair_price || '0',
        stylist_location: entry.stylistLocation || entry.stylist_location || '',
        appointment_time: entry.appointmentTime || entry.appointment_time,
      };

      // Only include optional fields if they have values
      if (entry.monthColor || entry.month_color) {
        apiEntry.month_color = entry.monthColor || entry.month_color;
      }
      if (entry.notes) {
        apiEntry.notes = entry.notes;
      }
      if (entry.completed !== undefined) {
        apiEntry.completed = entry.completed;
      }

      if (__DEV__) {
        console.log('📤 Creating moodboard entry:', {
          original: entry,
          transformed: apiEntry,
        });
      }

      const response = await api.moodBoard.create(apiEntry);
      return response.data;
    },
    onSuccess: newEntry => {
      if (actualUserId) {
        // Add new entry to list cache for the specific month
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId, newEntry.month],
          (old = []) => [...old, newEntry]
        );
        // Also update the general list (without month filter) if it exists
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId],
          (old = []) => [...old, newEntry]
        );
        // Set detail cache
        queryClient.setQueryData([MOOD_BOARD_QUERY_KEY, newEntry.id], newEntry);
      }
    },
  });
}

export function useUpdateMoodBoardEntry(entryId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (updates: Partial<MoodBoardEntry>) => {
      const response = await api.moodBoard.update(entryId, updates);
      return response.data;
    },
    onSuccess: updatedEntry => {
      if (actualUserId) {
        // Update list cache for the specific month
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId, updatedEntry.month],
          (old = []) => old.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
        );
        // Update general list cache (without month filter)
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId],
          (old = []) => old.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
        );
        // Update detail cache
        queryClient.setQueryData([MOOD_BOARD_QUERY_KEY, entryId], updatedEntry);
      }
    },
  });
}

export function useDeleteMoodBoardEntry(entryId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async () => {
      await api.moodBoard.delete(entryId);
      return entryId;
    },
    onMutate: async () => {
      // Get the entry to know which month it belongs to
      const entry = queryClient.getQueryData<MoodBoardEntry>([MOOD_BOARD_QUERY_KEY, entryId]);
      return { entry };
    },
    onSuccess: (entryId, _, context) => {
      if (actualUserId && context?.entry) {
        const month = context.entry.month;
        // Remove from list cache for the specific month
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId, month],
          (old = []) => old.filter(entry => entry.id !== entryId)
        );
        // Remove from general list cache (without month filter)
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId],
          (old = []) => old.filter(entry => entry.id !== entryId)
        );
        // Remove detail cache
        queryClient.removeQueries({ queryKey: [MOOD_BOARD_QUERY_KEY, entryId] });
      }
    },
  });
}

export function useAddPhotoToMoodBoardEntry(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async ({ entryId, photoUri }: { entryId: string; photoUri: string }) => {
      const response = await api.moodBoard.addPhoto(entryId, { main_photo_uri: photoUri });
      return { entryId, updatedEntry: response.data };
    },
    onSuccess: ({ entryId, updatedEntry }) => {
      if (actualUserId && updatedEntry) {
        // Update list cache for the specific month
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId, updatedEntry.month],
          (old = []) => old.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
        );
        // Update general list cache (without month filter)
        queryClient.setQueryData<MoodBoardEntry[]>(
          [MOOD_BOARD_QUERY_KEY, actualUserId],
          (old = []) => old.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry))
        );
        // Update detail cache
        queryClient.setQueryData([MOOD_BOARD_QUERY_KEY, entryId], updatedEntry);
      }
    },
  });
}
