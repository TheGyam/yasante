import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { House, MapPin, PenLine } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { stylistApi } from '../api';
import {
  areasFor,
  joinAddress,
  POSTCODE,
  splitAddress as split,
  tidyPostcode as tidy,
} from '@/shared/utils/postcode';

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
  country = 'GB',
  baseArea,
  address,
  needsStreet,
  onChange,
}: {
  /** Her country (ISO 3166). The postcode lookup is the UK's; elsewhere she types it. */
  country?: string;
  baseArea: string;
  address?: string;
  /** Clients come to her, so they'll need the street once a booking is confirmed. */
  needsStreet: boolean;
  onChange: (changes: { baseArea?: string; address?: string }) => void;
}) {
  if (country !== 'GB')
    return (
      <WorldLocation
        country={country}
        baseArea={baseArea}
        address={address}
        needsStreet={needsStreet}
        onChange={onChange}
      />
    );
  return (
    <UkLocation
      baseArea={baseArea}
      address={address}
      needsStreet={needsStreet}
      onChange={onChange}
    />
  );
}

interface LocationProps {
  baseArea: string;
  address?: string;
  needsStreet: boolean;
  onChange: (changes: { baseArea?: string; address?: string }) => void;
}

/** "Osu" in "Accra, Greater Accra, Ghana" reads "Osu, Accra"; a city on its own stays as it is. */
const areaName = (place: { name: string; context: string }) => {
  const city = place.context.split(',')[0]?.trim();
  return city && city !== place.name ? `${place.name}, ${city}` : place.name;
};

/**
 * Outside the UK: she types her area and Mapbox suggests names to tap, or she keeps what
 * she typed. Only the words are saved. Her address, when clients come to her, she writes.
 */
function WorldLocation({
  country,
  baseArea,
  address,
  needsStreet,
  onChange,
}: LocationProps & { country: string }) {
  const styles = useStyles();
  const typed = useDebouncedValue(baseArea.trim(), 300);
  const [picked, setPicked] = useState(baseArea);
  const suggestions = useQuery({
    queryKey: ['places', country, typed],
    queryFn: () => stylistApi.places(typed, country),
    enabled: typed.length >= 2 && typed !== picked,
    staleTime: 60_000,
    retry: false,
  });
  const places = typed === picked ? [] : (suggestions.data ?? []);
  return (
    <View style={styles.group}>
      <Input
        label="Your area"
        icon={MapPin}
        value={baseArea}
        onChangeText={text => onChange({ baseArea: text })}
        placeholder="East Legon, Accra"
        autoCapitalize="words"
        hint="A neighbourhood and city clients know. Never your address."
        autoCorrect={false}
        testID="setup-area"
      />
      {places.length > 0 && (
        <View style={styles.group}>
          <View style={styles.chips}>
            {places.map(place => (
              <Chip
                key={`${place.name}|${place.context}`}
                label={areaName(place)}
                onPress={() => {
                  setPicked(areaName(place));
                  onChange({ baseArea: areaName(place) });
                }}
              />
            ))}
          </View>
          <Text variant="caption" tone="tertiary" style={styles.label}>
            Suggestions by Mapbox
          </Text>
        </View>
      )}
      {needsStreet && (
        <Input
          label="Your address"
          icon={House}
          value={address ?? ''}
          onChangeText={text => onChange({ address: text })}
          placeholder="House number, street and city"
          autoCapitalize="words"
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          multiline
          hint="Private. Only clients whose booking you’ve confirmed get it."
          testID="setup-street"
        />
      )}
    </View>
  );
}

/** In the UK: a postcode names her area, and the street finishes her address. */
function UkLocation({ baseArea, address, needsStreet, onChange }: LocationProps) {
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
