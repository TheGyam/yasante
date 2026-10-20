import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
import { Lock, Mail, Store, UserRound } from 'lucide-react-native';
import {
  AuthLayout,
  AuthSwitch,
  PasswordStrength,
  SocialSignIn,
  errorMessage,
  useInvite,
  useSignup,
} from '@/features/auth';
import { useModeStore } from '@/features/stylist';
import { POLICY_VERSION, PRIVACY_ROUTE, TERMS_ROUTE } from '@/shared/config/policies';
import { useConsentStore } from '@/shared/config/consentStore';
import { haptics } from '@/shared/lib/haptics';
import { Button } from '@/shared/ui/Button';
import { space } from '@/shared/theme';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { isRequired, isValidEmail, validatePassword } from '@/shared/utils/validation';

type Field = 'name' | 'email' | 'password' | 'confirmPassword' | 'agreed';

// Optional at sign-up: a band, never a birthday.
const AGE_BANDS = [
  { value: '18_24', label: '18 to 24' },
  { value: '25_34', label: '25 to 34' },
  { value: '35_44', label: '35 to 44' },
  { value: '45_54', label: '45 to 54' },
  { value: '55_plus', label: '55 or over' },
] as const;
type AgeBand = (typeof AGE_BANDS)[number]['value'];

const local = StyleSheet.create({
  ages: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});

export default function SignupScreen() {
  const router = useRouter();
  const { role, invite: inviteCode } = useLocalSearchParams<{ role?: string; invite?: string }>();
  const { data: invite } = useInvite(inviteCode);
  const signup = useSignup();
  // Back to the role choice when it came first; a close button when this opened the flow.
  const pushed = useNavigationState(state => state.index > 0);
  const setConsent = useConsentStore(s => s.setConsent);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [ageBand, setAgeBand] = useState<AgeBand>();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');

  // Everyone picks a side first; an invite link picks stylist for them.
  if (role !== 'client' && role !== 'stylist') return <Redirect href="/auth/join" />;
  const stylist = role === 'stylist';

  const clear = (field: Field) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
    if (formError) setFormError('');
  };

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {};
    if (!isRequired(name))
      next.name = stylist ? 'Add the name clients know you by' : 'Tell us your name';
    if (!isRequired(email)) next.email = 'Enter your email';
    else if (!isValidEmail(email.trim())) next.email = 'That email doesn’t look right';
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) next.password = passwordCheck.errors[0];
    if (!confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords don’t match';
    if (!agreed) next.agreed = 'Confirm you’re 18 or over to continue';

    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) {
      haptics.error();
      return;
    }

    try {
      await signup.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirm: confirmPassword,
        role,
        invite_code: invite?.code,
        age_confirmed: true,
        age_band: ageBand,
        policy_version: POLICY_VERSION,
      });
      setConsent('terms', true);
      setConsent('privacy', true);
      // Stylist mode starts once sign-up has closed, not under it (see startAs).
      if (stylist) useModeStore.getState().setStartAs('stylist');
      haptics.success();
      // Signed in now; the flow stays open until the email is confirmed.
      router.push('/auth/verify-email');
    } catch (error) {
      haptics.error();
      setFormError(errorMessage(error, 'We couldn’t create your account. Try again in a moment.'));
    }
  };

  return (
    <AuthLayout
      title={stylist ? 'Set up your stylist account' : 'Create your account'}
      subtitle={
        stylist
          ? 'Your page, menu and bookings in one place. Free for founding stylists.'
          : 'Plan your styles, track your growth and find stylists who know your hair.'
      }
      back={pushed}
      testID="signup-screen"
      footer={
        <AuthSwitch
          prompt="Already have an account?"
          action="Sign in"
          onPress={() => router.replace('/auth/login')}
          testID="login-link"
        />
      }
    >
      {invite ? <InlineAlert tone="success" message={`Invited by ${invite.invitedBy}`} /> : null}
      {formError ? <InlineAlert message={formError} /> : null}

      <SocialSignIn
        role={role}
        onError={setFormError}
        onDone={created => {
          setConsent('terms', true);
          setConsent('privacy', true);
          // Already confirmed by Apple or Google, so the flow closes on its own.
          if (created && stylist) useModeStore.getState().setStartAs('stylist');
        }}
      />

      <Input
        label={stylist ? 'Your name or business name' : 'Name'}
        icon={stylist ? Store : UserRound}
        value={name}
        onChangeText={text => {
          setName(text);
          clear('name');
        }}
        placeholder={stylist ? 'Braids by Ama' : 'Your name'}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={errors.name}
        testID="name-input"
      />

      <Input
        ref={emailRef}
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={text => {
          setEmail(text);
          clear('email');
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
        testID="email-input"
      />

      <Input
        ref={passwordRef}
        label="Password"
        icon={Lock}
        value={password}
        onChangeText={text => {
          setPassword(text);
          clear('password');
        }}
        placeholder="Create a password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
        testID="password-input"
      />

      {password ? <PasswordStrength password={password} /> : null}

      <Input
        ref={confirmRef}
        label="Confirm password"
        icon={Lock}
        value={confirmPassword}
        onChangeText={text => {
          setConfirmPassword(text);
          clear('confirmPassword');
        }}
        placeholder="Type it again"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="done"
        error={errors.confirmPassword}
        testID="confirm-password-input"
      />

      <View style={local.ages}>
        <Text variant="subhead" tone="secondary">
          Your age (optional)
        </Text>
        <View style={local.chips}>
          {AGE_BANDS.map(band => (
            <Chip
              key={band.value}
              label={band.label}
              selected={ageBand === band.value}
              onPress={() => setAgeBand(ageBand === band.value ? undefined : band.value)}
            />
          ))}
        </View>
      </View>

      <Checkbox
        checked={agreed}
        onChange={value => {
          setAgreed(value);
          clear('agreed');
        }}
        accessibilityLabel="I’m 18 or over, and I agree to the Terms of Service and Privacy Policy"
      >
        <Text variant="subhead" tone="secondary">
          I’m 18 or over, and I agree to the{' '}
          <Text variant="subhead" tone="accent" onPress={() => router.push(TERMS_ROUTE)}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text variant="subhead" tone="accent" onPress={() => router.push(PRIVACY_ROUTE)}>
            Privacy Policy
          </Text>
        </Text>
      </Checkbox>
      {errors.agreed ? (
        <Text variant="footnote" tone="danger">
          {errors.agreed}
        </Text>
      ) : null}

      <Button
        label={stylist ? 'Create stylist account' : 'Create account'}
        onPress={submit}
        loading={signup.isPending}
        fullWidth
        testID="signup-button"
      />
    </AuthLayout>
  );
}
