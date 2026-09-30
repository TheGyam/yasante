import { Navigate, useParams } from 'react-router';
import { ReviewScreen, useStaffContext } from '@/features/staff';

export default function Route() {
  const { queue } = useParams();
  const data = useStaffContext();
  if (!queue) {
    const first = data.queues.find(item => item.count) ?? data.queues[0];
    return <Navigate to={first ? first.url : '/'} replace />;
  }
  return <ReviewScreen key={queue} queue={queue} data={data} />;
}
