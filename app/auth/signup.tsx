import { useRef, useState } from 'react';
import { Linking, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail, UserRound } from 'lucide-react-native';
import { AuthLayout, AuthSwitch, PasswordStrength, useSignup } from '@/features/auth';
import { PRIVACY_URL, TERMS_URL } from '@/shared/config/policies';
import { useConsentStore } from '@/shared/config/consentStore';
import { haptics } from '@/shared/lib/haptics';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { isRequired, isValidEmail, validatePassword } from '@/shared/utils/validation';

type Field = 'name' | 'email' | 'password' | 'confirmPassword' | 'terms';

export default function SignupScreen() {
  const router = useRouter();
  const signup = useSignup();
  const setConsent = useConsentStore(s => s.setConsent);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');

  const clear = (field: Field) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
    if (formError) setFormError('');
  };

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {};
    if (!isRequired(name)) next.name = 'Tell us your name';
    if (!isRequired(email)) next.email = 'Enter your email';
    else if (!isValidEmail(email.trim())) next.email = 'That email doesn’t look right';
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) next.password = passwordCheck.errors[0];
    if (!confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords don’t match';
    if (!acceptedTerms) next.terms = 'Accept the terms to continue';

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
      });
      // Record what they agreed to, against the version they saw.
      setConsent('terms', true);
      setConsent('privacy', true);
      haptics.success();
    } catch (error: any) {
      haptics.error();
      setFormError(
        error?.response?.data?.non_field_errors?.[0] ||
          error?.response?.data?.message ||
          error?.message ||
          'We couldn’t create your account. Try again in a moment.'
      );
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Plan your styles, track your growth and find stylists who know your hair."
      testID="signup-screen"
      footer={
        <AuthSwitch
          prompt="Already have an account?"
          action="Sign in"
          onPress={() => router.push('/auth/login')}
          testID="login-link"
        />
      }
    >
      {formError ? <InlineAlert message={formError} /> : null}

      <Input
        label="Name"
        icon={UserRound}
        value={name}
        onChangeText={text => {
          setName(text);
          clear('name');
        }}
        placeholder="Your name"
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

      <PasswordStrength password={password} />

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

      <Checkbox
        checked={acceptedTerms}
        onChange={value => {
          setAcceptedTerms(value);
          clear('terms');
        }}
        accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
      >
        <Text variant="subhead" tone="secondary">
          I agree to the{' '}
          <Text variant="subhead" tone="accent" onPress={() => Linking.openURL(TERMS_URL)}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text variant="subhead" tone="accent" onPress={() => Linking.openURL(PRIVACY_URL)}>
            Privacy Policy
          </Text>
        </Text>
      </Checkbox>
      {errors.terms ? (
        <Text variant="footnote" tone="danger">
          {errors.terms}
        </Text>
      ) : null}

      <Button
        label="Create account"
        onPress={submit}
        loading={signup.isPending}
        fullWidth
        testID="signup-button"
      />
    </AuthLayout>
  );
}
