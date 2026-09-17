import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  TreatmentForm,
  draftFromTreatment,
  shareTreatment,
  treatmentFromDraft,
  useDeleteTreatment,
  useTreatment,
  useUpdateTreatment,
} from '@/features/planner';
import { IconButton } from '@/shared/ui/IconButton';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';

export default function EditTreatmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: treatment } = useTreatment(id);
  const update = useUpdateTreatment(id, user?.id);
  const remove = useDeleteTreatment(id, user?.id);

  const confirmDelete = () =>
    Alert.alert('Delete this treatment?', 'Its schedule and history go with it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: () => Alert.alert('Couldn’t delete', 'Check your connection and try again.'),
          }),
      },
    ]);

  return (
    <Screen
      title="Treatment"
      modal
      keyboard
      testID="treatment-edit-screen"
      headerRight={
        treatment && (
          <IconButton
            icon={Share}
            size={36}
            accessibilityLabel="Share"
            onPress={() => shareTreatment(treatment)}
          />
        )
      }
    >
      {treatment ? (
        <TreatmentForm
          initial={draftFromTreatment(treatment)}
          submitLabel="Save changes"
          pending={update.isPending}
          onDelete={treatment.userId === user?.id ? confirmDelete : undefined}
          onSubmit={draft =>
            update.mutate(treatmentFromDraft(draft), {
              onSuccess: () => router.back(),
              onError: () => Alert.alert('Couldn’t save', 'Check your connection and try again.'),
            })
          }
        />
      ) : (
        <Skeleton height={56} />
      )}
    </Screen>
  );
}
