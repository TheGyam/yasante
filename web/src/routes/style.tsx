import { useParams } from 'react-router';
import { StyleScreen } from '@/features/browse';

export default function StyleRoute() {
  const { slug = '' } = useParams();
  return <StyleScreen key={slug} slug={slug} />;
}
