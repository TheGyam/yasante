import { RecordHistory } from '@/features/staff';
import { useParams } from 'react-router';
export default function Route() {
  const { app, model, id } = useParams();
  return <RecordHistory app={app!} model={model!} id={id!} />;
}
