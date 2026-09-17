import { useRouter } from '@/shared/lib/navigation';
import { useAuth } from '@/features/auth';
import {
  TreatmentForm,
  draftFromTreatment,
  treatmentFromDraft,
  useCreateTreatment,
} from '@/features/planner';
import { notify } from '@/shared/ui/dialog';
import { Screen } from '@/shared/ui/Screen';

export default function CreateTreatmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const create = useCreateTreatment(user?.id);

  return (
    <Screen title="New treatment" modal keyboard testID="treatment-create-screen">
      <TreatmentForm
        initial={draftFromTreatment()}
        submitLabel="Add treatment"
        pending={create.isPending}
        onSubmit={draft =>
          create.mutate(
            { ...treatmentFromDraft(draft), userId: user?.id ?? '' },
            {
              onSuccess: () => router.back(),
              onError: () =>
                notify({
                  title: 'Couldn’t add the treatment',
                  message: 'Check your connection and try again.',
                }),
            }
          )
        }
      />
    </Screen>
  );
}
