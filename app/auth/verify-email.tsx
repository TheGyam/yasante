import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Mail } from 'lucide-react-native';
import {
  AuthLayout,
  errorMessage,
  useAuth,
  useAuthStore,
  useStartEmailVerification,
  useVerifyEmail,
} from '@/features/auth';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { CodeInput, type CodeStatus } from '@/shared/ui/CodeInput';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { isValidEmail } from '@/shared/utils/validation';

const FORWARD = FadeInRight.duration(280).easing(EASE_OUT);
const BACKWARD = FadeInLeft.duration(280).easing(EASE_OUT);
// Let the green ripple finish before moving on.
const NEXT_AFTER_SUCCESS = 700;
const CLEAR_AFTER_ERROR = 450;

const useStyles = makeStyles(() => ({
  step: { gap: space.lg },
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  actions: { gap: space.xs },
}));

/**
 * Right after sign-up (and whenever an unconfirmed account opens the app): the code
 * we emailed, typed in. Not skippable, since it's what proves the account is hers;
 * a typo in the address can be fixed here, and she can always sign out.
 */
export default function VerifyEmailScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { user, logout } = useAuth();
  const start = useStartEmailVerification();
  const verify = useVerifyEmail();

  const [email, setEmail] = useState(user?.email ?? '');
  const [changing, setChanging] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string>();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<CodeStatus>('idle');
  const [codeError, setCodeError] = useState<string>();
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const tick = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [resendIn]);

  const send = async (to?: string) => {
    setCodeError(undefined);
    try {
      const challenge = await start.mutateAsync(to);
      setResendIn(challenge.resendInSeconds);
      if (to) setEmail(to);
      return true;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // A code went out moments ago (opening this twice, say): that one still works.
      if (status === 429 && !to) {
        setResendIn(30);
        return true;
      }
      haptics.error();
      const message = errorMessage(error, 'We couldn’t send the email. Try again in a moment.');
      if (to) setDraftError(message);
      else setCodeError(message);
      return false;
    }
  };

  // The code is sent as the screen opens.
  const sentOnce = useRef(false);
  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    send();
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCode = async (value: string) => {
    setCodeError(undefined);
    try {
      const account = await verify.mutateAsync(value);
      setStatus('success');
      haptics.success();
      // Storing the confirmed account is what closes sign-up.
      setTimeout(() => useAuthStore.getState().setUser(account), NEXT_AFTER_SUCCESS);
    } catch (error) {
      haptics.error();
      setStatus('error');
      setCodeError(errorMessage(error, 'That code didn’t work. Try again.'));
      setTimeout(() => setCode(''), CLEAR_AFTER_ERROR);
    }
  };

  const submitDraft = async () => {
    const next = draft.trim().toLowerCase();
    if (!isValidEmail(next)) {
      haptics.error();
      setDraftError('That email doesn’t look right');
      return;
    }
    if (await send(next)) {
      setChanging(false);
      setCode('');
      setStatus('idle');
    }
  };

  const signOut = <Button label="Sign out" variant="ghost" onPress={() => logout()} fullWidth />;

  return (
    <AuthLayout
      title={changing ? 'Fix your email' : 'Check your email'}
      subtitle={
        changing
          ? 'We’ll send a new code to the right address.'
          : `We sent a six-digit code to ${email}. It can take a minute to arrive, so check your spam folder too.`
      }
      back={false}
      testID="verify-email-screen"
    >
      {changing ? (
        <Animated.View key="change" entering={FORWARD} style={styles.step}>
          <Input
            label="Email"
            icon={Mail}
            value={draft}
            onChangeText={text => {
              setDraft(text);
              setDraftError(undefined);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={submitDraft}
            error={draftError}
            autoFocus
          />
          <View style={styles.actions}>
            <Button
              label="Send the code there"
              onPress={submitDraft}
              loading={start.isPending}
              fullWidth
            />
            <Button label="Back" variant="ghost" onPress={() => setChanging(false)} fullWidth />
          </View>
        </Animated.View>
      ) : (
        <Animated.View key="code" entering={BACKWARD} style={styles.step}>
          <CodeInput
            value={code}
            onChange={value => {
              setCode(value);
              if (status === 'error') setStatus('idle');
            }}
            onComplete={submitCode}
            status={status}
            editable={status !== 'success' && !verify.isPending}
            autoFocus
          />
          {codeError ? (
            <Text variant="footnote" tone="danger" align="center" accessibilityLiveRegion="polite">
              {codeError}
            </Text>
          ) : null}
          <View style={styles.row}>
            {resendIn > 0 ? (
              <Text variant="subhead" tone="tertiary">
                Resend code in 0:{String(resendIn).padStart(2, '0')}
              </Text>
            ) : (
              <Text variant="subhead" tone="accent" onPress={() => send()} suppressHighlighting>
                {start.isPending ? 'Sending…' : 'Resend code'}
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <Button
              label="Wrong email?"
              variant="secondary"
              onPress={() => {
                setDraft(email);
                setChanging(true);
              }}
              fullWidth
            />
            {signOut}
          </View>
        </Animated.View>
      )}
    </AuthLayout>
  );
}
