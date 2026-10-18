import { useParams } from 'react-router';
import { Featured, useStaffContext } from '@/features/staff';

export default function Route() {
  const { id } = useParams();
  const data = useStaffContext();
  return <Featured key={id ?? 'list'} id={id} csrf={data.csrfToken} />;
}
