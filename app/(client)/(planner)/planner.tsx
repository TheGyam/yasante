import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { format, isSameDay } from 'date-fns';
import { CalendarHeart, Droplets, Plus, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  BoardGrid,
  appointmentOf,
  describeTreatment,
  useMoodBoardEntries,
  useTreatments,
  type MoodBoardEntry,
} from '@/features/planner';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { MonthCalendar, dayKey } from '@/shared/ui/MonthCalendar';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';

type PlannerView = 'boards' | 'treatments';

const VIEWS = [
  { value: 'boards', label: 'Boards' },
  { value: 'treatments', label: 'Treatments' },
] as const;

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  row: { flexDirection: 'row', gap: space.md },
  spacer: { flex: 1 },
}));

export default function PlannerScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [view, setView] = useState<PlannerView>('boards');
  const [month, setMonth] = useState(() => new Date());
  const [day, setDay] = useState<Date | null>(null);

  const boards = useMoodBoardEntries(user?.id, format(month, 'yyyy-MM'), {
    enabled: isAuthenticated,
  });
  const treatments = useTreatments(user?.id, { enabled: isAuthenticated && view === 'treatments' });

  if (!isAuthenticated) {
    return (
      <Screen title="Planner" tabBar testID="planner-screen">
        <EmptyState
          icon={CalendarHeart}
          title="Plan your next look"
          message="Save inspiration to boards, track appointments and budgets, and keep your treatments on schedule."
          actionLabel="Create a free account"
          onAction={() => router.push('/auth/join')}
        />
      </Screen>
    );
  }

  const create = () => router.push(view === 'boards' ? '/boards/new' : '/treatments/new');
  const active = view === 'boards' ? boards : treatments;

  return (
    <Screen
      title="Planner"
      tabBar
      testID="planner-screen"
      refreshing={active.isRefetching}
      onRefresh={() => active.refetch()}
      headerRight={
        <IconButton
          icon={Plus}
          variant="accent"
          size={36}
          accessibilityLabel={view === 'boards' ? 'New board' : 'New treatment'}
          onPress={create}
        />
      }
    >
      <View style={styles.body}>
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        {view === 'boards' ? (
          <Boards
            entries={boards.data ?? []}
            loading={boards.isLoading}
            month={month}
            day={day}
            onMonthChange={next => {
              setMonth(next);
              setDay(null);
            }}
            onDayChange={setDay}
            onCreate={create}
          />
        ) : treatments.isLoading ? (
          <Skeleton height={160} />
        ) : treatments.data?.length ? (
          <Section>
            {treatments.data.map(t => (
              <ListRow
                key={t.id}
                title={t.name}
                subtitle={describeTreatment(t)}
                icon={Droplets}
                onPress={() => router.push(`/treatments/${t.id}`)}
              />
            ))}
          </Section>
        ) : (
          <EmptyState
            icon={Droplets}
            title="No treatments yet"
            message="Masks, oils, rinses — set a rhythm and we’ll keep track."
            actionLabel="Add a treatment"
            onAction={create}
          />
        )}
      </View>
    </Screen>
  );
}

interface BoardsProps {
  entries: MoodBoardEntry[];
  loading: boolean;
  month: Date;
  day: Date | null;
  onMonthChange: (month: Date) => void;
  onDayChange: (day: Date | null) => void;
  onCreate: () => void;
}

function Boards({
  entries,
  loading,
  month,
  day,
  onMonthChange,
  onDayChange,
  onCreate,
}: BoardsProps) {
  const styles = useStyles();

  const marked = new Set<string>();
  for (const entry of entries) {
    const when = appointmentOf(entry);
    if (when) marked.add(dayKey(when));
  }
  const shown = day
    ? entries.filter(entry => {
        const when = appointmentOf(entry);
        return !!when && isSameDay(when, day);
      })
    : entries;

  return (
    <>
      <MonthCalendar
        month={month}
        onMonthChange={onMonthChange}
        selected={day}
        // Tapping the selected day again goes back to the whole month.
        onSelect={next => onDayChange(day && isSameDay(day, next) ? null : next)}
        marked={marked}
      />
      <View>
        <SectionHeader
          title={day ? format(day, 'EEEE d MMMM') : `${format(month, 'MMMM')} boards`}
          actionLabel={day ? 'Whole month' : undefined}
          onAction={() => onDayChange(null)}
        />
        {loading ? (
          <View style={styles.row}>
            <Skeleton height={220} style={styles.spacer} />
            <Skeleton height={220} style={styles.spacer} />
          </View>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={day ? 'Nothing planned that day' : 'Nothing planned yet'}
            message="Start a board for the next style you’re dreaming about."
            actionLabel="Plan a look"
            onAction={onCreate}
          />
        ) : (
          <BoardGrid entries={shown} />
        )}
      </View>
    </>
  );
}
