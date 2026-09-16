import React, { useState, useEffect } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { useMonthlyHairstyle, useUpdateMonthlyHairstyle, useDeleteMonthlyHairstyle } from '@/features/planner';
import { TopBar } from '@/shared/components/TopBar';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import { MediaPicker } from '@/shared/components/MediaPicker';
import { ImageWithPlaceholder } from '@/shared/ui/ImageWithPlaceholder';
import { Trash2 } from 'lucide-react-native';
import type { Theme } from '@/shared/theme/ThemeProvider';

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

const DeleteButton = styled(Button)`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.error};
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

export default function EditHairstyleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: hairstyle, isLoading } = useMonthlyHairstyle(id || '');
  const updateHairstyle = useUpdateMonthlyHairstyle(id || '');
  const deleteHairstyle = useDeleteMonthlyHairstyle();

  const [photoUri, setPhotoUri] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);

  useEffect(() => {
    if (hairstyle) {
      setPhotoUri(hairstyle.photoUri);
      setNotes(hairstyle.notes || '');
    }
  }, [hairstyle]);

  const handleImageSelected = (uri: string) => {
    setPhotoUri(uri);
  };

  const handleSubmit = async () => {
    if (!id) return;

    try {
      await updateHairstyle.mutateAsync({
        photoUri,
        thumbnailUri: photoUri, // In a real app, generate thumbnail
        notes: notes || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update hairstyle:', error);
      Alert.alert('Error', 'Failed to update hairstyle. Please try again.');
    }
  };

  const handleDelete = () => {
    if (!id) return;

    Alert.alert(
      'Delete Hairstyle',
      'Are you sure you want to delete this hairstyle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHairstyle.mutateAsync(id);
              router.back();
            } catch (error) {
              console.error('Failed to delete hairstyle:', error);
              Alert.alert('Error', 'Failed to delete hairstyle. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <Container>
        <TopBar title="Edit Hairstyle" />
        <Content>
          <Text>Loading...</Text>
        </Content>
      </Container>
    );
  }

  if (!hairstyle) {
    return (
      <Container>
        <TopBar title="Edit Hairstyle" />
        <Content>
          <Text>Hairstyle not found</Text>
        </Content>
      </Container>
    );
  }

  return (
    <Container testID="edit-hairstyle-screen">
      <TopBar title="Edit Hairstyle" />
      <Content>
        <FormCard>
          <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[3] }}>
            Update your hairstyle photo and notes
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
          loading={updateHairstyle.isPending}
          fullWidth
          testID="update-hairstyle-button"
          style={{ marginTop: theme.spacing[2] }}
        >
          Update Hairstyle
        </Button>

        <DeleteButton
          variant="primary"
          onPress={handleDelete}
          loading={deleteHairstyle.isPending}
          fullWidth
          testID="delete-hairstyle-button"
          style={{ marginTop: theme.spacing[3] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="#fff" strokeWidth={2.5} style={{ marginRight: theme.spacing[2] }} />
            <Text variant="body" weight="semibold" color="#fff">
              Delete Hairstyle
            </Text>
          </View>
        </DeleteButton>
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

