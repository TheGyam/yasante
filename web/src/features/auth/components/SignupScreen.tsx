import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { useSignup } from '../hooks';
import { POLICY_VERSION, isValidEmail, passwordProblem } from '../rules';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';
import * as styles from './AuthLayout.css';

type Field = 'name' | 'email' | 'password' | 'confirm' | 'agreed';

/** A stylist's account, as the app's sign-up with the stylist side chosen. */
export function SignupScreen() {
  const navigate = useNavigate();
  const signup = useSignup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const clear = (field: Field) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (!name.trim()) next.name = 'Add the name clients know you by';
    if (!email.trim()) next.email = 'Enter your email';
    else if (!isValidEmail(email.trim())) next.email = 'That email doesn’t look right';
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    if (!confirm) next.confirm = 'Confirm your password';
    else if (password !== confirm) next.confirm = 'Passwords don’t match';
    if (!agreed) next.agreed = 'Confirm you’re 18 or over to continue';
    setErrors(next);
    if (Object.keys(next).length) return;

    signup.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm: confirm,
        role: 'stylist',
        ageConfirmed: true,
        policyVersion: POLICY_VERSION,
      },
      // Signed in now; the email is confirmed before anything else.
      { onSuccess: () => navigate('/auth/verify-email') }
    );
  };

  return (
    <AuthLayout
      title="Set up your stylist account"
      subtitle="Your page, menu and bookings in one place. Free for founding stylists."
      footer={
        <Text variant="subhead" tone="secondary">
          Already have an account?{' '}
          <Link to="/auth/login">
            <Text variant="subhead" tone="accent">
              Sign in
            </Text>
          </Link>
        </Text>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        {signup.isError && (
          <InlineAlert
            message={errorMessage(
              signup.error,
              'We couldn’t create your account. Try again in a moment.'
            )}
          />
        )}
        <Input
          label="Your name or business name"
          placeholder="Braids by Ama"
          autoComplete="name"
          value={name}
          error={errors.name}
          onChange={event => {
            setName(event.target.value);
            clear('name');
          }}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={event => {
            setEmail(event.target.value);
            clear('email');
          }}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={event => {
            setPassword(event.target.value);
            clear('password');
          }}
        />
        {password && <PasswordStrength password={password} />}
        <Input
          label="Confirm password"
          type="password"
          placeholder="Type it again"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={event => {
            setConfirm(event.target.value);
            clear('confirm');
          }}
        />
        <div>
          <Checkbox
            checked={agreed}
            invalid={!!errors.agreed}
            onChange={value => {
              setAgreed(value);
              clear('agreed');
            }}
          >
            <Text variant="subhead" tone="secondary">
              I’m 18 or over, and I agree to the{' '}
              <Link to="/terms" target="_blank">
                <Text variant="subhead" tone="accent">
                  Terms of Service
                </Text>
              </Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank">
                <Text variant="subhead" tone="accent">
                  Privacy Policy
                </Text>
              </Link>
            </Text>
          </Checkbox>
          {errors.agreed && (
            <Text variant="footnote" tone="danger" as="p" role="alert">
              {errors.agreed}
            </Text>
          )}
        </div>
        <Button type="submit" label="Create stylist account" loading={signup.isPending} fullWidth />
      </form>
    </AuthLayout>
  );
}
