import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import styled from 'styled-components/native';
import {
  Sparkles,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '@/shared/hooks/useTheme';
import { useTreatment, useUpdateTreatment } from '@/features/planner';
import { useAuth } from '@/features/auth';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { Card } from '@/shared/ui/Card';
import { isRequired } from '@/shared/utils/validation';
import { shareTreatment } from '@/features/planner';
import type { Theme } from '@/shared/theme/ThemeProvider';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const CancelButton = styled(TouchableOpacity)``;

const HeaderTitle = styled(Text)`
  flex: 1;
  text-align: center;
`;

const HeaderRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ShareButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6] + 80}px;
`;

const Section = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const SectionTitle = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const FrequencyGrid = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const FrequencyButton = styled(TouchableOpacity)<{ selected: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) =>
    selected ? theme.colors.surfaceVariant : theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  border-width: ${({ selected }: { selected: boolean }) => (selected ? 2 : 1)}px;
  border-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) =>
    selected ? theme.colors.primary : theme.colors.border};
`;

const TimeOfDayGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const TimeOfDayButton = styled(TouchableOpacity)<{ selected: boolean }>`
  flex: 1;
  min-width: 45%;
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) =>
    selected ? theme.colors.surfaceVariant : theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  border-width: ${({ selected }: { selected: boolean }) => (selected ? 2 : 1)}px;
  border-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) =>
    selected ? theme.colors.primary : theme.colors.border};
`;

const CalendarContainer = styled(Card)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const CalendarHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const MonthNav = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const NavButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const DaysOfWeek = styled.View`
  flex-direction: row;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const DayLabel = styled.View`
  flex: 1;
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const CalendarGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
`;

const DayButton = styled(TouchableOpacity)<{ selected: boolean; isCurrentMonth: boolean }>`
  width: ${({ theme }: { theme: Theme }) => `${100 / 7}%`};
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ selected, theme }: { selected: boolean; theme: Theme }) =>
    selected ? theme.colors.primary : 'transparent'};
  opacity: ${({ isCurrentMonth }: { isCurrentMonth: boolean }) => (isCurrentMonth ? 1 : 0.3)};
