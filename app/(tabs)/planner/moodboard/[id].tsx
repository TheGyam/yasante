import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { ArrowLeft, MapPin, DollarSign, Calendar, Edit } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useMoodBoardEntry } from '@/api/hooks/useMoodBoard';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/theme/ThemeProvider';
import { format } from 'date-fns';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Header = styled.View<{ topInset: number }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ topInset, theme }: { topInset: number; theme: Theme }) => topInset + theme.spacing[3]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
`;

const BackButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
  border-width: 1px;
  border-color: rgba(0, 0, 0, 0.05);
`;

const EditButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
  border-width: 1px;
  border-color: rgba(0, 0, 0, 0.05);
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[4] + 60}px;
`;

const PhotosContainer = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const PhotoContainer = styled.View`
  width: 100%;
  height: 300px;
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

const getMonthName = (month: string): string => {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return format(date, 'MMMM yyyy');
};

export default function MoodBoardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: entry, isLoading } = useMoodBoardEntry(id || '');

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push(`/(tabs)/planner/moodboard/edit/${id}` as any);
  };

  if (isLoading || !entry) {
    return (
      <Container>
        <Header topInset={insets.top}>
          <BackButton onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
          </BackButton>
        </Header>
        <Content>
          <Text>Loading...</Text>
        </Content>
      </Container>
    );
  }

  const monthName = getMonthName(entry.month);
  const appointmentDate = format(new Date(entry.appointmentTime), 'MMM d, yyyy h:mm a');

  return (
    <Container
      testID="moodboard-detail-screen"
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 100,
      }}
    >
      <Header topInset={insets.top}>
        <BackButton onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
        </BackButton>
        <EditButton onPress={handleEdit} activeOpacity={0.7}>
          <Edit size={20} color="#000000" strokeWidth={2.5} />
        </EditButton>
      </Header>

      <Content>
        <Text variant="caption" weight="medium" color={theme.colors.primary} style={{ marginBottom: theme.spacing[2] }}>
          {monthName}
        </Text>

        <Text variant="h1" weight="bold" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[4] }}>
          {entry.name}
        </Text>

        <PhotosContainer>
          {entry.photos.map((photoUri, index) => (
            <PhotoContainer key={index}>
              <Photo
                source={{ uri: photoUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </PhotoContainer>
          ))}
        </PhotosContainer>

        <DetailsSection>
          <PriceRow>
            <PriceItem>
              <DollarSign size={20} color={theme.colors.text.high} strokeWidth={2} />
              <Text variant="h3" weight="semibold" color={theme.colors.text.high}>
                Stylist: ${entry.stylistPrice}
              </Text>
            </PriceItem>
            <PriceItem>
              <DollarSign size={20} color={theme.colors.text.high} strokeWidth={2} />
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
            <Calendar size={20} color={theme.colors.text.medium} strokeWidth={2} />
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
      </Content>
    </Container>
  );
}

