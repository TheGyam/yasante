import React, { useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useCreateMonthlyHairstyle } from '@/api/hooks/useMonthlyHairstyles';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/composed/TopBar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { MediaPicker } from '@/components/composed/MediaPicker';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
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

const ImagePreview = styled.View`
  width: 100%;
  height: 300px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const ImageButton = styled.TouchableOpacity`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const ImageButtonText = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.medium};
`;

// Helper function to get month name
const getMonthName = (monthKey: string): string => {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[monthIndex]} ${yearStr}`;
};

export default function AddHairstyleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { month } = useLocalSearchParams<{ month: string }>();
  const { user } = useAuth();
  const createHairstyle = useCreateMonthlyHairstyle(user?.id);

  const [photoUri, setPhotoUri] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!photoUri) {
      newErrors.photo = 'Photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelected = (uri: string) => {
    setPhotoUri(uri);
    setErrors((prev) => ({ ...prev, photo: '' }));
  };

  const handleSubmit = async () => {
    if (!validate() || !month) return;

    try {
      if (!user?.id) {
        console.error('User not authenticated');
        return;
      }
      await createHairstyle.mutateAsync({
        month,
        photoUri,
        thumbnailUri: photoUri, // In a real app, generate thumbnail
        notes: notes || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to create hairstyle:', error);
      Alert.alert('Error', 'Failed to save hairstyle. Please try again.');
    }
  };

  return (
    <Container testID="add-hairstyle-screen">
      <TopBar title={`Add Hairstyle - ${month ? getMonthName(month) : ''}`} />
      <Content>
        <FormCard>
          <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[3] }}>
            Add a photo of the hairstyle you want for this month
          </Text>

          {photoUri ? (
            <ImagePreview>
              <ImageWithPlaceholder
                source={{ uri: photoUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <ImageButton
                onPress={() => setIsMediaPickerVisible(true)}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                activeOpacity={0.8}
              >
                <View style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: theme.spacing[2],
                  borderRadius: theme.radii.small,
                }}>
                  <Text variant="body" weight="medium" color="#fff">
                    Change Photo
                  </Text>
                </View>
              </ImageButton>
            </ImagePreview>
          ) : (
            <ImageButton onPress={() => setIsMediaPickerVisible(true)} activeOpacity={0.7}>
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: theme.colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing[2],
                }}>
                  <Text style={{ fontSize: 32, color: theme.colors.text.low }}>+</Text>
                </View>
                <ImageButtonText variant="body" weight="medium">
                  Tap to add photo
                </ImageButtonText>
                {errors.photo && (
                  <Text variant="caption" color={theme.colors.error} style={{ marginTop: theme.spacing[1] }}>
                    {errors.photo}
                  </Text>
                )}
              </View>
            </ImageButton>
          )}

          <Input
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g., Curly bob with highlights"
            multiline
            numberOfLines={3}
            testID="hairstyle-notes-input"
            style={{ marginTop: theme.spacing[3] }}
          />
        </FormCard>

        <Button
          variant="primary"
          onPress={handleSubmit}
          loading={createHairstyle.isPending}
          fullWidth
          testID="save-hairstyle-button"
          style={{ marginTop: theme.spacing[2] }}
        >
          Save Hairstyle
        </Button>
      </Content>

      <MediaPicker
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onImageSelected={handleImageSelected}
        testID="hairstyle-media-picker"
      />
    </Container>
  );
}

