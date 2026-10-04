import { useParams } from 'react-router';
import { RecordHistory } from '@/features/staff';

export default function Route() {
  const { app, model, id } = useParams();
  return <RecordHistory app={app!} model={model!} id={id!} standalone />;
}
