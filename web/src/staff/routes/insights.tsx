import { Insights, useStaffContext } from '@/features/staff';

export default function Route() {
  return <Insights superuser={useStaffContext().user.superuser} />;
}
