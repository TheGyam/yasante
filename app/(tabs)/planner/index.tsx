import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { FloatingActionButton } from '@/components/composed/FloatingActionButton';
import { useMoodBoardEntries } from '@/api/hooks/useMoodBoard';
import type { MoodBoardEntry } from '@/types/planner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

import { CollectionCard } from '@/components/moodboard/ui/CollectionCard';
import { PlannerBottomSheet } from '@/components/moodboard/ui/PlannerBottomSheet';
import { PlannerCalendar } from '@/components/moodboard/ui/PlannerCalendar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlannerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const userId = user?.id || '';

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const selectedMonth = useMemo(() => {
    return format(currentDate, 'yyyy-MM');
  }, [currentDate]);

  const { data: moodBoardEntries = [], isLoading, refetch } = useMoodBoardEntries(userId, selectedMonth, { enabled: isAuthenticated && !!userId });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [month, year, daysInMonth, firstDayOfMonth]);

  const entriesByDay = useMemo(() => {
    const map: Record<number, MoodBoardEntry[]> = {};
    moodBoardEntries.forEach((entry: MoodBoardEntry) => {
      const dateStr = entry.appointmentTime || entry.updatedAt || entry.createdAt;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const day = date.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(entry);
        }
      }
    });
    return map;
  }, [moodBoardEntries]);

  const selectedEntries = useMemo(() => {
    if (!selectedDay) return [];
    return entriesByDay[selectedDay] || [];
  }, [selectedDay, entriesByDay]);

  const handleFABPress = () => {
    router.push('/(tabs)/planner/moodboard/create' as any);
  };

  // Bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '80%'], []);

  const handleBottomSheetChange = useCallback((index: number) => {
    if (index < 0) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, []);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="planner-screen">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top spacer for safe area */}
          <View style={{ height: insets.top + 12 }} />

          <PlannerCalendar
            month={month}
            year={year}
            calendarDays={calendarDays}
            entriesByDay={entriesByDay}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
          />
        </ScrollView>

        <PlannerBottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          onChange={handleBottomSheetChange}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          month={month}
          selectedDay={selectedDay}
          selectedEntries={selectedEntries}
          moodBoardEntries={moodBoardEntries}
        />
      </View>

      <FloatingActionButton 
        onPress={handleFABPress} 
        visible={!(selectedDay ? selectedEntries.length === 0 : moodBoardEntries.length === 0)}
        icon={<Plus size={28} color={theme.colors.surface} strokeWidth={3} />} 
      />
    </>
  );
}
