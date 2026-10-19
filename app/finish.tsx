import { useLocalSearchParams } from 'expo-router';
import { FinishScreen } from '@/features/claim';

/** Finish your page: prices, hours and tags for a page Yasante set up. */
export default function FinishRoute() {
  const { claimed } = useLocalSearchParams<{ claimed?: string }>();
  return <FinishScreen justClaimed={claimed === '1'} />;
}
