import React, { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useGoals } from '@/api/hooks/useGoals';
import { TopBar } from '@/components/composed/TopBar';
import { MonthCard } from '@/components/composed/MonthCard';
import { FloatingActionButton } from '@/components/composed/FloatingActionButton';
import { EmptyState } from '@/components/composed/EmptyState';
import { Text } from '@/components/ui/Text';
import { MonthlyCalendar, Goal } from '@/types/planner';
import { mockMonthlyHairstyles } from '@/api/mock/data';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6] + 56 + 32}px; /* Extra padding for FAB and tab bar */
`;

const MonthList = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;


// Helper function to get month name
const getMonthName = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

// Helper function to get goals for a specific month
const getGoalsForMonth = (goals: Goal[], month: string): Goal[] => {
  return goals.filter((goal) => {
    const goalDate = new Date(goal.targetDate);
    const goalMonth = goalDate.toISOString().slice(0, 7); // YYYY-MM format
    return goalMonth === month;
  });
};

export default function PlannerScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: goals = [], isLoading, refetch } = useGoals();
  const userId = 'user-1';

  // Generate monthly calendars for current and next 5 months, plus user-added months
  const monthlyCalendars = useMemo(() => {
    const calendars: MonthlyCalendar[] = [];
    const now = new Date();
    const allMonthKeys = new Set<string>();
    
    // Add default months (current and next 5)
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      allMonthKeys.add(monthKey);
    }
    
    
    // Convert to array and sort chronologically
    const sortedMonthKeys = Array.from(allMonthKeys).sort();
    
    // Generate calendar objects for each month
    sortedMonthKeys.forEach(monthKey => {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      const monthName = getMonthName(monthIndex);
      
      // Get hairstyles for this month
      const hairstyles = mockMonthlyHairstyles.filter((h) => h.month === monthKey && h.userId === userId);
      
      // Get goals for this month
      const monthGoals = getGoalsForMonth(goals, monthKey);
      
      // Only include months that have content (hairstyles OR goals)
      if (hairstyles.length > 0 || monthGoals.length > 0) {
        calendars.push({
          month: monthKey,
          year,
          monthName,
          hairstyles,
          goals: monthGoals,
        });
      }
    });
    
    return calendars;
  }, [goals]);

  const handleRefresh = () => {
    refetch();
  };

  const handleAddHairstyle = (month: string) => {
    router.push(`/(tabs)/planner/hairstyle/${month}` as any);
  };

  const handleEditHairstyle = (hairstyleId: string) => {
    router.push(`/(tabs)/planner/hairstyle/edit/${hairstyleId}` as any);
  };

  const handleViewGoal = (goalId: string) => {
    router.push(`/(tabs)/planner/goal/${goalId}` as any);
  };


  return (
    <>
      <Container
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        testID="planner-screen"
      >
        <TopBar title="Planner" showBack={false} />
        <Content>
          {isLoading ? (
            <Text>Loading...</Text>
          ) : (
            <MonthList>
              {monthlyCalendars.map((calendar) => (
                <MonthCard
                  key={calendar.month}
                  calendar={calendar}
                  onAddHairstyle={handleAddHairstyle}
                  onEditHairstyle={handleEditHairstyle}
                  onViewGoal={handleViewGoal}
                />
              ))}
            </MonthList>
          )}
        </Content>
      </Container>
      <FloatingActionButton
        onPress={() => router.push('/(tabs)/planner/create' as any)}
        testID="create-goal-fab"
      />
    </>
  );
}
