import React from 'react';
import { TouchableOpacity, Platform, Dimensions, View } from 'react-native';
import styled from 'styled-components/native';
import { MapPin, DollarSign, Calendar } from 'lucide-react-native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { ImageWithPlaceholder } from '@/shared/ui/ImageWithPlaceholder';
import { MoodBoardEntry } from '@/features/planner';
import type { Theme } from '@/shared/theme/ThemeProvider';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4; // Portrait: height is 40% more than width

const CardContainer = styled(TouchableOpacity)`
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  shadow-color: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowColor};
  shadow-offset: ${({ theme }: { theme: Theme }) =>
    `${theme.shadows.small.shadowOffset.width}px ${theme.shadows.small.shadowOffset.height}px`};
  shadow-opacity: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowOpacity};
  shadow-radius: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowRadius}px;
  elevation: ${({ theme }: { theme: Theme }) =>
    Platform.OS === 'android' ? theme.shadows.small.elevation : 0};
`;

const ImageBackground = styled(ImageWithPlaceholder)`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const ContentOverlay = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  z-index: 1;
`;

const TopOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  z-index: 1;
`;

const MonthText = styled.Text<{ color?: string }>`
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 1.5px;
  color: ${({ color }: { color?: string }) => color || '#ffffff'};
  text-transform: uppercase;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.2);
`;

const YearText = styled.Text`
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
  margin-top: 2px;
`;

const HairstyleName = styled(Text)`
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0px 1px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const InfoRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const PriceRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const PriceItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const InfoText = styled(Text)`
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
  font-size: 14px;
`;

const getMonthName = (month: string): string => {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return format(date, 'MMMM');
};

const getYear = (month: string): string => {
  const [year] = month.split('-');
  return year;
};

export interface MoodBoardCardProps {
  entry: MoodBoardEntry;
  onPress: () => void;
  testID?: string;
}

export function MoodBoardCard({ entry, onPress, testID }: MoodBoardCardProps) {
  const { theme } = useTheme();
  const monthName = getMonthName(entry.month);
  const year = getYear(entry.month);
  const appointmentDate = format(new Date(entry.appointmentTime), 'MMM d, h:mm a');

  return (
    <CardContainer onPress={onPress} testID={testID} activeOpacity={0.95}>
      <ImageBackground
        source={{ uri: entry.mainPhotoUri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {/* Subtle gradient overlay at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          backgroundColor: 'transparent',
        }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        />
      </View>

      <TopOverlay>
        <MonthText color={entry.monthColor || '#ffffff'}>{monthName}</MonthText>
        <YearText>{year}</YearText>
      </TopOverlay>

      <ContentOverlay>
        <HairstyleName>{entry.name}</HairstyleName>

        <PriceRow>
          <PriceItem>
            <DollarSign size={14} color="rgba(255, 255, 255, 0.95)" strokeWidth={2} />
            <InfoText style={{ fontSize: 14, fontWeight: '500' }}>${entry.stylistPrice}</InfoText>
          </PriceItem>
          <PriceItem>
            <DollarSign size={14} color="rgba(255, 255, 255, 0.95)" strokeWidth={2} />
            <InfoText style={{ fontSize: 14, fontWeight: '500' }}>${entry.hairPrice}</InfoText>
          </PriceItem>
        </PriceRow>

        <InfoRow>
          <MapPin size={14} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
          <InfoText numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
            {entry.stylistLocation}
          </InfoText>
        </InfoRow>

        <InfoRow>
          <Calendar size={14} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
          <InfoText style={{ fontSize: 12 }}>{appointmentDate}</InfoText>
        </InfoRow>
      </ContentOverlay>
    </CardContainer>
  );
}
