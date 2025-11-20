import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moodBoardApi } from '@/api/mock/server';
import { MoodBoardEntry } from '@/types/planner';
import { ApiResponse } from '@/types/api';

const MOOD_BOARD_QUERY_KEY = 'moodBoard';

export function useMoodBoardEntries(userId: string = 'user-1', month?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [MOOD_BOARD_QUERY_KEY, userId, month],
    queryFn: async () => {
      const response = await moodBoardApi.getAll(userId, month);
      return response.data;
    },
    enabled: options?.enabled !== false && !!userId,
  });
}

export function useMoodBoardEntry(entryId: string) {
  return useQuery({
    queryKey: [MOOD_BOARD_QUERY_KEY, entryId],
    queryFn: async () => {
      const response = await moodBoardApi.getById(entryId);
      return response.data;
    },
    enabled: !!entryId,
  });
}

export function useCreateMoodBoardEntry(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<MoodBoardEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await moodBoardApi.create(entry);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MOOD_BOARD_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateMoodBoardEntry(entryId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<MoodBoardEntry>) => {
      const response = await moodBoardApi.update(entryId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MOOD_BOARD_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [MOOD_BOARD_QUERY_KEY, entryId] });
    },
  });
}

export function useDeleteMoodBoardEntry(entryId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await moodBoardApi.delete(entryId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MOOD_BOARD_QUERY_KEY, userId] });
    },
  });
}

export function useAddPhotoToMoodBoardEntry(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, photoUri }: { entryId: string; photoUri: string }) => {
      const response = await moodBoardApi.addPhotoToEntry(entryId, photoUri);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MOOD_BOARD_QUERY_KEY, userId] });
    },
  });
}

