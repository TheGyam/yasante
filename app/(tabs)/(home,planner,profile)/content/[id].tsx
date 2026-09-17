import { useLocalSearchParams } from 'expo-router';
import { ContentDetail } from '@/features/education';

export default function ContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentDetail id={id} />;
}
