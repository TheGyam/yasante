import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/hooks/useTheme';
import { useUserStore } from '@/features/profile';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { FadeIn } from '@/shared/animations/FadeIn';
import { SlideIn } from '@/shared/animations/SlideIn';

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { onboardingCompleted, setOnboardingCompleted } = useUserStore();

  useEffect(() => {
    if (onboardingCompleted) {
      router.replace('/(tabs)/home');
    }
  }, [onboardingCompleted]);

  const handleGetStarted = () => {
    router.push('/onboarding/quiz');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing[6],
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <FadeIn delay={100}>
        <Text variant="h1" color={theme.colors.primary} style={{ marginBottom: theme.spacing[4] }}>
          Yasante
        </Text>
      </FadeIn>

      <SlideIn delay={200} direction="up" distance={30}>
        <Text variant="h2" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
          Your Personal Hair Care Journey
        </Text>
        <Text
          variant="body"
          color={theme.colors.text.medium}
          style={{ marginBottom: theme.spacing[6], textAlign: 'center' }}
        >
          Plan your hair goals, track your progress, and learn personalized care tips
        </Text>
      </SlideIn>

      <SlideIn delay={400} direction="up" distance={30}>
        <Button variant="primary" onPress={handleGetStarted} fullWidth>
          Get Started
        </Button>
      </SlideIn>
    </View>
  );
}
