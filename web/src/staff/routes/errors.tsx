import { useParams } from 'react-router';
import { ErrorDetail, ErrorList, useStaffContext } from '@/features/staff';

export default function Route() {
  const { id } = useParams();
  const data = useStaffContext();
  return id ? <ErrorDetail key={id} id={id} csrf={data.csrfToken} /> : <ErrorList />;
}
