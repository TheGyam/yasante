import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import {
  BoardForm,
  draftFromEntry,
  entryFromDraft,
  useDeleteMoodBoardEntry,
  useMoodBoardEntry,
  useUpdateMoodBoardEntry,
} from '@/features/planner';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';

export default function EditBoardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: entry } = useMoodBoardEntry(id);
  const update = useUpdateMoodBoardEntry(id, user?.id);
  const remove = useDeleteMoodBoardEntry(id, user?.id);

  const confirmDelete = () =>
    Alert.alert('Delete this board?', 'Its photos and details go with it. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: () => router.dismissTo('/(tabs)/planner'),
            onError: () =>
              Alert.alert('Couldn’t delete the board', 'Check your connection and try again.'),
          }),
      },
    ]);

  return (
    <Screen title="Edit board" back keyboard testID="moodboard-edit-screen">
      {entry ? (
        <BoardForm
          initial={draftFromEntry(entry)}
          submitLabel="Save changes"
          pending={update.isPending}
          onDelete={confirmDelete}
          onSubmit={draft =>
            update.mutate(entryFromDraft(draft), {
              onSuccess: () => router.back(),
              onError: () => Alert.alert('Couldn’t save', 'Check your connection and try again.'),
            })
          }
        />
      ) : (
        <Skeleton height={130} width={104} />
      )}
    </Screen>
  );
}
