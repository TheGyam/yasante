import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Smartphone } from 'lucide-react-native';
import {
  AuthLayout,
  errorMessage,
  useAuthStore,
  useStartPhoneVerification,
  useVerifyPhone,
} from '@/features/auth';
import { useActiveMode } from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { formatUkMobile, formatUkMobileInput, normalizeUkMobile } from '@/shared/lib/phone';
import { EASE_OUT, makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { CodeInput, type CodeStatus } from '@/shared/ui/CodeInput';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';

const FORWARD = FadeInRight.duration(280).easing(EASE_OUT);
const BACKWARD = FadeInLeft.duration(280).easing(EASE_OUT);
// Let the green ripple finish before the flow closes.
const CLOSE_AFTER_SUCCESS = 700;
const CLEAR_AFTER_ERROR = 450;

const useStyles = makeStyles(() => ({
  step: { gap: space.lg },
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  actions: { gap: space.xs },
}));

export default function VerifyPhoneScreen() {
  const styles = useStyles();
  const stylist = useActiveMode() === 'stylist';
  const start = useStartPhoneVerification();
  const verify = useVerifyPhone();

  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<string>();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<CodeStatus>('idle');
  const [codeError, setCodeError] = useState<string>();
  const [resendIn, setResendIn] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (resendIn <= 0) return;
    const tick = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [resendIn]);

  const send = async (to: string) => {
    try {
      const challenge = await start.mutateAsync(to);
      setResendIn(challenge.resendInSeconds);
      setPhone(to);
      setDirection(1);
      return true;
    } catch (error) {
      haptics.error();
      const message = errorMessage(error, 'We couldn’t send a code. Try again in a moment.');
      if (phone) setCodeError(message);
      else setNumberError(message);
      return false;
    }
  };

  const submitNumber = () => {
    const normalized = normalizeUkMobile(number);
    if (!normalized) {
      haptics.error();
      setNumberError('Enter a UK mobile number, like 07700 900123');
      return;
    }
    send(normalized);
  };

  const submitCode = async (value: string) => {
    if (!phone) return;
    setCodeError(undefined);
    try {
      const account = await verify.mutateAsync({ phone, code: value });
      setStatus('success');
      haptics.success();
      // Storing the verified account is what lets the sign-up flow close.
      setTimeout(() => useAuthStore.getState().setUser(account), CLOSE_AFTER_SUCCESS);
    } catch (error) {
      haptics.error();
      setStatus('error');
      setCodeError(errorMessage(error, 'That code didn’t work. Try again.'));
      // Clear the boxes once the shake has played, ready for another go.
      setTimeout(() => setCode(''), CLEAR_AFTER_ERROR);
    }
  };

  const changeNumber = () => {
    setDirection(-1);
    setPhone(null);
    setCode('');
    setStatus('idle');
    setCodeError(undefined);
  };

  const later = (
    <Button
      label="Not now"
      variant="ghost"
      onPress={() => useAuthStore.getState().deferPhone()}
      fullWidth
      testID="verify-later"
    />
  );

  return (
    <AuthLayout
      title={phone ? 'Enter the code' : 'Add your mobile'}
      subtitle={
        phone
          ? `We texted a six-digit code to ${formatUkMobile(phone)}.`
          : stylist
            ? 'We check it’s yours before your page goes live. Clients never see your number.'
            : 'We check it’s yours before you book. Stylists never see your number.'
      }
      back={false}
      testID="verify-phone-screen"
    >
      {phone ? (
        <Animated.View key="code" entering={FORWARD} style={styles.step}>
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
              <Text
                variant="subhead"
                tone="accent"
                onPress={() => send(phone)}
                suppressHighlighting
              >
                Resend code
              </Text>
            )}
          </View>
          <View style={styles.actions}>
            <Button
              label="Use a different number"
              variant="secondary"
              onPress={changeNumber}
              fullWidth
            />
            {later}
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          key="number"
          entering={direction > 0 ? undefined : BACKWARD}
          style={styles.step}
        >
          <Input
            label="Mobile number"
            icon={Smartphone}
            value={number}
            onChangeText={text => {
              setNumber(formatUkMobileInput(text));
              setNumberError(undefined);
            }}
            placeholder="07700 900123"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="send"
            onSubmitEditing={submitNumber}
            error={numberError}
            hint="UK mobiles only for now"
            autoFocus
          />
          <View style={styles.actions}>
            <Button
              label="Text me a code"
              onPress={submitNumber}
              loading={start.isPending}
              fullWidth
              testID="send-code"
            />
            {later}
          </View>
        </Animated.View>
      )}
    </AuthLayout>
  );
}
