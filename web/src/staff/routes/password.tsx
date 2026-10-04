import { AccountPage, useStaffContext } from '@/features/staff';

export default function Route() {
  return <AccountPage csrf={useStaffContext().csrfToken} />;
}
