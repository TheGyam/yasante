import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import type { Theme } from '@/shared/theme/ThemeProvider';

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled(Card)`
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  max-height: 60%;
`;

const Title = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const MonthList = styled.ScrollView`
  max-height: 400px;
`;

const MonthOption = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const MonthOptionText = styled(Text)`
  font-size: 16px;
  font-weight: 500;
`;

const CancelButton = styled(TouchableOpacity)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  align-items: center;
`;

const CancelButtonText = styled(Text)`
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.medium};
  font-weight: 500;
`;

export interface MonthOption {
  monthKey: string; // YYYY-MM format
  monthName: string;
  year: number;
}

export interface MonthPickerProps {
  visible: boolean;
  onClose: () => void;
  onMonthSelected: (month: MonthOption) => void;
  existingMonths: string[]; // Array of month keys (YYYY-MM) that already exist
  testID?: string;
}

// Helper function to get month name
const getMonthName = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

// Generate future months (next 24 months)
const generateFutureMonths = (existingMonths: string[]): MonthOption[] => {
  const months: MonthOption[] = [];
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7); // Current month in YYYY-MM format
  
  // Start from next month (not current month)
  for (let i = 1; i <= 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    
    // Only include months that don't already exist
    if (!existingMonths.includes(monthKey)) {
      months.push({
        monthKey,
        monthName: getMonthName(date.getMonth()),
        year: date.getFullYear(),
      });
    }
  }
  
  return months;
};

export function MonthPicker({ 
  visible, 
  onClose, 
  onMonthSelected, 
  existingMonths,
  testID 
}: MonthPickerProps) {
  const { theme } = useTheme();
  const availableMonths = generateFutureMonths(existingMonths);

  const handleMonthSelect = (month: MonthOption) => {
    onMonthSelected(month);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <ModalOverlay>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <ModalContent>
          <Title variant="h3" weight="semibold">
            Select a Month
          </Title>
          {availableMonths.length === 0 ? (
            <Text variant="body" color={theme.colors.text.medium} style={{ textAlign: 'center', padding: theme.spacing[4] }}>
              All available months have been added
            </Text>
          ) : (
            <MonthList>
              {availableMonths.map((month) => (
                <MonthOption
                  key={month.monthKey}
                  onPress={() => handleMonthSelect(month)}
                  activeOpacity={0.7}
                  testID={testID ? `${testID}-${month.monthKey}` : undefined}
                >
                  <MonthOptionText variant="body" weight="medium" color={theme.colors.text.high}>
                    {month.monthName} {month.year}
                  </MonthOptionText>
                </MonthOption>
              ))}
            </MonthList>
          )}
          <CancelButton onPress={onClose} activeOpacity={0.7}>
            <CancelButtonText variant="body">Cancel</CancelButtonText>
          </CancelButton>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}

