import React, { forwardRef } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Camera, LayoutGrid, Plus } from 'lucide-react-native';
import { Text } from '@/shared/ui/Text';
import { useTheme } from '@/shared/hooks/useTheme';
import { CollectionCard } from './CollectionCard';
import type { MoodBoardEntry } from '@/features/planner';

interface PlannerBottomSheetProps {
  snapPoints: string[];
  onChange: (index: number) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  month: number;
  selectedDay: number | null;
  selectedEntries: MoodBoardEntry[];
  moodBoardEntries: MoodBoardEntry[];
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const PlannerBottomSheet = forwardRef<BottomSheet, PlannerBottomSheetProps>(
  ({ snapPoints, onChange, isAuthenticated, isLoading, month, selectedDay, selectedEntries, moodBoardEntries }, ref) => {
    const { theme } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const entriesToShow = selectedDay ? selectedEntries : moodBoardEntries;
    
    // Sort entries by most recently updated
    const sortedEntries = [...entriesToShow].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const renderContent = () => {
      if (!isAuthenticated) {
        return (
          <View style={{ padding: 20, paddingBottom: insets.bottom + 80 }}>
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 20,
                backgroundColor: theme.colors.primary, borderWidth: 4, borderColor: theme.colors.text.high,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16, transform: [{ rotate: '-10deg' }],
              }}>
                <LayoutGrid size={36} color={theme.colors.surface} strokeWidth={2} />
              </View>
              <Text variant="h3" weight="bold" color={theme.colors.text.high} style={{ textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', fontStyle: 'italic' }}>
                Sign In Required
              </Text>
              <Text variant="caption" color={theme.colors.primary} style={{ textAlign: 'center', marginBottom: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                CREATE YOUR MOOD BOARD
              </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')} activeOpacity={0.7}
                style={{
                  paddingHorizontal: 32, paddingVertical: 14,
                  backgroundColor: theme.colors.accent, borderWidth: 4, borderColor: theme.colors.text.high,
                  borderRadius: 16, elevation: 8,
                  shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
                }}>
                <Text variant="body" weight="bold" color={theme.colors.surface} style={{ textTransform: 'uppercase', fontStyle: 'italic', fontSize: 16 }}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (isLoading) {
        return (
          <View style={{ padding: 20, paddingBottom: insets.bottom + 80 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          </View>
        );
      }

      if (entriesToShow.length === 0) {
        return (
          <View style={{ padding: 20, paddingBottom: insets.bottom + 80 }}>
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <View style={{
                width: 80, height: 80, backgroundColor: theme.colors.primary,
                borderWidth: 4, borderColor: theme.colors.text.high, borderRadius: 20,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16, transform: [{ rotate: '-10deg' }],
              }}>
                <Camera size={40} color={theme.colors.surface} strokeWidth={2} />
              </View>
              <Text variant="h3" weight="bold" color={theme.colors.text.high} style={{ textAlign: 'center', marginBottom: 4, textTransform: 'uppercase', fontStyle: 'italic', fontSize: 22 }}>
                EMPTY SLOT
              </Text>
              <Text variant="caption" color={theme.colors.primary} style={{ textAlign: 'center', marginBottom: 24, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', fontSize: 10 }}>
                NO BOARDS PLANNED THIS DAY
              </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/planner/moodboard/create' as any)} activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 24, paddingVertical: 14,
                  backgroundColor: theme.colors.accent, borderWidth: 4, borderColor: theme.colors.text.high,
                  borderRadius: 16, elevation: 8,
                  shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
                }}>
                <Plus size={20} color={theme.colors.surface} strokeWidth={3} />
                <Text variant="body" weight="bold" color={theme.colors.surface} style={{ textTransform: 'uppercase', fontStyle: 'italic', fontSize: 15 }}>
                  Add Board
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return (
        <View style={{ padding: 24, paddingBottom: insets.bottom + 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <Text variant="h2" weight="bold" color={theme.colors.text.high} style={{ fontSize: 24, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: -1 }}>
              {selectedDay ? `${MONTHS[month]} ${selectedDay}` : 'ALL BOARDS'}
            </Text>
            <View style={{ backgroundColor: theme.colors.text.high, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, transform: [{ rotate: '3deg' }] }}>
              <Text variant="caption" weight="bold" color={theme.colors.surface} style={{ fontSize: 10 }}>
                {sortedEntries.length} {sortedEntries.length === 1 ? 'BOARD' : 'BOARDS'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {sortedEntries.map((entry, index) => (
              <CollectionCard key={entry.id} entry={entry} index={index} />
            ))}
          </View>
        </View>
      );
    };

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        index={0}
        onChange={onChange}
        enablePanDownToClose={false}
        enableOverDrag={false}
        animateOnMount={true}
        bottomInset={0}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 32,
      
          borderColor: theme.colors.text.high,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.primary,
          width: 40,
          height: 5,
          borderRadius: 3,
        }}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          {renderContent()}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
