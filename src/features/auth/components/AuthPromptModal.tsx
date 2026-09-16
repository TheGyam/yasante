import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import { FadeIn } from '@/shared/animations/FadeIn';
import { Heart, Calendar, Sparkles, X } from 'lucide-react-native';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Overlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
`;

const ContentContainer = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const Header = styled.View`
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const CloseButton = styled(TouchableOpacity)`
  position: absolute;
  top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  right: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const FeatureCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const IconContainer = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.accentLight};
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const FeatureContent = styled.View`
  flex: 1;
`;

const TextLink = styled.TouchableOpacity`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const SecondaryTextLink = styled.TouchableOpacity`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ActionsContainer = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: 'moodboard' | 'favorites' | 'profile' | 'general';
}

export function AuthPromptModal({ visible, onClose, feature = 'general' }: AuthPromptModalProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['75%'], []);

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSignUp = () => {
    onClose();
    router.push('/auth/signup');
  };

  const handleSignIn = () => {
    onClose();
    router.push('/auth/login');
  };

  const features = [
    {
      icon: <Calendar size={24} color={theme.colors.primary} strokeWidth={2} />,
      title: 'Plan Your Looks',
      description: 'Create mood boards and track your hairstyle journey',
    },
    {
      icon: <Heart size={24} color={theme.colors.primary} strokeWidth={2} fill={theme.colors.primary} />,
      title: 'Save Favorites',
      description: 'Save your favorite inspiration and education content',
    },
    {
      icon: <Sparkles size={24} color={theme.colors.primary} strokeWidth={2} />,
      title: 'Personalized Experience',
      description: 'Get tailored recommendations based on your hair profile',
    },
  ];

  const getTitle = () => {
    switch (feature) {
      case 'moodboard':
        return 'Create Your Mood Board';
      case 'favorites':
        return 'Save Your Favorites';
      case 'profile':
        return 'Access Your Profile';
      default:
        return 'Join Yasante';
    }
  };

  const getDescription = () => {
    switch (feature) {
      case 'moodboard':
        return 'Sign up to create and manage your personal mood board for tracking your hairstyle journey.';
      case 'favorites':
        return 'Sign up to save your favorite inspiration and education content for easy access later.';
      case 'profile':
        return 'Sign up to access your personal profile, track your progress, and customize your experience.';
      default:
        return 'Sign up to unlock all features and personalize your hair care journey.';
    }
  };

  if (!visible) return null;

  return (
    <>
      <Overlay />
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ backgroundColor: theme.colors.background }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.primary }}
        bottomInset={insets.bottom}
      >
        <ContentContainer>
          <CloseButton onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={theme.colors.text.high} strokeWidth={2.5} />
          </CloseButton>

          <BottomSheetScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: insets.bottom + 80,
            }}
          >
            <FadeIn delay={100}>
              <Header>
                <Text variant="h1" weight="bold" color={theme.colors.primary} style={{ marginBottom: theme.spacing[2] }}>
                  {getTitle()}
                </Text>
                <Text variant="body" color={theme.colors.text.medium} style={{ textAlign: 'center' }}>
                  {getDescription()}
                </Text>
              </Header>
            </FadeIn>

            <FadeIn delay={200}>
              <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>
                What you'll get:
              </Text>

              {features.map((feat, index) => (
                <FeatureCard key={index}>
                  <IconContainer>
                    {feat.icon}
                  </IconContainer>
                  <FeatureContent>
                    <Text variant="body" weight="semibold" style={{ marginBottom: theme.spacing[1] }}>
                      {feat.title}
                    </Text>
                    <Text variant="caption" color={theme.colors.text.medium}>
                      {feat.description}
                    </Text>
                  </FeatureContent>
                </FeatureCard>
              ))}
            </FadeIn>

            <FadeIn delay={300}>
              <ActionsContainer>
                <TextLink
                  onPress={handleSignUp}
                  activeOpacity={0.7}
                  testID="signup-button"
                >
                  <Text variant="body" weight="semibold" color={theme.colors.primary}>
                    Sign Up
                  </Text>
                </TextLink>

                <SecondaryTextLink
                  onPress={handleSignIn}
                  activeOpacity={0.7}
                  testID="signin-button"
                >
                  <Text variant="body" weight="medium" color={theme.colors.text.high}>
                    Already have an account? Sign In
                  </Text>
                </SecondaryTextLink>

                <SecondaryTextLink
                  onPress={onClose}
                  activeOpacity={0.7}
                  testID="continue-browsing-button"
                >
                  <Text variant="body" color={theme.colors.text.medium}>
                    Continue Browsing
                  </Text>
                </SecondaryTextLink>
              </ActionsContainer>
            </FadeIn>
          </BottomSheetScrollView>
        </ContentContainer>
      </BottomSheet>
    </>
  );
}

