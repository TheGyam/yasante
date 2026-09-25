import { useParams } from 'react-router';
import { LookScreen } from '@/features/looks';

export default function LookRoute() {
  const { id = '' } = useParams();
  return <LookScreen key={id} id={id} />;
}
