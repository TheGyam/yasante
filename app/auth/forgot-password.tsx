import React, { useState } from 'react';
import { ScrollView, View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import { TopBar } from '@/shared/components/TopBar';
import { FadeIn } from '@/shared/animations/FadeIn';
import { SlideIn } from '@/shared/animations/SlideIn';
import { useForgotPassword } from '@/features/auth';
import { isValidEmail, isRequired } from '@/shared/utils/validation';
import { Mail } from 'lucide-react-native';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View<{ bottomInset: number }>`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ bottomInset, theme }: { bottomInset: number; theme: Theme }) => bottomInset + theme.spacing[4]}px;
`;

const FormCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const TextLink = styled.TouchableOpacity`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const SuccessContainer = styled.View`
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const IconContainer = styled.View`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.accentLight};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const LinksRow = styled.View`
  flex-direction: row;
  justify-content: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const forgotPasswordMutation = useForgotPassword();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!isRequired(email)) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync(email);
      setSuccess(true);
    } catch (error: any) {
      // Still show success message for security (don't reveal if email exists)
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <Container testID="forgot-password-screen">
        <TopBar title="Check Your Email" />
        <ScrollContent>
          <Content bottomInset={insets.bottom}>
            <SlideIn delay={200} direction="up" distance={30}>
              <FormCard>
                <SuccessContainer>
                  <IconContainer>
                    <Mail size={40} color={theme.colors.primary} strokeWidth={2} />
                  </IconContainer>
                  <Text variant="h2" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
                    Check your email
                  </Text>
                  <Text variant="body" color={theme.colors.text.medium} style={{ textAlign: 'center', marginBottom: theme.spacing[4] }}>
                    If an account exists with {email}, we've sent you a password reset link.
                  </Text>
                  <Text variant="caption" color={theme.colors.text.low} style={{ textAlign: 'center' }}>
                    Please check your inbox and follow the instructions to reset your password.
                  </Text>
                </SuccessContainer>
              </FormCard>

              <LinksRow>
                <TextLink
                  onPress={() => router.push('/auth/login')}
                  activeOpacity={0.7}
                  testID="back-to-login-link"
                >
                  <Text variant="body" weight="medium" color={theme.colors.primary}>
                    Back to Sign In
                  </Text>
                </TextLink>
              </LinksRow>
            </SlideIn>
          </Content>
        </ScrollContent>
      </Container>
    );
  }

  return (
    <Container testID="forgot-password-screen">
      <TopBar title="Forgot Password" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollContent
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Content bottomInset={insets.bottom}>
            <FadeIn delay={100}>
              <Text variant="h2" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
                Reset your password
              </Text>
            </FadeIn>

            <SlideIn delay={200} direction="up" distance={30}>
              <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[6], textAlign: 'center' }}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
            </SlideIn>

            <SlideIn delay={300} direction="up" distance={30}>
              <FormCard>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email}
                  testID="email-input"
                />

                <TextLink
                  onPress={handleSubmit}
                  activeOpacity={0.7}
                  disabled={forgotPasswordMutation.isPending}
                  testID="submit-button"
                >
                  {forgotPasswordMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text variant="body" weight="semibold" color={theme.colors.primary}>
                      Send Reset Link
                    </Text>
                  )}
                </TextLink>
              </FormCard>

              <LinksRow>
                <TextLink
                  onPress={() => router.push('/auth/login')}
                  activeOpacity={0.7}
                  testID="back-to-login-link"
                >
                  <Text variant="body" color={theme.colors.text.medium}>
                    Back to Sign In
                  </Text>
                </TextLink>
              </LinksRow>
            </SlideIn>
          </Content>
        </ScrollContent>
      </KeyboardAvoidingView>
    </Container>
  );
}

