import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Globe } from 'lucide-react-native';
import { currencySymbol } from '@/shared/lib/format';
import { makeStyles, space } from '@/shared/theme';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Text } from '@/shared/ui/Text';
import type { Country } from '../api';
import { useCountries } from '../hooks';

const useStyles = makeStyles(() => ({
  group: { gap: space.sm },
}));

/** 🇬🇭 from "GH": two regional-indicator letters make the flag. */
export const flagOf = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1a5 + c.charCodeAt(0)));

/**
 * Where she works. Her prices are always in its currency, so the choice says so
 * ("Prices in GH₵"). Typing narrows a list of every country; nothing scrolls.
 */
export function CountryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (country: Country) => void;
}) {
  const styles = useStyles();
  const { data: countries = [] } = useCountries();
  const [picking, setPicking] = useState(false);
  const [term, setTerm] = useState('');
  const chosen = countries.find(c => c.code === value);
  const matches = useMemo(() => {
    const words = term.trim().toLowerCase();
    if (!words) return [];
    return countries
      .filter(c => c.name.toLowerCase().includes(words) || c.code.toLowerCase() === words)
      .sort(
        (a, b) =>
          +!a.name.toLowerCase().startsWith(words) - +!b.name.toLowerCase().startsWith(words)
      )
      .slice(0, 6);
  }, [countries, term]);

  if (!picking && chosen)
    return (
      <ListRow
        title={`${flagOf(chosen.code)}  ${chosen.name}`}
        subtitle={`Your prices are in ${chosen.currency} (${currencySymbol(chosen.currency)})`}
        value="Change"
        onPress={() => setPicking(true)}
        accessibilityLabel={`Country: ${chosen.name}. Change`}
        testID="setup-country"
      />
    );

  return (
    <View style={styles.group}>
      <Input
        label="The country you work in"
        icon={Globe}
        value={term}
        onChangeText={setTerm}
        placeholder="Start typing a country"
        autoCorrect={false}
        autoFocus={picking}
        testID="setup-country-search"
      />
      {matches.map(country => (
        <ListRow
          key={country.code}
          title={`${flagOf(country.code)}  ${country.name}`}
          subtitle={`Prices in ${country.currency}`}
          onPress={() => {
            onChange(country);
            setPicking(false);
            setTerm('');
          }}
        />
      ))}
      {!!term.trim() && !matches.length && (
        <Text variant="footnote" tone="secondary">
          No country matches that. Check the spelling.
        </Text>
      )}
    </View>
  );
}
