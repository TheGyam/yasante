import { RecordList, useStaffContext } from '@/features/staff';
import { useLocation, useParams } from 'react-router';
export default function Route() {
  const { app, model } = useParams();
  const location = useLocation();
  const data = useStaffContext();
  return (
    <RecordList
      key={location.search + app + model}
      app={app!}
      model={model!}
      csrf={data.csrfToken}
    />
  );
}
