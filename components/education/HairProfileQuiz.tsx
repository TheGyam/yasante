import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { mockQuizQuestions } from '@/constants/mockData';
import { HairProfile } from '@/types/user';
import { responsive } from '@/utils/responsive';
import { FadeInView } from '@/components/animations/FadeIn';
import { ScaleInView } from '@/components/animations/ScaleIn';

interface QuizAnswers {
  type?: string;
  texture?: string;
  porosity?: string;
  density?: string;
  concerns: string[];
  goals: string[];
}

export const HairProfileQuiz: React.FC<{ onComplete?: () => void }> = ({
  onComplete,
}) => {
  const { theme } = useTheme();
  const { updateHairProfile, user } = useUserStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    concerns: [],
    goals: [],
  });

  const questions = mockQuizQuestions;
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleAnswer = (value: string | string[]) => {
    if (currentQuestion.type === 'multiple') {
      const currentAnswers = answers[currentQuestion.category as keyof QuizAnswers] as string[] || [];
      const newAnswers = currentAnswers.includes(value as string)
        ? currentAnswers.filter((a) => a !== value)
        : [...currentAnswers, value as string];
      
      setAnswers({
        ...answers,
        [currentQuestion.category]: newAnswers,
      });
    } else {
      setAnswers({
        ...answers,
        [currentQuestion.category]: value,
      });
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      // Complete quiz
      const profile: HairProfile = {
        type: answers.type as any,
        texture: answers.texture as any,
        porosity: answers.porosity as any,
        density: answers.density as any,
        mainConcerns: answers.concerns,
        goals: answers.goals,
      };
      updateHairProfile(profile);
      onComplete?.();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentAnswer = () => {
    const category = currentQuestion.category;
    if (category === 'concerns' || category === 'goals') {
      return answers[category] || [];
    }
    return answers[category as keyof QuizAnswers];
  };

  const canProceed = () => {
    const answer = getCurrentAnswer();
    if (currentQuestion.type === 'multiple') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined && answer !== '';
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing[4] }}
      >
        {/* Progress Indicator */}
        <FadeInView delay={100}>
          <View
            style={{
              flexDirection: 'row',
              marginBottom: theme.spacing[6],
            }}
          >
            {questions.map((_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor:
                    index <= currentStep
                      ? theme.colors.primary
                      : theme.colors.border,
                  marginRight: index < questions.length - 1 ? theme.spacing[1] : 0,
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
        </FadeInView>

        {/* Question */}
        <FadeInView delay={200}>
          <Text
            style={{
              fontSize: responsive.fontScale(theme.typography.fontSize['2xl']),
              fontFamily: theme.typography.fontFamily.bold,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing[2],
            }}
          >
            {currentQuestion.question}
          </Text>
          <Text
            style={{
              fontSize: responsive.fontScale(theme.typography.fontSize.sm),
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[6],
            }}
          >
            Step {currentStep + 1} of {questions.length}
          </Text>
        </FadeInView>

        {/* Options */}
        <View style={{ marginBottom: theme.spacing[6] }}>
          {currentQuestion.options.map((option, index) => {
            const currentAnswer = getCurrentAnswer();
            const isSelected =
              currentQuestion.type === 'multiple'
                ? (currentAnswer as string[])?.includes(option.value)
                : currentAnswer === option.value;

            return (
              <ScaleInView key={option.id} delay={index * 50}>
                <TouchableOpacity
                  onPress={() => handleAnswer(option.value)}
                  style={{ marginBottom: theme.spacing[3] }}
                >
                  <Card
                    variant={isSelected ? 'elevated' : 'outlined'}
                    padding="md"
                    style={{
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: isSelected
                        ? theme.colors.primary + '10'
                        : theme.colors.surface,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: responsive.fontScale(
                            theme.typography.fontSize.base
                          ),
                          fontFamily: theme.typography.fontFamily.regular,
                          color: theme.colors.text,
                        }}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: theme.colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: theme.spacing[2],
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.background,
                              fontSize: 16,
                              fontWeight: 'bold',
                            }}
                          >
                            ✓
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              </ScaleInView>
            );
          })}
        </View>

        {/* Navigation Buttons */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing[3],
            marginTop: theme.spacing[4],
          }}
        >
          {currentStep > 0 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              size="md"
              style={{ flex: 1 }}
            />
          )}
          <Button
            title={isLastStep ? 'Complete' : 'Next'}
            onPress={handleNext}
            size="md"
            disabled={!canProceed()}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

