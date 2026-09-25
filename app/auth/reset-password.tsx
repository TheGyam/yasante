import { useEffect, useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
import { Lock } from 'lucide-react-native';
import { AuthLayout, errorMessage, PasswordStrength, useResetPassword } from '@/features/auth';
import { haptics } from '@/shared/lib/haptics';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { validatePassword } from '@/shared/utils/validation';

type Field = 'password' | 'confirmPassword';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const resetPassword = useResetPassword();
  const confirmRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      notify({
        title: 'This link has expired',
        message: 'Request a new reset link and try again.',
      }).then(() => router.replace('/auth/forgot-password'));
    }
  }, [token, router]);

  const submit = async () => {
    const next: Partial<Record<Field, string>> = {};
    const check = validatePassword(password);
    if (!check.isValid) next.password = check.errors[0];
    if (!confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords don’t match';

    setErrors(next);
    if (Object.keys(next).length) {
      haptics.error();
      return;
    }

    try {
      await resetPassword.mutateAsync({ token, password });
      haptics.success();
      setDone(true);
    } catch (error) {
      haptics.error();
      notify({
        title: 'Couldn’t reset your password',
        message: errorMessage(error, 'The link may have expired. Request a new one and try again.'),
      });
    }
  };

  if (!token) return null;

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="You can sign in with your new password now."
        testID="reset-password-screen"
      >
        <Button
          label="Sign in"
          onPress={() => router.replace('/auth/login')}
          fullWidth
          testID="go-to-login-link"
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      back
      title="Set a new password"
      subtitle="Choose something you haven’t used here before."
      testID="reset-password-screen"
    >
      <Input
        label="New password"
        icon={Lock}
        value={password}
        onChangeText={text => {
          setPassword(text);
          if (errors.password) setErrors(e => ({ ...e, password: undefined }));
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
          if (errors.confirmPassword) setErrors(e => ({ ...e, confirmPassword: undefined }));
        }}
        placeholder="Type it again"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.confirmPassword}
        testID="confirm-password-input"
      />
      <Button
        label="Update password"
        onPress={submit}
        loading={resetPassword.isPending}
        fullWidth
        testID="reset-button"
      />
    </AuthLayout>
  );
}
