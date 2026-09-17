import { ActivityIndicator, View } from 'react-native';
import { AtSign, Check } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { PUBLIC_HOST } from '../format';
import { toHandle } from '../handle';
import type { useHandleAvailability } from '../hooks';

const useStyles = makeStyles(() => ({
  wrap: { gap: space.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginLeft: space.xs },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

/**
 * Her page address, checked as she types. Taken handles come back with free ones
 * close to it, because retyping guesses is the slowest part of this screen.
 */
export function HandleField({
  value,
  onChange,
  availability,
}: {
  value: string;
  onChange: (handle: string) => void;
  /** From `useHandleAvailability`, owned by the step so it can gate Continue. */
  availability: ReturnType<typeof useHandleAvailability>;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { problem, checking, available, suggestions } = availability;

  return (
    <View style={styles.wrap}>
      <Input
        label="Your page address"
        icon={AtSign}
        value={value}
        onChangeText={text => onChange(toHandle(text))}
        placeholder="braidsbyama"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
        error={value ? problem : undefined}
        hint={`${PUBLIC_HOST}/${value || 'yourname'}`}
      />
      {!problem && !!value && (checking || available !== undefined) && (
        <View style={styles.status}>
          {checking ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
              <Text variant="footnote" tone="tertiary">
                Checking…
              </Text>
            </>
          ) : available ? (
            <>
              <Check size={14} color={theme.colors.success} strokeWidth={3} />
              <Text variant="footnote" tone="success">
                {value} is free
              </Text>
            </>
          ) : (
            available === false && (
              <Text variant="footnote" tone="danger">
                {value} is taken
              </Text>
            )
          )}
        </View>
      )}
      {available === false && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map(suggestion => (
            <Chip key={suggestion} label={suggestion} onPress={() => onChange(suggestion)} />
          ))}
        </View>
      )}
    </View>
  );
}
