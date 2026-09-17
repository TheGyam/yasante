import { useLocalSearchParams } from 'expo-router';
import { ContentDetail } from '@/features/education';

export default function InspoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentDetail id={id} basePath="/(tabs)/home" />;
}
