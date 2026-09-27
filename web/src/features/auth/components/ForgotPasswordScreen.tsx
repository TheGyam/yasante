import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { useForgotPassword } from '../hooks';
import { isValidEmail } from '../rules';
import { AuthLayout } from './AuthLayout';
import * as styles from './AuthLayout.css';

/** A link to choose a new password, emailed. */
export function ForgotPasswordScreen() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email.trim())) return setProblem('Enter the email you signed up with');
    setProblem(undefined);
    forgot.mutate(email.trim());
  };

  if (forgot.isSuccess) {
    return (
      <AuthLayout title="Check your email">
        <EmptyState
          icon={MailCheck}
          title="A link is on its way"
          body={`If there’s a Yasante account for ${email.trim()}, we’ve sent it a link to choose a new password. It works for an hour, and only once. Not there? Check your spam folder.`}
          action={<Button label="Back to sign in" variant="secondary" size="md" to="/auth/login" />}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We’ll email you a link to choose a new one."
      footer={
        <Text variant="subhead" tone="secondary">
          Remembered it?{' '}
          <Link to="/auth/login">
            <Text variant="subhead" tone="accent">
              Sign in
            </Text>
          </Link>
        </Text>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        {forgot.isError && (
          <InlineAlert
            message={errorMessage(forgot.error, 'We couldn’t send a link just now. Try again.')}
          />
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={problem}
          onChange={event => setEmail(event.target.value)}
        />
        <Button type="submit" label="Email me a link" loading={forgot.isPending} fullWidth />
      </form>
    </AuthLayout>
  );
}
