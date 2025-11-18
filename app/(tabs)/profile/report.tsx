import React, { useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { TopBar } from '@/components/composed/TopBar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { isRequired } from '@/utils/validation';
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

export default function ReportProblemScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isRequired(subject)) {
      newErrors.subject = 'Subject is required';
    }

    if (!isRequired(description)) {
      newErrors.description = 'Please describe the problem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call to submit report
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this issue. We will look into it and get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container testID="report-problem-screen">
      <TopBar title="Report a Problem" />
      <Content>
        <FormCard>
          <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[4] }}>
            Please describe the issue you're experiencing. We'll review it and get back to you as soon as possible.
          </Text>

          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief description of the issue"
            error={errors.subject}
            testID="subject-input"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Please provide as much detail as possible about the problem..."
            multiline
            numberOfLines={8}
            error={errors.description}
            testID="description-input"
          />
        </FormCard>

        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={isSubmitting}
          fullWidth
          testID="submit-report-button"
          style={{ marginTop: theme.spacing[2] }}
        >
          Submit Report
        </Button>
      </Content>
    </Container>
  );
}

