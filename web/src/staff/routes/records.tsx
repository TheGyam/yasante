import { useParams } from 'react-router';
import { RecordList, useStaffContext } from '@/features/staff';

export default function Route() {
  const { app, model } = useParams();
  const data = useStaffContext();
  return <RecordList key={`${app}.${model}`} app={app!} model={model!} csrf={data.csrfToken} />;
}
