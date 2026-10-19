import { useLocalSearchParams } from 'expo-router';
import { ClaimScreen } from '@/features/claim';

/** yasante.com/claim/{code}: a stylist's private link to the page Yasante made her. */
export default function ClaimRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <ClaimScreen code={code} />;
}
