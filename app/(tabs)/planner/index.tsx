import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { MapPin, CreditCard, Calendar as CalendarIcon, Edit, CheckCircle2, Circle, LayoutGrid, Clipboard, Share2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { TopTabs } from '@/components/composed/TopTabs';
import { FloatingActionButton } from '@/components/composed/FloatingActionButton';
import { EmptyState } from '@/components/composed/EmptyState';
import { Text } from '@/components/ui/Text';
import { TreatmentCard } from '@/components/composed/TreatmentCard';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import DaySelector from '@/components/composed/DaySelector';
import { useMoodBoardEntries, useUpdateMoodBoardEntry } from '@/api/hooks/useMoodBoard';
import { useQueryClient } from '@tanstack/react-query';
import { useTreatments } from '@/api/hooks/useTreatments';
import { useAuth } from '@/contexts/AuthContext';
import { shareMoodBoardEntry } from '@/utils/share';
import type { Theme } from '@/theme/ThemeProvider';
import { format } from 'date-fns';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
`;

const CalendarContainer = styled.View<{ topInset: number }>`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  padding-top: ${({ topInset, theme }: { topInset: number; theme: Theme }) => topInset + theme.spacing[3]}px;
`;

const BottomSheetContent = styled.View<{ bottomInset?: number }>`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ bottomInset, theme }: { bottomInset?: number; theme: Theme }) => 
    (bottomInset || 0) + theme.spacing[4] + 80}px;
`;

const CardsList = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  width: 100%;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const PhotosContainer = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  height: 280px;
`;

const MainPhotoContainer = styled.View`
  flex: 0.6;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const SidePhotosContainer = styled.View`
  flex: 0.4;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  height: 100%;
`;

const SidePhotoContainer = styled.View`
  flex: 1;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const Photo = styled(ImageWithPlaceholder)`
  width: 100%;
  height: 100%;
`;

const DetailsSection = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const InfoRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const PriceRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const PriceItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const NotesSection = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const TitleSection = styled.View`
  flex: 1;
`;

const EditButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  align-items: center;
  justify-content: center;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const tabs = [
  { id: 'moodboard', label: 'Mood Board' },
  { id: 'treatments', label: 'Treatments' },
];

