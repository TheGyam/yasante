import React, { useState } from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import styled from 'styled-components/native';
import { ChevronDown, ChevronUp, Clock, Calendar, Edit, Share2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '../ui/Text';
import { Treatment } from '@/types/planner';
import { shareTreatment } from '@/utils/share';
import type { Theme } from '@/theme/ThemeProvider';
import { format } from 'date-fns';

const CardContainer = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  shadow-color: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowColor};
  shadow-offset: ${({ theme }: { theme: Theme }) => `${theme.shadows.small.shadowOffset.width}px ${theme.shadows.small.shadowOffset.height}px`};
  shadow-opacity: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowOpacity};
  shadow-radius: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowRadius}px;
  elevation: ${({ theme }: { theme: Theme }) => (Platform.OS === 'android' ? theme.shadows.small.elevation : 0)};
`;

const Header = styled(TouchableOpacity)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.View`
  flex: 1;
`;

const HeaderRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ExpandableContent = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

const InfoRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const Badge = styled.View`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
`;

const EditButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const getFrequencyLabel = (frequency: string): string => {
  const labels: Record<string, string> = {
    daily: 'Daily',
    'every-2-days': 'Every 2 days',
    weekly: 'Weekly',
    'specific-days': 'Specific Days',
    custom: 'Custom',
  };
  return labels[frequency] || frequency;
};

const getTimeOfDayLabel = (timeOfDay: string): string => {
  return timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
};

export interface TreatmentCardProps {
  treatment: Treatment;
  onPress?: () => void;
  onEdit?: () => void;
  testID?: string;
}

export function TreatmentCard({ treatment, onPress, onEdit, testID }: TreatmentCardProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const startDate = format(new Date(treatment.startDate), 'MMM d, yyyy');
  const nextOccurrence = treatment.startDate; // TODO: Calculate next occurrence based on frequency

  return (
    <CardContainer testID={testID}>
      <Header onPress={toggleExpand} activeOpacity={0.7}>
        <HeaderLeft>
          <Text variant="h3" weight="semibold" color={theme.colors.text.high}>
            {treatment.name}
          </Text>
          <InfoRow style={{ marginTop: theme.spacing[1], marginBottom: 0 }}>
            <Badge>
              <Text variant="caption" weight="medium" color={theme.colors.text.medium}>
                {getFrequencyLabel(treatment.frequency)}
              </Text>
            </Badge>
            <Badge>
              <Text variant="caption" weight="medium" color={theme.colors.text.medium}>
                {getTimeOfDayLabel(treatment.timeOfDay)}
              </Text>
            </Badge>
          </InfoRow>
        </HeaderLeft>
        <HeaderRight>
          <EditButton
            onPress={(e) => {
              e.stopPropagation();
              shareTreatment(treatment);
            }}
            activeOpacity={0.7}
          >
            <Share2 size={18} color={theme.colors.text.medium} strokeWidth={2} />
          </EditButton>
          {onEdit && (
            <EditButton
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              activeOpacity={0.7}
            >
              <Edit size={18} color={theme.colors.primary} strokeWidth={2} />
            </EditButton>
          )}
          {isExpanded ? (
            <ChevronUp size={20} color={theme.colors.text.medium} strokeWidth={2} />
          ) : (
            <ChevronDown size={20} color={theme.colors.text.medium} strokeWidth={2} />
          )}
        </HeaderRight>
      </Header>

      {isExpanded && (
        <ExpandableContent>
          <InfoRow>
            <Calendar size={16} color={theme.colors.text.medium} strokeWidth={2} />
            <Text variant="body" color={theme.colors.text.medium}>
              Start Date: {startDate}
            </Text>
          </InfoRow>

          {treatment.duration && (
            <InfoRow>
              <Clock size={16} color={theme.colors.text.medium} strokeWidth={2} />
              <Text variant="body" color={theme.colors.text.medium}>
                Duration: {treatment.duration} minutes
              </Text>
            </InfoRow>
          )}

          {treatment.endDate && (
            <InfoRow>
              <Calendar size={16} color={theme.colors.text.medium} strokeWidth={2} />
              <Text variant="body" color={theme.colors.text.medium}>
                End Date: {format(new Date(treatment.endDate), 'MMM d, yyyy')}
              </Text>
            </InfoRow>
          )}

          {treatment.numberOfSessions && (
            <InfoRow>
              <Text variant="body" color={theme.colors.text.medium}>
                Sessions: {treatment.numberOfSessions}
              </Text>
            </InfoRow>
          )}

          {treatment.reminderEnabled && (
            <InfoRow>
              <Text variant="body" color={theme.colors.text.medium}>
                Reminder: {treatment.reminderTime} minutes before
              </Text>
            </InfoRow>
          )}

          {treatment.notes && (
            <InfoRow style={{ marginTop: theme.spacing[2] }}>
              <Text variant="body" color={theme.colors.text.high}>
                {treatment.notes}
              </Text>
            </InfoRow>
          )}

          {treatment.sessions && treatment.sessions.length > 0 && (
            <InfoRow style={{ marginTop: theme.spacing[2] }}>
              <Text variant="caption" color={theme.colors.text.medium}>
                Completed: {treatment.sessions.filter((s) => s.completed).length} / {treatment.sessions.length}
              </Text>
            </InfoRow>
          )}
        </ExpandableContent>
      )}
    </CardContainer>
  );
}

