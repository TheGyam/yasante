import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useUpdateHairProfile } from '@/api/hooks/useUser';
import { useUserStore } from '@/state/stores/userStore';
import { TopBar } from '@/components/composed/TopBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { HairTexture, HairDensity, HairPorosity, HairGoal } from '@/types/user';
import { FadeIn } from '@/components/animations/FadeIn';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }) => theme.spacing[4]}px;
`;

const QuestionCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing[4]}px;
`;

const OptionButton = styled(Button)<{ selected: boolean }>`
  margin-bottom: ${({ theme }) => theme.spacing[2]}px;
  background-color: ${({ theme, selected }) =>
    selected ? theme.colors.primary : theme.colors.surface};
`;

const ProgressBar = styled.View`
  height: 4px;
  background-color: ${({ theme }) => theme.colors.surfaceVariant};
  border-radius: 2px;
  margin-bottom: ${({ theme }) => theme.spacing[4]}px;
`;

const ProgressFill = styled.View<{ progress: number }>`
  height: 100%;
  width: ${({ progress }) => progress}%;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 2px;
`;

const steps = [
  { key: 'texture', question: 'What is your hair texture?', options: ['straight', 'wavy', 'curly', 'coily', 'kinky'] },
  { key: 'density', question: 'What is your hair density?', options: ['fine', 'medium', 'thick'] },
  { key: 'porosity', question: 'What is your hair porosity?', options: ['low', 'medium', 'high'] },
  { key: 'goals', question: 'What are your hair goals? (Select all that apply)', options: ['growth', 'health', 'moisture', 'strength', 'color', 'style'], multiple: true },
];

export default function QuizScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { setOnboardingCompleted } = useUserStore();
  const updateHairProfile = useUpdateHairProfile();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleOptionSelect = (option: string) => {
    const step = steps[currentStep];
    if (step.multiple) {
      const current = answers[step.key] || [];
      const updated = current.includes(option)
        ? current.filter((o: string) => o !== option)
        : [...current, option];
      setAnswers({ ...answers, [step.key]: updated });
    } else {
      setAnswers({ ...answers, [step.key]: option });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await updateHairProfile.mutateAsync({
        texture: answers.texture as HairTexture,
        density: answers.density as HairDensity,
        porosity: answers.porosity as HairPorosity,
        goals: answers.goals as HairGoal[],
        completedAt: new Date().toISOString(),
      });
      setOnboardingCompleted(true);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to save hair profile:', error);
    }
  };

  const currentStepData = steps[currentStep];
  const canProceed = currentStepData.multiple
    ? (answers[currentStepData.key] || []).length > 0
    : !!answers[currentStepData.key];

  return (
    <Container testID="quiz-screen">
      <TopBar title="Hair Profile Quiz" />
      <Content>
        <ProgressBar>
          <ProgressFill progress={progress} />
        </ProgressBar>

        <FadeIn>
          <QuestionCard>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[4] }}>
              {currentStepData.question}
            </Text>

            {currentStepData.options.map((option) => {
              const isSelected = currentStepData.multiple
                ? (answers[currentStepData.key] || []).includes(option)
                : answers[currentStepData.key] === option;

              return (
                <OptionButton
                  key={option}
                  variant={isSelected ? 'primary' : 'outline'}
                  onPress={() => handleOptionSelect(option)}
                  selected={isSelected}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </OptionButton>
              );
            })}
          </QuestionCard>

          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onPress={() => setCurrentStep(currentStep - 1)}
                style={{ flex: 1 }}
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              onPress={handleNext}
              disabled={!canProceed}
              style={{ flex: 1 }}
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </View>
        </FadeIn>
      </Content>
    </Container>
  );
}


