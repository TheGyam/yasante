import React, { useState } from 'react';
import {
  ScrollView,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Input } from '@/shared/legacy/ui/Input';
import { Text } from '@/shared/legacy/ui/Text';
import { Card } from '@/shared/legacy/ui/Card';
import { TopBar } from '@/shared/legacy/components/TopBar';
import { FadeIn } from '@/shared/legacy/animations/FadeIn';
import { SlideIn } from '@/shared/legacy/animations/SlideIn';
import { useSignup } from '@/features/auth';
import {
  isValidEmail,
  isRequired,
  validatePassword,
  getPasswordStrength,
  getPasswordRequirements,
} from '@/shared/utils/validation';
import { useConsentStore } from '@/shared/config/consentStore';
import { TERMS_URL, PRIVACY_URL } from '@/shared/config/policies';
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

const CheckIcon = styled.Text`
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  font-size: 14px;
`;

const TermsRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const Checkbox = styled.TouchableOpacity<{ checked: boolean }>`
  width: 20px;
  height: 20px;
  border-width: 2px;
  border-color: ${({ checked, theme }: { checked: boolean; theme: Theme }) =>
    checked ? theme.colors.primary : theme.colors.border};
  background-color: ${({ checked, theme }: { checked: boolean; theme: Theme }) =>
    checked ? theme.colors.primary : 'transparent'};
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-top: 2px;
`;

const ErrorText = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const LinksRow = styled.View`
  flex-direction: row;
  justify-content: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

export default function SignupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signupMutation = useSignup();
  const setConsent = useConsentStore(state => state.setConsent);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

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

    if (!isRequired(name)) {
      newErrors.name = 'Name is required';
    }

    if (!isRequired(email)) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isRequired(password)) {
      newErrors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    if (!isRequired(confirmPassword)) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    setGeneralError('');

    if (!validate()) {
      return;
    }

    try {
      await signupMutation.mutateAsync({
        name,
        email,
        password,
        password_confirm: confirmPassword,
      });
      // Record what they agreed to, against the version they saw.
      setConsent('terms', true);
      setConsent('privacy', true);
      // Navigation will be handled by AuthContext
    } catch (error: any) {
      // Handle API error responses
      const errorMessage =
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.message ||
        error?.message ||
        'Signup failed. Please try again.';
      setGeneralError(errorMessage);
    }
  };

  const requirements = getPasswordRequirements();
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  return (
    <Container testID="signup-screen">
      <TopBar title="Create Account" showBack={false} />
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
                Join the journey
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
                  label="Name"
                  value={name}
                  onChangeText={text => {
                    setName(text);
                    if (errors.name) setErrors({ ...errors, name: '' });
                    setGeneralError('');
                  }}
                  placeholder="Enter your name"
                  autoCapitalize="words"
                  error={errors.name}
                  testID="name-input"
                />

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
                  placeholder="Create a password"
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
                        <Checkbox checked={isMet} onPress={() => {}} disabled>
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
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={text => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    setGeneralError('');
                  }}
                  placeholder="Confirm your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  error={errors.confirmPassword}
                  testID="confirm-password-input"
                />

                <TermsRow>
                  <Checkbox
                    checked={acceptedTerms}
                    onPress={() => {
                      setAcceptedTerms(!acceptedTerms);
                      if (errors.terms) setErrors({ ...errors, terms: '' });
                    }}
                  >
                    {acceptedTerms && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                  </Checkbox>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={theme.colors.text.medium}>
                      I agree to the{' '}
                      <Text
                        variant="caption"
                        weight="medium"
                        color={theme.colors.primary}
                        onPress={() => Linking.openURL(TERMS_URL)}
                      >
                        Terms of Service
                      </Text>{' '}
                      and{' '}
                      <Text
                        variant="caption"
                        weight="medium"
                        color={theme.colors.primary}
                        onPress={() => Linking.openURL(PRIVACY_URL)}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </View>
                </TermsRow>
                {errors.terms && (
                  <ErrorText variant="caption" color={theme.colors.error}>
                    {errors.terms}
                  </ErrorText>
                )}

                <TextLink
                  onPress={handleSignup}
                  activeOpacity={0.7}
                  disabled={signupMutation.isPending}
                  testID="signup-button"
                >
                  {signupMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text variant="body" weight="semibold" color={theme.colors.primary}>
                      Create Account
                    </Text>
                  )}
                </TextLink>
              </FormCard>

              <LinksRow>
                <Text variant="body" color={theme.colors.text.medium}>
                  Already have an account?{' '}
                </Text>
                <TextLink
                  onPress={() => router.push('/auth/login')}
                  activeOpacity={0.7}
                  testID="login-link"
                >
                  <Text variant="body" weight="medium" color={theme.colors.primary}>
                    Sign In
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
