import { useState, type FormEvent } from 'react';
import { CircleCheck, LinkIcon } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { useResetPassword } from '../hooks';
import { passwordProblem } from '../rules';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';
import * as styles from './AuthLayout.css';

export interface ResetPasswordScreenProps {
  /** From the emailed link: whose account, and the one-time token. */
  uid?: string;
  token?: string;
}

/**
 * The link in the reset email. On a phone with the app, the app opens it; anywhere
 * else it lands here. The same password rules as signing up.
 */
export function ResetPasswordScreen({ uid, token }: ResetPasswordScreenProps) {
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  if (!uid || !token) {
    return (
      <AuthLayout title="Choose a new password">
        <EmptyState
          icon={LinkIcon}
          title="This link isn’t complete"
          body="Open the link straight from the email, or ask for a new one."
          action={
            <Button
              label="Email me a new link"
              variant="secondary"
              size="md"
              to="/auth/forgot-password"
            />
          }
        />
      </AuthLayout>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthLayout title="Password changed">
        <EmptyState
          icon={CircleCheck}
          title="You’re all set"
          body="Your new password works now, here and in the app. Anywhere you were signed in has been signed out, to keep your account safe."
          action={<Button label="Sign in" to="/auth/login" />}
        />
      </AuthLayout>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    if (!confirm) next.confirm = 'Confirm your password';
    else if (password !== confirm) next.confirm = 'Passwords don’t match';
    setErrors(next);
    if (next.password || next.confirm) return;
    reset.mutate({ uid, token, password });
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="For your Yasante account, on the web and in the app."
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        {reset.isError && (
          <>
            <InlineAlert
              message={errorMessage(reset.error, 'That didn’t work. Ask for a new link.')}
            />
            <Button
              label="Email me a new link"
              variant="secondary"
              size="md"
              to="/auth/forgot-password"
            />
          </>
        )}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={event => setPassword(event.target.value)}
        />
        {password && <PasswordStrength password={password} />}
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={event => setConfirm(event.target.value)}
        />
        <Button type="submit" label="Change password" loading={reset.isPending} fullWidth />
      </form>
    </AuthLayout>
  );
}
