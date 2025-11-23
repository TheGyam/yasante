import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useCreateGoal } from '@/api/hooks/useGoals';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/composed/TopBar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { isRequired, isFutureDate } from '@/utils/validation';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const FormCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

export default function GoalCreateScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const createGoal = useCreateGoal(user?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [successMetric, setSuccessMetric] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isRequired(name)) {
      newErrors.name = 'Goal name is required';
    }

    if (targetDate && !isFutureDate(targetDate)) {
      newErrors.targetDate = 'Target date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (!user?.id) {
        console.error('User not authenticated');
        return;
      }
      await createGoal.mutateAsync({
        name,
        description: description || undefined,
        targetDate: targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        successMetric: successMetric || undefined,
        status: 'active',
        progress: 0,
      });
      router.back();
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  return (
    <Container testID="create-goal-screen">
      <TopBar title="Create Goal" />
      <Content>
        <FormCard>
          <Input
            label="Goal Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Grow hair to shoulder length"
            error={errors.name}
            testID="goal-name-input"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Add more details about your goal"
            multiline
            numberOfLines={3}
            testID="goal-description-input"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <Input
            label="Target Date (Optional)"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            error={errors.targetDate}
            testID="goal-date-input"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <Input
            label="Success Metric (Optional)"
            value={successMetric}
            onChangeText={setSuccessMetric}
            placeholder="How will you measure success?"
            testID="goal-metric-input"
          />
        </FormCard>

        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={createGoal.isPending}
          fullWidth
          testID="create-goal-button"
          style={{ marginTop: theme.spacing[2] }}
        >
          Create Goal
        </Button>
      </Content>
    </Container>
  );
}

