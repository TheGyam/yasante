import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import { ImageWithPlaceholder } from '@/shared/ui/ImageWithPlaceholder';
import { useMoodBoardEntries, useAddPhotoToMoodBoardEntry } from '@/features/planner';
import { useAuth } from '@/features/auth';
import { LayoutGrid, Plus, X } from 'lucide-react-native';
import { format } from 'date-fns';
import { Alert } from 'react-native';
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
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
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

const EntryCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  flex-direction: row;
  align-items: center;
`;

const EntryImage = styled.View`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const EntryInfo = styled.View`
  flex: 1;
`;

const CreateNewCard = styled(Card)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  align-items: center;
  border-width: 2px;
  border-style: dashed;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
`;

const CreateNewContent = styled.View`
  align-items: center;
`;

const EmptyState = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
  align-items: center;
`;

interface AddToMoodBoardModalProps {
  visible: boolean;
  onClose: () => void;
  inspoTitle: string;
  inspoImageUri?: string;
  onAddToExisting?: (entryId: string) => void;
  onCreateNew?: () => void;
}

export function AddToMoodBoardModal({
  visible,
  onClose,
  inspoTitle,
  inspoImageUri,
  onAddToExisting,
  onCreateNew,
}: AddToMoodBoardModalProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const userId = user?.id || '';

  // Fetch all moodboard entries (not filtered by month)
  const { data: allEntries = [], isLoading } = useMoodBoardEntries(userId, undefined, {
    enabled: isAuthenticated && !!userId && visible,
  });

  const addPhotoMutation = useAddPhotoToMoodBoardEntry(userId);

  const snapPoints = useMemo(() => ['75%'], []);

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSelectEntry = async (entryId: string) => {
    if (!inspoImageUri) {
      Alert.alert('Error', 'No image to add');
      return;
    }

    if (onAddToExisting) {
      onAddToExisting(entryId);
    } else {
      try {
        await addPhotoMutation.mutateAsync({
          entryId,
          photoUri: inspoImageUri,
        });
        Alert.alert('Success', 'Photo added to mood board entry');
        onClose();
      } catch (error) {
        Alert.alert('Error', 'Failed to add photo to mood board entry');
      }
    }
  };

  const handleCreateNew = () => {
    onClose();
    if (onCreateNew) {
      onCreateNew();
    } else {
      // Navigate to create screen with pre-filled data
      const params = new URLSearchParams({
        name: inspoTitle,
        ...(inspoImageUri && { mainPhotoUri: inspoImageUri }),
      });
      router.push(`/(tabs)/planner/moodboard/create?${params.toString()}` as any);
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
            <Header>
              <Text variant="h2" weight="bold" style={{ marginBottom: theme.spacing[2] }}>
                Add to Mood Board
              </Text>
              <Text variant="body" color={theme.colors.text.medium}>
                Choose an existing entry or create a new one
              </Text>
            </Header>

            {isLoading ? (
              <View style={{ padding: theme.spacing[6], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : allEntries.length === 0 ? (
              <EmptyState>
                <LayoutGrid size={48} color={theme.colors.text.low} strokeWidth={2} />
                <Text
                  variant="body"
                  color={theme.colors.text.medium}
                  style={{ marginTop: theme.spacing[2], textAlign: 'center' }}
                >
                  No mood board entries yet
                </Text>
              </EmptyState>
            ) : (
              <>
                <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>
                  Existing Entries
                </Text>
                {allEntries.map(entry => {
                  const appointmentDate = format(new Date(entry.appointmentTime), 'MMM d, yyyy');
                  const canAddPhoto = entry.photos.length < 3;

                  return (
                    <EntryCard
                      key={entry.id}
                      onPress={() => canAddPhoto && handleSelectEntry(entry.id)}
                      style={{
                        opacity: canAddPhoto ? 1 : 0.5,
                      }}
                    >
                      <EntryImage>
                        {entry.mainPhotoUri ? (
                          <ImageWithPlaceholder
                            source={{ uri: entry.mainPhotoUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={{
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <LayoutGrid size={24} color={theme.colors.text.low} strokeWidth={2} />
                          </View>
                        )}
                      </EntryImage>
                      <EntryInfo>
                        <Text variant="body" weight="semibold" numberOfLines={1}>
                          {entry.name}
                        </Text>
                        <Text
                          variant="caption"
                          color={theme.colors.text.medium}
                          style={{ marginTop: theme.spacing[1] }}
                        >
                          {appointmentDate}
                        </Text>
                        {!canAddPhoto && (
                          <Text
                            variant="caption"
                            color={theme.colors.text.low}
                            style={{ marginTop: theme.spacing[1] }}
                          >
                            Maximum photos reached
                          </Text>
                        )}
                      </EntryInfo>
                    </EntryCard>
                  );
                })}
              </>
            )}

            <CreateNewCard onPress={handleCreateNew}>
              <CreateNewContent>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.colors.accentLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: theme.spacing[2],
                  }}
                >
                  <Plus size={24} color={theme.colors.primary} strokeWidth={2.5} />
                </View>
                <Text variant="body" weight="semibold" color={theme.colors.primary}>
                  Create New Entry
                </Text>
                <Text
                  variant="caption"
                  color={theme.colors.text.medium}
                  style={{ marginTop: theme.spacing[1], textAlign: 'center' }}
                >
                  Start a new mood board entry
                </Text>
              </CreateNewContent>
            </CreateNewCard>
          </BottomSheetScrollView>
        </ContentContainer>
      </BottomSheet>
    </>
  );
}
