import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import { TopBar } from '@/shared/components/TopBar';
import { FadeIn } from '@/shared/animations/FadeIn';
import { SlideIn } from '@/shared/animations/SlideIn';
import { useResetPassword } from '@/features/auth';
import {
  validatePassword,
  getPasswordStrength,
  getPasswordRequirements,
} from '@/shared/utils/validation';
import { CheckCircle2 } from 'lucide-react-native';
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

const PasswordStrengthContainer = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const StrengthBar = styled.View`
  height: 4px;
  border-radius: 2px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  overflow: hidden;
`;

const StrengthFill = styled.View<{ strength: number; color: string }>`
  height: 100%;
  width: ${({ strength }: { strength: number }) => {
    switch (strength) {
      case 0:
        return '0%';
      case 1:
        return '25%';
      case 2:
        return '50%';
      case 3:
        return '75%';
      case 4:
        return '100%';
      default:
        return '0%';
    }
  }};
  background-color: ${({ color }: { color: string }) => color};
`;

const RequirementsList = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const RequirementItem = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const Checkbox = styled.View<{ checked: boolean }>`
  width: 20px;
  height: 20px;
  border-width: 2px;
  border-color: ${({ checked, theme }: { checked: boolean; theme: Theme }) =>
    checked ? theme.colors.success : theme.colors.border};
  background-color: ${({ checked, theme }: { checked: boolean; theme: Theme }) =>
    checked ? theme.colors.success : 'transparent'};
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
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

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const resetPasswordMutation = useResetPassword();

  const [token, setToken] = useState(params.token || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      Alert.alert('Invalid Link', 'This password reset link is invalid or has expired.', [
        { text: 'OK', onPress: () => router.replace('/auth/forgot-password') },
      ]);
    }
  }, [token, router]);

  const passwordStrength = getPasswordStrength(password);
  const passwordValidation = validatePassword(password);

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak':
        return theme.colors.error;
      case 'fair':
        return '#ea580c';
      case 'good':
        return '#2563eb';
      case 'strong':
        return theme.colors.success;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  const getStrengthValue = () => {
    switch (passwordStrength) {
      case 'weak':
        return 1;
      case 'fair':
        return 2;
      case 'good':
        return 3;
      case 'strong':
        return 4;
      default:
        return 0;
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) {
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ token, password });
      setSuccess(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to reset password. The link may have expired.'
      );
    }
  };

  if (success) {
    return (
      <Container testID="reset-password-screen">
        <TopBar title="Password Reset" />
        <ScrollContent>
          <Content bottomInset={insets.bottom}>
            <SlideIn delay={200} direction="up" distance={30}>
              <FormCard>
                <SuccessContainer>
                  <IconContainer>
                    <CheckCircle2
                      size={40}
                      color={theme.colors.success}
                      strokeWidth={2}
                      fill={theme.colors.success}
                    />
                  </IconContainer>
                  <Text
                    variant="h2"
                    weight="semibold"
                    style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}
                  >
                    Password Reset Successful
                  </Text>
                  <Text
                    variant="body"
                    color={theme.colors.text.medium}
                    style={{ textAlign: 'center', marginBottom: theme.spacing[4] }}
                  >
                    Your password has been reset successfully. You can now sign in with your new
                    password.
                  </Text>
                </SuccessContainer>
              </FormCard>

              <LinksRow>
                <TextLink
                  onPress={() => router.replace('/auth/login')}
                  activeOpacity={0.7}
                  testID="go-to-login-link"
                >
                  <Text variant="body" weight="semibold" color={theme.colors.primary}>
                    Sign In
                  </Text>
                </TextLink>
              </LinksRow>
            </SlideIn>
          </Content>
        </ScrollContent>
      </Container>
    );
  }

  if (!token) {
    return null;
  }

  const requirements = getPasswordRequirements();
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  return (
    <Container testID="reset-password-screen">
      <TopBar title="Reset Password" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollContent contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Content bottomInset={insets.bottom}>
            <FadeIn delay={100}>
              <Text variant="h2" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
                Create new password
              </Text>
            </FadeIn>

            <SlideIn delay={200} direction="up" distance={30}>
              <Text
                variant="body"
                color={theme.colors.text.medium}
                style={{ marginBottom: theme.spacing[6], textAlign: 'center' }}
              >
                Please enter your new password below.
              </Text>
            </SlideIn>

            <SlideIn delay={300} direction="up" distance={30}>
              <FormCard>
                <Input
                  label="New Password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="Enter new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  error={errors.password}
                  testID="password-input"
                />

                {password.length > 0 && (
                  <PasswordStrengthContainer>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text variant="caption" color={theme.colors.text.medium}>
                        Password strength
                      </Text>
                      <Text variant="caption" weight="medium" color={getStrengthColor()}>
                        {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </Text>
                    </View>
                    <StrengthBar>
                      <StrengthFill strength={getStrengthValue()} color={getStrengthColor()} />
                    </StrengthBar>
                  </PasswordStrengthContainer>
                )}

                <RequirementsList>
                  {requirements.map((req, index) => {
                    const checks = [
                      passwordChecks.length,
                      passwordChecks.uppercase,
                      passwordChecks.lowercase,
                      passwordChecks.number,
                      passwordChecks.special,
                    ];
                    const isMet = checks[index];

                    return (
                      <RequirementItem key={index}>
                        <Checkbox checked={isMet}>
                          {isMet && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                        </Checkbox>
                        <Text
                          variant="caption"
                          color={isMet ? theme.colors.success : theme.colors.text.medium}
                        >
                          {req}
                        </Text>
                      </RequirementItem>
                    );
                  })}
                </RequirementsList>

                <Input
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={text => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  placeholder="Confirm new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  error={errors.confirmPassword}
                  testID="confirm-password-input"
                />

                <TextLink
                  onPress={handleReset}
                  activeOpacity={0.7}
                  disabled={resetPasswordMutation.isPending}
                  testID="reset-button"
                >
                  {resetPasswordMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text variant="body" weight="semibold" color={theme.colors.primary}>
                      Reset Password
                    </Text>
                  )}
                </TextLink>
              </FormCard>
            </SlideIn>
          </Content>
        </ScrollContent>
      </KeyboardAvoidingView>
    </Container>
  );
}
