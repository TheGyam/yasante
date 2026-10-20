import { useRouter } from '@/shared/lib/navigation';
import { ConsentQuestion } from '@/shared/ui/ConsentQuestion';

/** Asked once after sign-up, and once to accounts made before it was asked. */
export default function PrivacyChoicesScreen() {
  const router = useRouter();
  return (
    <ConsentQuestion
      purpose="analytics"
      title="Your privacy choices"
      modal
      onAnswered={() => router.back()}
    />
  );
}
