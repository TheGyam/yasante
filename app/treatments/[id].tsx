import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
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
import { confirm, notify } from '@/shared/ui/dialog';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';

export default function EditTreatmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: treatment } = useTreatment(id);
  const update = useUpdateTreatment(id, user?.id);
  const remove = useDeleteTreatment(id, user?.id);

  const confirmDelete = async () => {
    const ok = await confirm({
      title: 'Delete this treatment?',
      message: 'Its schedule and history go with it.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: () =>
        notify({ title: 'Couldn’t delete', message: 'Check your connection and try again.' }),
    });
  };

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
              onError: () =>
                notify({ title: 'Couldn’t save', message: 'Check your connection and try again.' }),
            })
          }
        />
      ) : (
        <Skeleton height={56} />
      )}
    </Screen>
  );
}