export default function PlannerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('moodboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const userId = user?.id || '';

  // Calculate selected month in "YYYY-MM" format
  const selectedMonth = useMemo(() => {
    return format(selectedDate, 'yyyy-MM');
  }, [selectedDate]);

  // Fetch mood board entries filtered by month (only if authenticated)
  const { data: allMoodBoardEntries = [], isLoading: isLoadingMoodBoard, refetch: refetchMoodBoard } = useMoodBoardEntries(userId, selectedMonth, { enabled: isAuthenticated && !!userId });
  const { data: allTreatments = [], isLoading: isLoadingTreatments, refetch: refetchTreatments } = useTreatments(userId, { enabled: isAuthenticated && !!userId });

  // Filter treatments by selected month (client-side)
  const filteredTreatments = useMemo(() => {
    return allTreatments.filter((treatment) => {
      const treatmentMonth = treatment.startDate.split('T')[0].substring(0, 7); // Extract YYYY-MM
      return treatmentMonth === selectedMonth;
    });
  }, [allTreatments, selectedMonth]);

  const moodBoardEntries = allMoodBoardEntries;
  const treatments = filteredTreatments;

  const isLoading = activeTab === 'moodboard' ? isLoadingMoodBoard : isLoadingTreatments;

  // Bottom sheet setup
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  
  // Ensure bottom sheet doesn't go below 50%
  const handleBottomSheetChange = useCallback((index: number) => {
    // Prevent the sheet from going below the first snap point (50%)
    if (index < 0) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, []);


  const handleMoodBoardEdit = (entryId: string) => {
    router.push(`/(tabs)/planner/moodboard/edit/${entryId}` as any);
  };

  const handleTreatmentEdit = (treatmentId: string) => {
    router.push(`/(tabs)/planner/treatments/edit/${treatmentId}` as any);
  };

  const getMonthName = (month: string): string => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return format(date, 'MMMM yyyy');
  };

  // Helper function to get girly pop culture label
  const getSlayLabel = (n: number): string => {
    return `Slay #${n}`;
  };

  const handleFABPress = () => {
    if (activeTab === 'moodboard') {
      router.push('/(tabs)/planner/moodboard/create' as any);
    } else {
      router.push('/(tabs)/planner/treatments/create' as any);
    }
  };

  // Handle toggle completed - moved to component level to avoid hooks violation
  const handleToggleCompleted = useCallback(async (entryId: string, currentStatus: boolean) => {
    try {
      await api.moodBoard.update(entryId, { completed: !currentStatus });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['moodBoard', userId, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['moodBoard', entryId] });
    } catch (error) {
      console.error('Failed to update mood board entry:', error);
    }
  }, [queryClient, userId, selectedMonth]);

  const renderMoodBoard = () => {
    // Show sign-in prompt for unauthenticated users
    if (!isAuthenticated) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: theme.spacing[4],
          paddingBottom: insets.bottom + theme.spacing[4] + 80,
          minHeight: 400 
        }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ 
              width: 120, 
              height: 120, 
              borderRadius: theme.radii.large, 
              backgroundColor: theme.colors.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing[4]
            }}>
              <LayoutGrid size={48} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
              Sign In to Create Your Mood Board
            </Text>
            <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[3], textAlign: 'center' }}>
              Create and manage your personal mood board to track your hairstyle journey. Sign in to get started!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
              style={{ padding: theme.spacing[2] }}
            >
              <Text variant="body" weight="medium" color={theme.colors.primary}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isLoadingMoodBoard) {
      return (
        <BottomSheetContent bottomInset={insets.bottom}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </BottomSheetContent>
      );
    }

    if (moodBoardEntries.length === 0) {
      return (
        <BottomSheetContent bottomInset={insets.bottom}>
          <EmptyState
            title="No Mood Board Entries"
            description={`No mood board entries for ${format(selectedDate, 'MMMM yyyy')}. Start building your hairstyle inspiration board!`}
          />
        </BottomSheetContent>
      );
    }

    // Sort entries by appointment date (earlier first)
    // Filter out entries with invalid appointmentTime and handle them separately
    const validEntries = moodBoardEntries.filter(entry => {
      if (!entry.appointmentTime) return false;
      const date = new Date(entry.appointmentTime);
      return !isNaN(date.getTime());
    });
    
    const invalidEntries = moodBoardEntries.filter(entry => {
      if (!entry.appointmentTime) return true;
      const date = new Date(entry.appointmentTime);
      return isNaN(date.getTime());
    });

    const sortedEntries = [...validEntries].sort((a, b) => {
      const dateA = new Date(a.appointmentTime).getTime();
      const dateB = new Date(b.appointmentTime).getTime();
      return dateA - dateB;
    });

    return (
      <BottomSheetContent bottomInset={insets.bottom}>
        <CardsList>
          {sortedEntries.map((entry, index) => {
            const postNumber = index + 1;
            // Validate appointmentTime before formatting
            let appointmentDate = 'Date not set';
            if (entry.appointmentTime) {
              const date = new Date(entry.appointmentTime);
              if (!isNaN(date.getTime())) {
                appointmentDate = format(date, 'MMM d, yyyy h:mm a');
              }
            }
            const isCompleted = entry.completed ?? false;

            return (
              <View key={entry.id} style={{ marginBottom: theme.spacing[6] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing[2] }}>
                  <Text variant="caption" weight="medium" color={theme.colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    {getSlayLabel(postNumber)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleToggleCompleted(entry.id, isCompleted)}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} color={theme.colors.primary} strokeWidth={2} fill={theme.colors.primary} />
                    ) : (
                      <Circle size={20} color={theme.colors.text.medium} strokeWidth={2} />
                    )}
                    <Text variant="caption" color={isCompleted ? theme.colors.primary : theme.colors.text.medium}>
                      {isCompleted ? 'Done' : 'To Do'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <HeaderRow>
                  <TitleSection>
                    <Text variant="h1" weight="bold" color={theme.colors.text.high}>
                      {entry.name}
                    </Text>
                  </TitleSection>
                  <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                    <EditButton onPress={() => shareMoodBoardEntry(entry)} activeOpacity={0.7}>
                      <Share2 size={20} color={theme.colors.text.high} strokeWidth={2.5} />
                    </EditButton>
                    <EditButton onPress={() => handleMoodBoardEdit(entry.id)} activeOpacity={0.7}>
                      <Edit size={20} color={theme.colors.text.high} strokeWidth={2.5} />
                    </EditButton>
                  </View>
                </HeaderRow>

                {entry.photos.length > 0 && (
                  <View style={{ marginBottom: theme.spacing[4] }}>
                    {entry.photos.length === 1 ? (
                      // Single photo - full width
                      <View style={{ width: '100%', height: 280, borderRadius: theme.radii.medium, overflow: 'hidden', backgroundColor: theme.colors.surfaceVariant }}>
                        <Photo
                          source={{ uri: entry.photos[0] }}
                          resizeMode="cover"
                        />
                      </View>
                    ) : entry.photos.length === 2 ? (
                      // Two photos - side by side
                      <View style={{ flexDirection: 'row', gap: theme.spacing[2], height: 280 }}>
                        <View style={{ flex: 1, borderRadius: theme.radii.medium, overflow: 'hidden', backgroundColor: theme.colors.surfaceVariant }}>
                          <Photo
                            source={{ uri: entry.photos[0] }}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={{ flex: 1, borderRadius: theme.radii.medium, overflow: 'hidden', backgroundColor: theme.colors.surfaceVariant }}>
                          <Photo
                            source={{ uri: entry.photos[1] }}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    ) : (
                      // Three photos - collage layout
                      <PhotosContainer>
                        <MainPhotoContainer>
                          <Photo
                            source={{ uri: entry.photos[0] }}
                            resizeMode="cover"
                          />
                        </MainPhotoContainer>
                        <SidePhotosContainer>
                          {entry.photos[1] && (
                            <SidePhotoContainer>
                              <Photo
                                source={{ uri: entry.photos[1] }}
                                resizeMode="cover"
                              />
                            </SidePhotoContainer>
                          )}
                          {entry.photos[2] && (
                            <SidePhotoContainer>
                              <Photo
                                source={{ uri: entry.photos[2] }}
                                resizeMode="cover"
                              />
                            </SidePhotoContainer>
                          )}
                        </SidePhotosContainer>
                      </PhotosContainer>
                    )}
                  </View>
                )}

                <DetailsSection>
                  <PriceRow>
                    <PriceItem>
                      <CreditCard size={20} color={theme.colors.text.high} strokeWidth={2} />
                      <Text variant="h3" weight="semibold" color={theme.colors.text.high}>
                        Stylist: ${entry.stylistPrice}
                      </Text>
                    </PriceItem>
                    <PriceItem>
                      <CreditCard size={20} color={theme.colors.text.high} strokeWidth={2} />
                      <Text variant="h3" weight="semibold" color={theme.colors.text.high}>
                        Hair: ${entry.hairPrice}
                      </Text>
                    </PriceItem>
                  </PriceRow>

                  <InfoRow>
                    <MapPin size={20} color={theme.colors.text.medium} strokeWidth={2} />
                    <Text variant="body" color={theme.colors.text.high}>
                      {entry.stylistLocation}
                    </Text>
                  </InfoRow>

                  <InfoRow>
                    <CalendarIcon size={20} color={theme.colors.text.medium} strokeWidth={2} />
                    <Text variant="body" color={theme.colors.text.high}>
                      {appointmentDate}
                    </Text>
                  </InfoRow>

                  {entry.notes && (
                    <NotesSection>
                      <Text variant="body" weight="medium" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[2] }}>
                        Notes
                      </Text>
                      <Text variant="body" color={theme.colors.text.medium}>
                        {entry.notes}
                      </Text>
                    </NotesSection>
                  )}
                </DetailsSection>
              </View>
            );
          })}
        </CardsList>
      </BottomSheetContent>
    );
  };

  const renderTreatments = () => {
    // Show sign-in prompt for unauthenticated users
    if (!isAuthenticated) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: theme.spacing[4], 
          paddingBottom: insets.bottom + theme.spacing[4] + 80,
          minHeight: 400 
        }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ 
              width: 120, 
              height: 120, 
              borderRadius: theme.radii.large, 
              backgroundColor: theme.colors.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing[4]
            }}>
              <Clipboard size={48} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[2], textAlign: 'center' }}>
              Sign In to Track Treatments
            </Text>
            <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[3], textAlign: 'center' }}>
              Create and manage your hair treatment schedule. Sign in to get started!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
              style={{ padding: theme.spacing[2] }}
            >
              <Text variant="body" weight="medium" color={theme.colors.primary}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isLoadingTreatments) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (treatments.length === 0) {
      return (
        <View style={{ padding: theme.spacing[4] }}>
          <EmptyState
            title="No Treatments"
            description={`No treatments scheduled for ${format(selectedDate, 'MMMM yyyy')}. Create your first hair treatment plan!`}
          />
        </View>
      );
    }

    return (
      <View style={{ padding: theme.spacing[4] }}>
        {treatments.map((treatment) => (
          <TreatmentCard
            key={treatment.id}
            treatment={treatment}
            onEdit={() => handleTreatmentEdit(treatment.id)}
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <Container testID="planner-screen">
        <CalendarContainer topInset={insets.top}>
          <DaySelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        </CalendarContainer>
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          index={0}
          onChange={handleBottomSheetChange}
          enablePanDownToClose={false}
          enableOverDrag={false}
          animateOnMount={true}
          bottomInset={0}
          backgroundStyle={{ backgroundColor: theme.colors.background }}
          handleIndicatorStyle={{ backgroundColor: theme.colors.primary }}
        >
          <TopTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <BottomSheetScrollView
            contentContainerStyle={{ 
              paddingBottom: insets.bottom + 100,
            }}
            showsVerticalScrollIndicator={true}
          >
            {activeTab === 'moodboard' ? renderMoodBoard() : renderTreatments()}
          </BottomSheetScrollView>
        </BottomSheet>
      </Container>
      {isAuthenticated && (
        <FloatingActionButton
          onPress={handleFABPress}
          testID="create-fab"
        />
      )}
    </>
  );
}
