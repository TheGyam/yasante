import React, { useState } from 'react';
import { ScrollView, View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Input } from '@/shared/legacy/ui/Input';
import { Text } from '@/shared/legacy/ui/Text';
import { Card } from '@/shared/legacy/ui/Card';
import { Switch } from '@/shared/legacy/ui/Switch';
import { TopBar } from '@/shared/legacy/components/TopBar';
import { FadeIn } from '@/shared/legacy/animations/FadeIn';
import { SlideIn } from '@/shared/legacy/animations/SlideIn';
import { useLogin } from '@/features/auth';
import { isValidEmail, isRequired } from '@/shared/utils/validation';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const Content = styled.View<{ bottomInset: number }>`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ bottomInset, theme }: { bottomInset: number; theme: Theme }) =>
    bottomInset + theme.spacing[4]}px;
`;

const FormCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const TextLink = styled.TouchableOpacity`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const RememberMeRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const RememberMeText = styled.View`
  flex: 1;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const LinksRow = styled.View`
  flex-direction: row;
  justify-content: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const ErrorText = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isRequired(email)) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isRequired(password)) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setGeneralError('');

    if (!validate()) {
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
      // Navigation will be handled by AuthContext
    } catch (error: any) {
      setGeneralError(error?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <Container testID="login-screen">
      <TopBar title="Welcome Back" showBack={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollContent contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Content bottomInset={insets.bottom}>
            <FadeIn delay={100}>
              <Text
                variant="h1"
                weight="bold"
                color={theme.colors.primary}
                style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}
              >
                Yasante
              </Text>
            </FadeIn>

            <SlideIn delay={200} direction="up" distance={30}>
              <Text variant="h2" style={{ marginBottom: theme.spacing[6], textAlign: 'center' }}>
                Sign in to continue
              </Text>
            </SlideIn>

            <SlideIn delay={300} direction="up" distance={30}>
              <FormCard>
                {generalError ? (
                  <ErrorText
                    variant="caption"
                    color={theme.colors.error}
                    style={{ marginBottom: theme.spacing[3] }}
                  >
                    {generalError}
                  </ErrorText>
                ) : null}

                <Input
                  label="Email"
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                    setGeneralError('');
                  }}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email}
                  testID="email-input"
                />

                <Input
                  label="Password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: '' });
                    setGeneralError('');
                  }}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  error={errors.password}
                  testID="password-input"
                />

                <RememberMeRow>
                  <RememberMeText>
                    <Text variant="body" color={theme.colors.text.medium}>
                      Remember me
                    </Text>
                  </RememberMeText>
                  <Switch value={rememberMe} onValueChange={setRememberMe} />
                </RememberMeRow>

                <TextLink
                  onPress={handleLogin}
                  activeOpacity={0.7}
                  disabled={loginMutation.isPending}
                  testID="login-button"
                >
                  {loginMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text variant="body" weight="semibold" color={theme.colors.primary}>
                      Sign In
                    </Text>
                  )}
                </TextLink>
              </FormCard>

              <LinksRow>
                <TextLink
                  onPress={() => router.push('/auth/forgot-password')}
                  activeOpacity={0.7}
                  testID="forgot-password-link"
                >
                  <Text variant="body" color={theme.colors.text.medium}>
                    Forgot Password?
                  </Text>
                </TextLink>
              </LinksRow>

              <LinksRow>
                <Text variant="body" color={theme.colors.text.medium}>
                  Don't have an account?{' '}
                </Text>
                <TextLink
                  onPress={() => router.push('/auth/signup')}
                  activeOpacity={0.7}
                  testID="signup-link"
                >
                  <Text variant="body" weight="medium" color={theme.colors.primary}>
                    Sign Up
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
