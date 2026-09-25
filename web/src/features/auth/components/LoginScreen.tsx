import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { useLogin } from '../hooks';
import { isValidEmail } from '../rules';
import { AuthLayout } from './AuthLayout';
import * as styles from './AuthLayout.css';

/** Back to finish setting up a page: the same email and password as the app. */
export function LoginScreen() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!isValidEmail(email.trim())) next.email = 'Enter the email you signed up with';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (next.email || next.password) return;
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: ({ user }) =>
          navigate(user.emailVerified ? '/stylist-setup' : '/auth/verify-email'),
      }
    );
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="To set up or change your page."
      footer={
        <Text variant="subhead" tone="secondary">
          New to Yasante?{' '}
          <Link to="/auth/signup">
            <Text variant="subhead" tone="accent">
              Set up a stylist account
            </Text>
          </Link>
        </Text>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        {login.isError && (
          <InlineAlert message={errorMessage(login.error, 'We couldn’t sign you in. Try again.')} />
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={event => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          hint="Forgot it? Reset it from the sign-in screen in the Yasante app."
          onChange={event => setPassword(event.target.value)}
        />
        <Button type="submit" label="Sign in" loading={login.isPending} fullWidth />
      </form>
    </AuthLayout>
  );
}
