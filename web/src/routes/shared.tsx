import { useParams } from 'react-router';
import { SharedCarePlanScreen, SharedCollectionScreen } from '@/features/shared';

export function SharedCollectionRoute() {
  const { code = '' } = useParams();
  return <SharedCollectionScreen key={code} code={code} />;
}

export function SharedCarePlanRoute() {
  const { code = '' } = useParams();
  return <SharedCarePlanScreen key={code} code={code} />;
}
