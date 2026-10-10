import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { useLogin } from '../hooks';
import { isValidEmail, safeNext, withNext } from '../rules';
import { AuthLayout } from './AuthLayout';
import * as styles from './AuthLayout.css';

/** The same email and password as the app; back to what she was doing (?next=). */
export function LoginScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeNext(params.get('next'));
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
        onSuccess: ({ user }) => {
          const home = back ?? (user.roles.includes('stylist') ? '/today' : '/bookings');
          navigate(user.emailVerified ? home : withNext('/auth/verify-email', home));
        },
      }
    );
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle={
        back
          ? 'With the same email and password as the app.'
          : 'To your bookings, or your studio if you’re a stylist.'
      }
      footer={
        <Text variant="subhead" tone="secondary">
          New to Yasante?{' '}
          <Link to={back ? withNext('/auth/signup?role=client', back) : '/auth/signup'}>
            <Text variant="subhead" tone="accent">
              {back ? 'Create an account' : 'Set up a stylist account'}
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
          onChange={event => setPassword(event.target.value)}
        />
        <Button type="submit" label="Sign in" loading={login.isPending} fullWidth />
        <Link to="/auth/forgot-password" className={styles.footer}>
          <Text variant="subhead" tone="accent">
            Forgot your password?
          </Text>
        </Link>
      </form>
    </AuthLayout>
  );
}
