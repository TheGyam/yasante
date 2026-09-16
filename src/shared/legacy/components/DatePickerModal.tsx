import React from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Button } from '@/shared/legacy/ui/Button';
import { Text } from '@/shared/legacy/ui/Text';
import { Card } from '@/shared/legacy/ui/Card';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: flex-end;
`;

const ModalContent = styled(Card)`
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

export function DatePickerModal({
  visible,
  onClose,
  value,
  onChange,
  minimumDate,
}: DatePickerModalProps) {
  const { theme } = useTheme();
  const selectedDateString = value.toISOString().split('T')[0];
  const minDateString = minimumDate?.toISOString().split('T')[0];

  const handleDayPress = (day: { dateString: string; timestamp: number }) => {
    const date = new Date(day.timestamp);
    onChange(date);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <ModalContent>
          <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[4] }}>
            Select Date
          </Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              [selectedDateString]: {
                selected: true,
                selectedColor: theme.colors.primary,
                selectedTextColor: '#fff',
              },
            }}
            minDate={minDateString}
            theme={{
              backgroundColor: theme.colors.surface,
              calendarBackground: theme.colors.surface,
              textSectionTitleColor: theme.colors.text.medium,
              selectedDayTextColor: '#fff',
              selectedDayBackgroundColor: theme.colors.primary,
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text.high,
              textDisabledColor: theme.colors.text.low,
              monthTextColor: theme.colors.text.high,
              arrowColor: theme.colors.primary,
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
          />
          <Button
            variant="secondary"
            onPress={onClose}
            fullWidth
            style={{ marginTop: theme.spacing[3] }}
          >
            Cancel
          </Button>
        </ModalContent>
      </ModalOverlay>
    </Modal>
  );
}
