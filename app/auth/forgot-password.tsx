import { useState } from 'react';
import { useRouter } from '@/shared/lib/navigation';
import { Mail } from 'lucide-react-native';
import { AuthLayout, useForgotPassword } from '@/features/auth';
import { haptics } from '@/shared/lib/haptics';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { isRequired, isValidEmail } from '@/shared/utils/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!isRequired(email)) return setError('Enter your email');
    if (!isValidEmail(email.trim())) return setError('That email doesn’t look right');

    try {
      await forgotPassword.mutateAsync(email.trim());
    } catch {
      // Same outcome either way, so nobody can use this screen to find out
      // whether an address has an account.
    }
    haptics.success();
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        back
        title="Check your email"
        subtitle={`If there’s an account for ${email.trim()}, a reset link is on its way. It can take a minute to arrive.`}
        testID="forgot-password-screen"
      >
        <Button
          label="Back to sign in"
          variant="secondary"
          onPress={() => router.replace('/auth/login')}
          fullWidth
          testID="back-to-login-link"
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      back
      title="Reset your password"
      subtitle="Enter the email you signed up with and we’ll send you a link to set a new one."
      testID="forgot-password-screen"
    >
      <Input
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={text => {
          setEmail(text);
          if (error) setError('');
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
        error={error}
        testID="email-input"
      />
      <Button
        label="Send reset link"
        onPress={submit}
        loading={forgotPassword.isPending}
        fullWidth
        testID="submit-button"
      />
    </AuthLayout>
  );
}
