import React from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import type { MoodBoardEntry } from '@/types/planner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface PlannerCalendarProps {
  month: number;
  year: number;
  calendarDays: (number | null)[];
  entriesByDay: Record<number, MoodBoardEntry[]>;
  selectedDay: number | null;
  setSelectedDay: (day: number) => void;
  prevMonth: () => void;
  nextMonth: () => void;
}

export function PlannerCalendar({
  month, year, calendarDays, entriesByDay, selectedDay, setSelectedDay, prevMonth, nextMonth
}: PlannerCalendarProps) {
  const { theme } = useTheme();

  return (
    <>
      <View style={{
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24,
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <View style={{ position: 'relative' }}>
          <Text variant="h1" weight="bold" color={theme.colors.text.high} style={{
            fontSize: 56, fontStyle: 'italic', letterSpacing: -3, lineHeight: 56,
            paddingLeft: 8, textShadowColor: theme.colors.primary, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0,
          }}>
            {MONTHS[month]}
          </Text>
          <View style={{
            position: 'absolute', bottom: -6, right: -20, backgroundColor: theme.colors.text.high,
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, transform: [{ rotate: '3deg' }],
          }}>
            <Text variant="caption" weight="bold" color={theme.colors.surface} style={{ fontSize: 12 }}>
              {year}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <TouchableOpacity onPress={prevMonth} activeOpacity={0.7}
            style={{
              width: 40, height: 40, backgroundColor: theme.colors.surface,
              borderWidth: 2, borderColor: theme.colors.text.high, borderRadius: 12,
              alignItems: 'center', justifyContent: 'center',
            }}>
            <ChevronLeft size={22} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} activeOpacity={0.7}
            style={{
              width: 40, height: 40, backgroundColor: theme.colors.surface,
              borderWidth: 2, borderColor: theme.colors.text.high, borderRadius: 12,
              alignItems: 'center', justifyContent: 'center',
            }}>
            <ChevronRight size={22} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <View style={{ position: 'relative' }}>
          <View style={{
            position: 'absolute', top: 8, left: 8, right: -8, bottom: -8,
            backgroundColor: theme.colors.primary, borderWidth: 4, borderColor: theme.colors.text.high, borderRadius: 32,
          }} />
          <View style={{
            backgroundColor: theme.colors.surface, borderWidth: 4, borderColor: theme.colors.text.high,
            borderRadius: 32, padding: 16,
          }}>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {DAYS.map((day, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="caption" weight="bold" color={theme.colors.text.high} style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {calendarDays.map((day, idx) => {
                const hasEntries = day ? !!(entriesByDay[day] && entriesByDay[day].length > 0) : false;
                const isSelected = selectedDay === day;
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                const dayCellSize = Math.floor((SCREEN_WIDTH - 32 - 32 - 8) / 7);

                return (
                  <TouchableOpacity key={idx} disabled={!day} onPress={() => day && setSelectedDay(day)} activeOpacity={0.7}
                    style={{ width: dayCellSize, height: dayCellSize, alignItems: 'center', justifyContent: 'center', opacity: day ? 1 : 0 }}>
                    {day && (
                      <View style={{
                        width: dayCellSize - 4, height: dayCellSize - 4, borderRadius: 12,
                        borderWidth: 2, borderColor: isSelected ? theme.colors.text.high : (hasEntries ? 'rgba(141,163,153,0.3)' : 'transparent'),
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSelected ? theme.colors.accent : hasEntries ? 'rgba(141,163,153,0.08)' : theme.colors.surface,
                        transform: isSelected ? [{ rotate: '3deg' }, { scale: 1.1 }] : [],
                        zIndex: isSelected ? 10 : 0, elevation: isSelected ? 4 : 0,
                        shadowColor: isSelected ? theme.colors.text.high : 'transparent',
                        shadowOffset: isSelected ? { width: 2, height: 2 } : { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 1 : 0, shadowRadius: 0,
                      }}>
                        <Text variant="body" weight="bold" style={{ fontSize: 13 }}
                          color={isSelected ? theme.colors.surface : isToday ? theme.colors.accentSecondary : theme.colors.text.high}>
                          {day}
                        </Text>
                        {hasEntries && !isSelected && (
                          <View style={{ position: 'absolute', top: 1, right: 1 }}>
                            <Sparkles size={9} color={theme.colors.accent} strokeWidth={2.5} />
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
