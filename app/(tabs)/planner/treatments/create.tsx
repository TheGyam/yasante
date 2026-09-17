import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import {
  TreatmentForm,
  draftFromTreatment,
  treatmentFromDraft,
  useCreateTreatment,
} from '@/features/planner';
import { Screen } from '@/shared/ui/Screen';

export default function CreateTreatmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const create = useCreateTreatment(user?.id);

  return (
    <Screen title="New treatment" back keyboard testID="treatment-create-screen">
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
                Alert.alert('Couldn’t add the treatment', 'Check your connection and try again.'),
            }
          )
        }
      />
    </Screen>
  );
}
