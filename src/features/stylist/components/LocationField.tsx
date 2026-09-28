import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { House, MapPin, PenLine } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import {
  joinAddress,
  POSTCODE,
  splitAddress as split,
  tidyPostcode as tidy,
} from '@/shared/utils/postcode';

/**
 * The names people use for where a postcode is: the constituency ("Peckham"), the
 * ward ("Rye Lane") and the borough ("Southwark"), from postcodes.io (free, no key,
 * UK open data). Long official names are left out; nobody says them.
 */
async function areasFor(postcode: string): Promise<string[]> {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ''))}`
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('Postcode lookup failed');
  const { result } = await response.json();
  const names: string[] = [
    result.parliamentary_constituency,
    result.admin_ward,
    result.admin_district,
  ].filter((n): n is string => !!n && n.length <= 24 && !/ and |,/.test(n));
  return [...new Set(names)];
}

const useStyles = makeStyles(() => ({
  group: { gap: space.sm },
  label: { marginLeft: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginLeft: space.xs },
}));

/**
 * Where she works, from a postcode: we offer the area names it's known by, she taps
 * the one her clients would say, and that's all anyone sees. Working from a salon or
 * home, she adds the street too, kept back until she confirms a booking.
 */
export function LocationField({
  baseArea,
  address,
  needsStreet,
  onChange,
}: {
  baseArea: string;
  address?: string;
  /** Clients come to her, so they'll need the street once a booking is confirmed. */
  needsStreet: boolean;
  onChange: (changes: { baseArea?: string; address?: string }) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [postcode, setPostcode] = useState(() => split(address).postcode);
  const [street, setStreet] = useState(() => split(address).street);
  const [typing, setTyping] = useState(false);

  const valid = POSTCODE.test(postcode.trim());
  const lookup = useQuery({
    queryKey: ['postcode', tidy(postcode)],
    queryFn: () => areasFor(postcode),
    enabled: valid,
    staleTime: Infinity,
    retry: 1,
  });
  const areas = lookup.data ?? [];

  // A fresh postcode picks its first name, unless she's already chosen one of them.
  useEffect(() => {
    if (areas.length && !areas.includes(baseArea) && !typing) onChange({ baseArea: areas[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas]);

  const save = (next: { street?: string; postcode?: string }) =>
    onChange({ address: joinAddress(next.street ?? street, next.postcode ?? postcode) });

  const notFound = valid && lookup.isSuccess && areas.length === 0;

  return (
    <View style={styles.group}>
      <Input
        label="Your postcode"
        icon={MapPin}
        value={postcode}
        onChangeText={text => {
          setPostcode(text);
          save({ postcode: text });
        }}
        placeholder="SE15 4QJ"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="postal-code"
        textContentType="postalCode"
        maxLength={8}
        error={
          notFound
            ? 'We couldn’t find that postcode. Check it, or type your area below.'
            : undefined
        }
        hint={valid ? undefined : 'We use it to name your area. It’s never shown.'}
        testID="setup-postcode"
      />

      {valid && lookup.isFetching && (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text variant="footnote" tone="secondary">
            Finding your area…
          </Text>
        </View>
      )}

      {(areas.length > 0 || notFound || lookup.isError || typing) && (
        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            What clients see — pick what they’d call it
          </Text>
          <View style={styles.chips}>
            {areas.map(area => (
              <Chip
                key={area}
                label={area}
                selected={!typing && baseArea === area}
                onPress={() => {
                  setTyping(false);
                  onChange({ baseArea: area });
                }}
              />
            ))}
            <Chip
              label="Something else"
              icon={PenLine}
              selected={typing || (!!baseArea && !areas.includes(baseArea))}
              onPress={() => setTyping(true)}
            />
          </View>
          {(typing || notFound || lookup.isError || (!!baseArea && !areas.includes(baseArea))) && (
            <Input
              label="Your area"
              value={baseArea}
              onChangeText={text => onChange({ baseArea: text })}
              placeholder="Peckham"
              autoCapitalize="words"
              hint="A district or neighbourhood — never your address"
              testID="setup-area"
            />
          )}
        </View>
      )}

      {needsStreet && (
        <Input
          label="House number and street"
          icon={House}
          value={street}
          onChangeText={text => {
            setStreet(text);
            save({ street: text });
          }}
          placeholder="12 Bellenden Road"
          autoCapitalize="words"
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          hint="Private. Only clients whose booking you’ve confirmed get it."
          testID="setup-street"
        />
      )}
    </View>
  );
}
