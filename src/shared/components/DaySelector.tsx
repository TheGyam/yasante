import React, { useState, useEffect, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/shared/hooks/useTheme';
import type { Theme } from '@/shared/theme/ThemeProvider';

interface DaySelectorProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDate, setSelectedDate }) => {
  const { theme } = useTheme();
  const today = new Date().toISOString().split('T')[0];
  const [selected, setSelected] = useState(selectedDate.toISOString().split('T')[0]);

  useEffect(() => {
    setSelected(selectedDate.toISOString().split('T')[0]);
  }, [selectedDate]);

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.colors.primary,
    },
  });

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={day => {
          const date = new Date(day.timestamp);
          setSelectedDate(date);
          setSelected(day.dateString);
        }}
        onMonthChange={month => {
          // Update selectedDate when month changes to trigger mood board update
          const newDate = new Date(month.year, month.month - 1, selectedDate.getDate());
          // If the day doesn't exist in the new month (e.g., Feb 30), use the last day of the month
          const lastDayOfMonth = new Date(month.year, month.month, 0).getDate();
          if (newDate.getDate() > lastDayOfMonth) {
            newDate.setDate(lastDayOfMonth);
          }
          setSelectedDate(newDate);
          setSelected(newDate.toISOString().split('T')[0]);
        }}
        enableSwipeMonths={true}
        markedDates={{
          [selected]: {
            selected: true,
            selectedColor: theme.colors.background,
            selectedTextColor: theme.colors.primary,
          },
          ...(selected !== today
            ? {
                [today]: {
                  marked: true,
                  dotColor: '#ffffff',
                  selected: false,
                  selectedColor: 'transparent',
                  customStyles: {
                    container: {
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      borderRadius: 16,
                    },
                    text: {
                      color: '#ffffff',
                      fontWeight: 'bold',
                    },
                  },
                },
              }
            : {}),
        }}
        theme={{
          backgroundColor: theme.colors.primary,
          calendarBackground: theme.colors.primary,
          textSectionTitleColor: '#ffffff',
          selectedDayTextColor: theme.colors.primary,
          selectedDayBackgroundColor: theme.colors.background,
          todayTextColor: '#ffffff',
          dayTextColor: '#ffffff',
          textDisabledColor: 'rgba(255, 255, 255, 0.5)',
          monthTextColor: '#ffffff',
          arrowColor: '#ffffff',
          textMonthFontWeight: 'bold',
          textMonthFontSize: theme.fontSizes[4],
          textDayHeaderFontWeight: '600',
          textDayHeaderFontSize: theme.fontSizes[1],
        }}
      />
    </View>
  );
};

export default memo(DaySelector);
