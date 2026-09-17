import { Pressable, View } from 'react-native';
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { fonts, makeStyles, space } from '@/shared/theme';
import { haptics } from '@/shared/lib/haptics';
import { Glass } from './Glass';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface MonthCalendarProps {
  /** Any date in the month to show. */
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: Date | null;
  onSelect: (day: Date) => void;
  /** Days that carry something, as `yyyy-MM-dd`. */
  marked?: ReadonlySet<string>;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 40;

export const dayKey = (day: Date) => format(day, 'yyyy-MM-dd');

const useStyles = makeStyles(t => ({
  card: { padding: space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.sm,
    marginBottom: space.sm,
  },
  nav: { flexDirection: 'row' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: CELL + 4, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: t.colors.accent },
  number: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: t.colors.text.primary },
  outside: { color: t.colors.text.tertiary, opacity: 0.5 },
  today: { color: t.colors.accent, fontFamily: fonts.bold },
  onAccent: { color: t.colors.text.onAccent, fontFamily: fonts.semibold },
  dot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.accent,
  },
  dotOnAccent: { backgroundColor: t.colors.text.onAccent },
}));

/** A month grid, Monday first. Always six rows, so changing month never shifts the layout. */
export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  marked,
}: MonthCalendarProps) {
  const styles = useStyles();
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const weeks = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d))
  );

  const step = (by: number) => {
    haptics.selection();
    onMonthChange(addMonths(month, by));
  };

  return (
    <Glass style={styles.card}>
      <View style={styles.header}>
        <Text variant="title3" accessibilityRole="header">
          {format(month, 'MMMM yyyy')}
        </Text>
        <View style={styles.nav}>
          <IconButton
            icon={ChevronLeft}
            variant="plain"
            size={40}
            accessibilityLabel="Previous month"
            onPress={() => step(-1)}
          />
          <IconButton
            icon={ChevronRight}
            variant="plain"
            size={40}
            accessibilityLabel="Next month"
            onPress={() => step(1)}
          />
        </View>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((label, i) => (
          <View key={i} style={[styles.cell, { height: 24 }]}>
            <Text variant="caption" tone="tertiary">
              {label}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map(week => (
        <View key={dayKey(week[0])} style={styles.row}>
          {week.map(day => {
            const inMonth = isSameMonth(day, month);
            const isSelected = !!selected && isSameDay(day, selected);
            const hasItems = marked?.has(dayKey(day));
            return (
              <Pressable
                key={dayKey(day)}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${format(day, 'EEEE d MMMM')}${hasItems ? ', has plans' : ''}`}
                onPress={() => {
                  if (!isSelected) haptics.selection();
                  onSelect(day);
                  if (!inMonth) onMonthChange(day);
                }}
              >
                <View style={[styles.day, isSelected && styles.selected]}>
                  <Text
                    style={[
                      styles.number,
                      !inMonth && styles.outside,
                      isToday(day) && styles.today,
                      isSelected && styles.onAccent,
                    ]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {format(day, 'd')}
                  </Text>
                  {hasItems && <View style={[styles.dot, isSelected && styles.dotOnAccent]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Glass>
  );
}
