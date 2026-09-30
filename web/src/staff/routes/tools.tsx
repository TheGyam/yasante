import { Tools, useStaffContext } from '@/features/staff';
export default function Route() {
  const data = useStaffContext();
  return <Tools models={data.models} />;
}
