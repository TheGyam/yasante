import { useParams } from 'react-router';
import { RecordPage, useStaffContext } from '@/features/staff';

export default function Route() {
  const { app, model, id } = useParams();
  const data = useStaffContext();
  return (
    <RecordPage
      key={`${app}.${model}.${id ?? 'new'}`}
      app={app!}
      model={model!}
      id={id}
      csrf={data.csrfToken}
    />
  );
}
