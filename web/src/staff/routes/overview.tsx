import { Today, useStaffContext } from '@/features/staff';

export default function Route() {
  return <Today data={useStaffContext()} />;
}
