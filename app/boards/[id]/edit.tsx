import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import {
  BoardForm,
  draftFromEntry,
  entryFromDraft,
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

  return (
    <Screen title="Edit board" modal keyboard testID="moodboard-edit-screen">
      {entry ? (
        <BoardForm
          initial={draftFromEntry(entry)}
          submitLabel="Save changes"
          pending={update.isPending}
          editing
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