`;

const SaveButton = styled(Button)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  margin: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const frequencyOptions = [
  { value: 'daily', label: 'Daily', icon: RefreshCw },
  { value: 'every-2-days', label: 'Every 2 days', icon: RefreshCw },
  { value: 'weekly', label: 'Weekly', icon: RefreshCw },
  { value: 'specific-days', label: 'Specific Days', icon: CalendarIcon },
  { value: 'custom', label: 'Custom', icon: RefreshCw },
];

const timeOfDayOptions = [
  { value: 'morning', label: 'Morning', icon: Sun },
  { value: 'afternoon', label: 'Afternoon', icon: Sun },
  { value: 'evening', label: 'Evening', icon: Sunset },
  { value: 'night', label: 'Night', icon: Moon },
];

const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function TreatmentEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || '';
  const { data: treatment, isLoading } = useTreatment(id || '');
  const updateTreatment = useUpdateTreatment(id || '', userId);

  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (treatment) {
      setName(treatment.name);
      setFrequency(treatment.frequency);
      setTimeOfDay(treatment.timeOfDay);
      const date = parseISO(treatment.startDate);
      setStartDate(date);
      setCurrentMonth(date);
    }
  }, [treatment]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)));
  };

  const handleDateSelect = (date: Date) => {
    if (isSameMonth(date, currentMonth)) {
      setStartDate(date);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const firstDayOfWeek = getDay(monthStart);

    const calendarDays: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null);
    }
    days.forEach(day => calendarDays.push(day));

    return (
      <CalendarContainer>
        <CalendarHeader>
          <Text variant="h3" weight="semibold" color={theme.colors.text.high}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <MonthNav>
            <NavButton onPress={() => handleMonthChange('prev')} activeOpacity={0.7}>
              <ChevronLeft size={20} color={theme.colors.primary} strokeWidth={2} />
            </NavButton>
            <NavButton onPress={() => handleMonthChange('next')} activeOpacity={0.7}>
              <ChevronRight size={20} color={theme.colors.primary} strokeWidth={2} />
            </NavButton>
          </MonthNav>
        </CalendarHeader>

        <DaysOfWeek>
          {daysOfWeek.map(day => (
            <DayLabel key={day}>
              <Text variant="caption" color={theme.colors.text.medium}>
                {day}
              </Text>
            </DayLabel>
          ))}
        </DaysOfWeek>

        <CalendarGrid>
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
              );
            }
            const isSelected = startDate && isSameDay(day, startDate);
            const isCurrentMonthDay = isSameMonth(day, currentMonth);

            return (
              <DayButton
                key={day.toISOString()}
                selected={!!isSelected}
                isCurrentMonth={isCurrentMonthDay}
                onPress={() => handleDateSelect(day)}
                activeOpacity={0.7}
              >
                <Text
                  variant="body"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={
                    isSelected
                      ? '#fff'
                      : isCurrentMonthDay
                        ? theme.colors.text.high
                        : theme.colors.text.low
                  }
                >
                  {format(day, 'd')}
                </Text>
              </DayButton>
            );
          })}
        </CalendarGrid>
      </CalendarContainer>
    );
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!isRequired(name)) newErrors.name = 'Treatment name is required';
    if (!frequency) newErrors.frequency = 'Frequency is required';
    if (!timeOfDay) newErrors.timeOfDay = 'Time of day is required';
    if (!startDate) newErrors.startDate = 'Start date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await updateTreatment.mutateAsync({
        name,
        frequency: frequency as any,
        timeOfDay: timeOfDay as any,
        startDate: startDate!.toISOString().split('T')[0],
      });

      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update treatment');
    }
  };

  if (isLoading || !treatment) {
    return (
      <Container>
        <Header>
          <CancelButton onPress={() => router.back()} activeOpacity={0.7}>
            <Text variant="body" weight="medium" color={theme.colors.primary}>
              Cancel
            </Text>
          </CancelButton>
          <HeaderTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
            Edit Treatment
          </HeaderTitle>
          <View style={{ width: 60 }} />
        </Header>
        <Content>
          <Text>Loading...</Text>
        </Content>
      </Container>
    );
  }

  return (
    <Container testID="treatment-edit-screen">
      <Header>
        <CancelButton onPress={() => router.back()} activeOpacity={0.7}>
          <Text variant="body" weight="medium" color={theme.colors.primary}>
            Cancel
          </Text>
        </CancelButton>
        <HeaderTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
          Edit Treatment
        </HeaderTitle>
        <HeaderRight>
          {treatment && (
            <ShareButton onPress={() => shareTreatment(treatment)} activeOpacity={0.7}>
              <Share2 size={20} color={theme.colors.text.high} strokeWidth={2.5} />
            </ShareButton>
          )}
          <View style={{ width: 20 }} />
        </HeaderRight>
      </Header>

      <Content>
        <Section>
          <SectionTitle>
            <Sparkles size={20} color={theme.colors.primary} strokeWidth={2} />
            <Text variant="body" weight="semibold" color={theme.colors.text.high}>
              Treatment Name
            </Text>
          </SectionTitle>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Enter treatment name"
            error={errors.name}
            testID="name-input"
          />
        </Section>

        <Section>
          <SectionTitle>
            <RefreshCw size={20} color={theme.colors.primary} strokeWidth={2} />
            <Text variant="body" weight="semibold" color={theme.colors.text.high}>
              Frequency
            </Text>
          </SectionTitle>
          <FrequencyGrid>
            {frequencyOptions.map(option => {
              const Icon = option.icon;
              const isSelected = frequency === option.value;
              return (
                <FrequencyButton
                  key={option.value}
                  selected={isSelected}
                  onPress={() => setFrequency(option.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}
                  >
                    <Icon size={20} color={theme.colors.text.high} strokeWidth={2} />
                    <Text variant="body" color={theme.colors.text.high}>
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && <Check size={20} color={theme.colors.primary} strokeWidth={2} />}
                </FrequencyButton>
              );
            })}
          </FrequencyGrid>
          {errors.frequency && (
            <Text
              variant="caption"
              color={theme.colors.error}
              style={{ marginTop: theme.spacing[1] }}
            >
              {errors.frequency}
            </Text>
          )}
        </Section>

        <Section>
          <SectionTitle>
            <Clock size={20} color={theme.colors.primary} strokeWidth={2} />
            <Text variant="body" weight="semibold" color={theme.colors.text.high}>
              Time of Day
            </Text>
          </SectionTitle>
          <TimeOfDayGrid>
            {timeOfDayOptions.map(option => {
              const Icon = option.icon;
              const isSelected = timeOfDay === option.value;
              return (
                <TimeOfDayButton
                  key={option.value}
                  selected={isSelected}
                  onPress={() => setTimeOfDay(option.value)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={24}
                    color={isSelected ? theme.colors.primary : theme.colors.text.medium}
                    strokeWidth={2.5}
                  />
                  <Text
                    variant="body"
                    weight={isSelected ? 'semibold' : 'regular'}
                    color={isSelected ? theme.colors.primary : theme.colors.text.medium}
                    style={{ marginTop: theme.spacing[1] }}
                  >
                    {option.label}
                  </Text>
                </TimeOfDayButton>
              );
            })}
          </TimeOfDayGrid>
          {errors.timeOfDay && (
            <Text
              variant="caption"
              color={theme.colors.error}
              style={{ marginTop: theme.spacing[1] }}
            >
              {errors.timeOfDay}
            </Text>
          )}
        </Section>

        <Section>
          <SectionTitle>
            <CalendarIcon size={20} color={theme.colors.primary} strokeWidth={2} />
            <Text variant="body" weight="semibold" color={theme.colors.text.high}>
              Start Date
            </Text>
          </SectionTitle>
          {renderCalendar()}
          {errors.startDate && (
            <Text
              variant="caption"
              color={theme.colors.error}
              style={{ marginTop: theme.spacing[1] }}
            >
              {errors.startDate}
            </Text>
          )}
        </Section>
      </Content>

      <SaveButton
        variant="primary"
        onPress={handleSubmit}
        loading={updateTreatment.isPending}
        fullWidth
        testID="save-treatment-button"
      >
        Save Treatment
      </SaveButton>
    </Container>
  );
}
