import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
import { useAuth } from '@/features/auth';
import {
  BoardForm,
  draftFromEntry,
  entryFromDraft,
  useMoodBoardEntry,
  useUpdateMoodBoardEntry,
} from '@/features/planner';
import { notify } from '@/shared/ui/dialog';
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
              onError: () =>
                notify({ title: 'Couldn’t save', message: 'Check your connection and try again.' }),
            })
          }
        />
      ) : (
        <Skeleton height={130} width={104} />
      )}
    </Screen>
  );
}
