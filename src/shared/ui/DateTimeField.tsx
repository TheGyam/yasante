import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/shared/theme';
import { ListRow, type ListRowTone } from './ListRow';

export interface DateTimeFieldProps {
  title: string;
  value: Date;
  onChange: (value: Date) => void;
  mode?: 'date' | 'time';
  icon?: LucideIcon;
  iconTone?: ListRowTone;
  minimumDate?: Date;
  /**
   * Show and pick in this zone (IANA, e.g. Europe/London) rather than the phone's:
   * appointment times are the salon's clock wherever the phone is.
   */
  timeZone?: string;
}

const DISPLAY = { date: 'EEE d MMM yyyy', time: 'HH:mm' } as const;

/** "Tue 29 Sep 2026" or "09:00" as that zone's clock reads it. */
function inZone(value: Date, mode: 'date' | 'time', timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    ...(mode === 'time'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  })
    .format(value)
    .replace(/,/g, '');
}

/**
 * A row that edits a date or time with the platform's own picker: the compact inline
 * control on iOS, the system dialog on Android. Place it inside a `Section`.
 */
export function DateTimeField({
  title,
  value,
  onChange,
  mode = 'date',
  icon,
  iconTone,
  minimumDate,
  timeZone,
}: DateTimeFieldProps) {
  const theme = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <ListRow
        title={title}
        icon={icon}
        iconTone={iconTone}
        trailing={
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            minimumDate={minimumDate}
            timeZoneName={timeZone}
            accentColor={theme.colors.accent}
            themeVariant={theme.scheme}
            onChange={(_, next) => next && onChange(next)}
          />
        }
      />
    );
  }

  return (
    <ListRow
      title={title}
      icon={icon}
      iconTone={iconTone}
      value={timeZone ? inZone(value, mode, timeZone) : format(value, DISPLAY[mode])}
      onPress={
        Platform.OS === 'android'
          ? () =>
              DateTimePickerAndroid.open({
                value,
                mode,
                minimumDate,
                timeZoneName: timeZone,
                is24Hour: true,
                onChange: (event, next) => event.type === 'set' && next && onChange(next),
              })
          : undefined
      }
    />
  );
}
