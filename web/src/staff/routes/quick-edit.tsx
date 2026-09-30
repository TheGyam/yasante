import { QuickEdit, useStaffContext } from '@/features/staff';
import { useParams } from 'react-router';
export default function Route() {
  const { app, model } = useParams();
  const data = useStaffContext();
  return <QuickEdit app={app!} model={model!} csrf={data.csrfToken} />;
}
