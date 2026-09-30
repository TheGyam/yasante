import { PasswordForm } from './PasswordForm';
import { TwoFactorCard } from './TwoFactorCard';
import * as ui from './ui.css';

/** Your own account: your password, and the second factor that protects it. */
export function AccountPage({ csrf }: { csrf: string }) {
  return (
    <div className={ui.page}>
      <PasswordForm csrf={csrf} />
      <TwoFactorCard csrf={csrf} />
    </div>
  );
}
