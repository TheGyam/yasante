import { RecordForm, useStaffContext } from '@/features/staff';
import { useParams } from 'react-router';
export default function Route() {
  const { app, model, id } = useParams();
  const data = useStaffContext();
  return <RecordForm app={app!} model={model!} id={id} csrf={data.csrfToken} />;
}
