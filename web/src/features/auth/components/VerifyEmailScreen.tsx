import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '@/shared/lib/api/client';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { CodeInput } from '@/shared/ui/CodeInput';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import { useStartEmail, useVerifyEmail } from '../hooks';
import { safeNext } from '../rules';
import { useSession } from '../session';
import { AuthLayout } from './AuthLayout';
import * as styles from './AuthLayout.css';

const CODE_LENGTH = 6;

/** Right after sign-up: the code emailed to her, before anything else. */
export function VerifyEmailScreen() {
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const after = safeNext(params.get('next')) ?? '/stylist-setup';
  const start = useStartEmail();
  const verify = useVerifyEmail();
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const sent = useRef(false);

  const send = (resend = false) =>
    start.mutate(resend, {
      onSuccess: challenge => setResendIn(challenge.resendInSeconds),
    });

  // One code on arrival. A code sent moments ago (a reload) still works, so a
  // "wait before asking again" answer here isn't an error worth showing.
  useEffect(() => {
    if (sent.current || !session || session.user.emailVerified) return;
    sent.current = true;
    send();
  });

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  if (!session) return <Navigate to="/auth/signup" replace />;
  if (session.user.emailVerified) return <Navigate to={after} replace />;

  const submit = (value = code) => {
    if (value.length !== CODE_LENGTH || verify.isPending) return;
    verify.mutate(value, {
      onSuccess: () => navigate(after, { replace: true }),
      onError: () => setCode(''),
    });
  };

  const waiting = start.error instanceof ApiError && start.error.status === 429;

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          We sent a {CODE_LENGTH}-digit code to <strong>{session.user.email}</strong>.
        </>
      }
    >
      <form
        className={styles.form}
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        {verify.isError && (
          <InlineAlert message={errorMessage(verify.error, 'That code didn’t work. Try again.')} />
        )}
        {start.isError && !waiting && (
          <InlineAlert message={errorMessage(start.error, 'We couldn’t send a code just now.')} />
        )}
        <CodeInput
          label="The code from the email"
          value={code}
          onChange={setCode}
          onComplete={submit}
          invalid={verify.isError}
          disabled={verify.isPending}
        />
        <Button
          type="submit"
          label="Confirm email"
          loading={verify.isPending}
          disabled={code.length !== CODE_LENGTH}
          fullWidth
        />
        <Text variant="footnote" tone="secondary" as="p" className={styles.footer}>
          Not there? Check your spam folder, or{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => send(true)}
            disabled={resendIn > 0 || start.isPending}
          >
            {resendIn > 0 ? `send another in ${resendIn}s` : 'send another code'}
          </button>
          .
        </Text>
      </form>
    </AuthLayout>
  );
}
