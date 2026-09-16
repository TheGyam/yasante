import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { BrutalistInput } from '@/features/planner';
import { isRequired } from '@/shared/utils/validation';

export default function ReportProblemScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!isRequired(subject)) newErrors.subject = 'Subject is required';
    if (!isRequired(description)) newErrors.description = 'Please describe the problem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this issue. We will look into it and get back to you soon.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="report-problem-screen"
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.background,
          borderBottomWidth: 4,
          borderBottomColor: theme.colors.border,
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text
            variant="h3"
            weight="bold"
            color={theme.colors.text.high}
            style={{ fontSize: 20, textTransform: 'uppercase', fontStyle: 'italic' }}
          >
            Report Issue
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 3,
              borderColor: theme.colors.text.high,
              borderRadius: 16,
              padding: 16,
              marginBottom: 32,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 4,
            }}
          >
            <Text variant="body" color={theme.colors.text.high} style={{ lineHeight: 22 }}>
              Describe the issue you're experiencing. We'll review it and get back to you soon.
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            <View>
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.text.high}
                style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Subject
              </Text>
              <BrutalistInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of the issue"
              />
              {errors.subject && (
                <Text
                  variant="caption"
                  color={theme.colors.accentSecondary}
                  style={{ marginTop: 4 }}
                >
                  {errors.subject}
                </Text>
              )}
            </View>

            <View>
              <Text
                variant="caption"
                weight="bold"
                color={theme.colors.text.high}
                style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Details
              </Text>
              <BrutalistInput
                value={description}
                onChangeText={setDescription}
                placeholder="Provide as much detail as possible..."
                multiline
                numberOfLines={6}
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
              {errors.description && (
                <Text
                  variant="caption"
                  color={theme.colors.accentSecondary}
                  style={{ marginTop: 4 }}
                >
                  {errors.description}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: 20,
          right: 20,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
          style={{
            backgroundColor: theme.colors.primary,
            borderWidth: 4,
            borderColor: theme.colors.text.high,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: isSubmitting ? 0.6 : 1,
            shadowColor: theme.colors.text.high,
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 8,
          }}
        >
          <Text
            variant="body"
            weight="bold"
            color={theme.colors.surface}
            style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}
          >
            {isSubmitting ? 'Sending...' : 'Submit Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
