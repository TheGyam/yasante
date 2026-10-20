import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { useSignup } from '../hooks';
import { POLICY_VERSION, isValidEmail, passwordProblem, safeNext, withNext } from '../rules';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';
import * as styles from './AuthLayout.css';

type Field = 'name' | 'email' | 'password' | 'confirm' | 'agreed';

/**
 * An account, as the app's sign-up: a stylist's by default, or a client's
 * (?role=client), who comes back to what she was doing (?next=/book/ama).
 */
// Optional at sign-up: a band, never a birthday.
const AGE_BANDS = [
  { value: '18_24', label: '18 to 24' },
  { value: '25_34', label: '25 to 34' },
  { value: '35_44', label: '35 to 44' },
  { value: '45_54', label: '45 to 54' },
  { value: '55_plus', label: '55 or over' },
] as const;
type AgeBand = (typeof AGE_BANDS)[number]['value'];

export function SignupScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const client = params.get('role') === 'client';
  const signup = useSignup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [ageBand, setAgeBand] = useState<AgeBand>();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const clear = (field: Field) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problems: Partial<Record<Field, string>> = {};
    if (!name.trim()) problems.name = client ? 'Add your name' : 'Add the name clients know you by';
    if (!email.trim()) problems.email = 'Enter your email';
    else if (!isValidEmail(email.trim())) problems.email = 'That email doesn’t look right';
    const problem = passwordProblem(password);
    if (problem) problems.password = problem;
    if (!confirm) problems.confirm = 'Confirm your password';
    else if (password !== confirm) problems.confirm = 'Passwords don’t match';
    if (!agreed) problems.agreed = 'Confirm you’re 18 or over to continue';
    setErrors(problems);
    if (Object.keys(problems).length) return;

    signup.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm: confirm,
        role: client ? 'client' : 'stylist',
        ageConfirmed: true,
        ageBand,
        policyVersion: POLICY_VERSION,
      },
      // Signed in now; the email is confirmed before anything else.
      { onSuccess: () => navigate(withNext('/auth/verify-email', next)) }
    );
  };

  return (
    <AuthLayout
      title={client ? 'Create your account' : 'Set up your stylist account'}
      subtitle={
        client
          ? 'To send your request, and keep your bookings in one place. Free.'
          : 'Your page, menu and bookings in one place. Free for founding stylists.'
      }
      footer={
        <Text variant="subhead" tone="secondary">
          Already have an account?{' '}
          <Link to={withNext('/auth/login', next)}>
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
          label={client ? 'Your name' : 'Your name or business name'}
          placeholder={client ? 'Efua Mensah' : 'Braids by Ama'}
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
        <div className={styles.group}>
          <Text variant="subhead" tone="secondary">
            Your age (optional)
          </Text>
          <div className={styles.chips}>
            {AGE_BANDS.map(band => (
              <Chip
                key={band.value}
                label={band.label}
                selected={ageBand === band.value}
                onClick={() => setAgeBand(ageBand === band.value ? undefined : band.value)}
              />
            ))}
          </div>
        </div>
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
              </Link>
              {client ? ' ' : ', '}
              {!client && (
                <>
                  <Link to="/stylist-terms" target="_blank">
                    <Text variant="subhead" tone="accent">
                      Stylist terms
                    </Text>
                  </Link>{' '}
                </>
              )}
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
        <Button
          type="submit"
          label={client ? 'Create account' : 'Create stylist account'}
          loading={signup.isPending}
          fullWidth
        />
      </form>
    </AuthLayout>
  );
}
