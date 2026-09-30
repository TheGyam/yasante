import { PasswordForm, useStaffContext } from '@/features/staff';
export default function Route() {
  const data = useStaffContext();
  return <PasswordForm csrf={data.csrfToken} />;
}
