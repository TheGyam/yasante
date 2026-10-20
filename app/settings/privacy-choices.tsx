import { useLocalSearchParams } from 'expo-router';
import { CONSENT_WORDING, type AskedPurpose } from '@/shared/config/consentWording';
import { useRouter } from '@/shared/lib/navigation';
import { ConsentQuestion } from '@/shared/ui/ConsentQuestion';

/**
 * One privacy choice on its own: analytics once after sign-up (and once to accounts
 * made before it was asked), or another when a feature needs it, like "Hair like mine".
 */
export default function PrivacyChoicesScreen() {
  const router = useRouter();
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const asked = (purpose && purpose in CONSENT_WORDING ? purpose : 'analytics') as AskedPurpose;
  return (
    <ConsentQuestion
      purpose={asked}
      title="Your privacy choices"
      modal
      onAnswered={() => router.back()}
    />
  );
}
