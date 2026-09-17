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
}

const DISPLAY = { date: 'EEE d MMM yyyy', time: 'HH:mm' } as const;

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
      value={format(value, DISPLAY[mode])}
      onPress={
        Platform.OS === 'android'
          ? () =>
              DateTimePickerAndroid.open({
                value,
                mode,
                minimumDate,
                is24Hour: true,
                onChange: (event, next) => event.type === 'set' && next && onChange(next),
              })
          : undefined
      }
    />
  );
}
