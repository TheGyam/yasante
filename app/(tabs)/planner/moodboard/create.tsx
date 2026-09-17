import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import {
  BoardForm,
  draftFromEntry,
  entryFromDraft,
  useCreateMoodBoardEntry,
} from '@/features/planner';
import { Screen } from '@/shared/ui/Screen';

export default function CreateBoardScreen() {
  const router = useRouter();
  // Arrives prefilled when saving an inspiration picture to a new board.
  const { name, photo } = useLocalSearchParams<{ name?: string; photo?: string }>();
  const { user } = useAuth();
  const create = useCreateMoodBoardEntry(user?.id);

  return (
    <Screen title="New board" back keyboard testID="moodboard-create-screen">
      <BoardForm
        initial={draftFromEntry({ name, mainPhotoUri: photo || undefined })}
        submitLabel="Create board"
        pending={create.isPending}
        onSubmit={draft =>
          create.mutate(entryFromDraft(draft), {
            onSuccess: entry => router.replace(`/(tabs)/planner/moodboard/${entry.id}`),
            onError: () =>
              Alert.alert('Couldn’t create the board', 'Check your connection and try again.'),
          })
        }
      />
    </Screen>
  );
}
