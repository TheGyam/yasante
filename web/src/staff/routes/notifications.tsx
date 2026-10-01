import { useParams } from 'react-router';
import { Broadcasts, Composer, useStaffContext } from '@/features/staff';

export default function Route() {
  const { action } = useParams();
  const data = useStaffContext();
  return action === 'new' ? (
    <Composer csrf={data.csrfToken} />
  ) : (
    <Broadcasts csrf={data.csrfToken} />
  );
}
