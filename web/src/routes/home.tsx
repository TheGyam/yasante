import { useSearchParams } from 'react-router';
import { HomeScreen } from '@/features/home';

export default function HomeRoute() {
  const [params] = useSearchParams();
  return <HomeScreen source={params.get('from') ?? undefined} />;
}
