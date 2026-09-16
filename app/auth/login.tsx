import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { AuthLayout, AuthSwitch, useLogin } from '@/features/auth';
import { haptics } from '@/shared/lib/haptics';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { isRequired, isValidEmail } from '@/shared/utils/validation';

type Field = 'email' | 'password';

export default function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');

  const clear = (field: Field) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
    if (formError) setFormError('');
  };

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {};
    if (!isRequired(email)) next.email = 'Enter your email';
    else if (!isValidEmail(email.trim())) next.email = 'That email doesn’t look right';
    if (!isRequired(password)) next.password = 'Enter your password';

    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) {
      haptics.error();
      return;
    }

    try {
      await login.mutateAsync({ email: email.trim(), password });
      haptics.success();
      // AuthContext routes away once the session exists.
    } catch (error: any) {
      haptics.error();
      setFormError(error?.message || 'We couldn’t sign you in. Check your details and try again.');
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where your hair journey left off."
      testID="login-screen"
      footer={
        <AuthSwitch
          prompt="New to Yasante?"
          action="Create an account"
          onPress={() => router.push('/auth/signup')}
          testID="signup-link"
        />
      }
    >
      {formError ? <InlineAlert message={formError} /> : null}

      <Input
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
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
        testID="password-input"
      />

      <Text
        variant="subhead"
        tone="accent"
        align="right"
        suppressHighlighting
        onPress={() => router.push('/auth/forgot-password')}
        testID="forgot-password-link"
      >
        Forgot password?
      </Text>

      <Button
        label="Sign in"
        onPress={submit}
        loading={login.isPending}
        fullWidth
        testID="login-button"
      />
    </AuthLayout>
  );
}
