import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
import { useAuth } from '@/features/auth';
import {
  BoardForm,
  draftFromEntry,
  entryFromDraft,
  useCreateMoodBoardEntry,
} from '@/features/planner';
import { notify } from '@/shared/ui/dialog';
import { Screen } from '@/shared/ui/Screen';

export default function CreateBoardScreen() {
  const router = useRouter();
  // Arrives prefilled when saving an inspiration picture to a new board.
  const { name, photo } = useLocalSearchParams<{ name?: string; photo?: string }>();
  const { user } = useAuth();
  const create = useCreateMoodBoardEntry(user?.id);

  return (
    <Screen title="New board" modal keyboard testID="moodboard-create-screen">
      <BoardForm
        initial={draftFromEntry({ name, mainPhotoUri: photo || undefined })}
        submitLabel="Create board"
        pending={create.isPending}
        onSubmit={draft =>
          create.mutate(entryFromDraft(draft), {
            // The new board shows up in the planner behind the sheet.
            onSuccess: () => router.back(),
            onError: () =>
              notify({
                title: 'Couldn’t create the board',
                message: 'Check your connection and try again.',
              }),
          })
        }
      />
    </Screen>
  );
}
