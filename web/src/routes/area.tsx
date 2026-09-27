import { useParams } from 'react-router';
import { AreaScreen } from '@/features/browse';

export default function AreaRoute() {
  const { slug = '' } = useParams();
  return <AreaScreen key={slug} slug={slug} />;
}
