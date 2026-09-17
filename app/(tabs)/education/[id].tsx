import { useLocalSearchParams } from 'expo-router';
import { ContentDetail } from '@/features/education';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentDetail id={id} basePath="/(tabs)/education" />;
}
