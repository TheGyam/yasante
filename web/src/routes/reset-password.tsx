import { useSearchParams } from 'react-router';
import { ResetPasswordScreen } from '@/features/auth';

/** yasante.com/auth/reset-password?uid=…&token=… — the link in the reset email. */
export default function ResetPasswordRoute() {
  const [params] = useSearchParams();
  return (
    <ResetPasswordScreen
      uid={params.get('uid') ?? undefined}
      token={params.get('token') ?? undefined}
    />
  );
}
