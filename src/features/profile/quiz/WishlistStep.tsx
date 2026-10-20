import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';
import { makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Text } from '@/shared/ui/Text';
import type { HairLength, HairProfile } from '../types';

type Wishlist = Pick<
  HairProfile,
  'nextStyles' | 'nextLength' | 'nextColour' | 'nextUpkeep' | 'nextSit'
>;

const LENGTHS: { value: HairLength; label: string }[] = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'armpit', label: 'Armpit' },
  { value: 'bra-strap', label: 'Bra strap' },
  { value: 'mid-back', label: 'Mid-back' },
  { value: 'waist', label: 'Waist' },
  { value: 'hip', label: 'Hip or longer' },
];
const COLOURS: { value: NonNullable<Wishlist['nextColour']>; label: string }[] = [
  { value: 'natural', label: 'My natural colour' },
  { value: 'black', label: 'Black' },
  { value: 'brown', label: 'Brown' },
  { value: 'blonde', label: 'Blonde' },
  { value: 'red', label: 'Red' },
  { value: 'bold', label: 'A bold colour' },
];
const UPKEEP: { value: NonNullable<Wishlist['nextUpkeep']>; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
const SIT: { value: NonNullable<Wishlist['nextSit']>; label: string }[] = [
  { value: 'up_to_2', label: 'Up to 2 hours' },
  { value: '2_to_4', label: '2 to 4 hours' },
  { value: '4_to_6', label: '4 to 6 hours' },
  { value: '6_plus', label: '6 hours or more' },
];

// A few she'd like next is plenty; the server keeps up to ten.
const MAX_STYLES = 10;

const useStyles = makeStyles(() => ({
  groups: { gap: space.xl, paddingBottom: space.lg },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

/**
 * Her next style, a tap or two each: styles, length, colour, upkeep and time in the
 * chair. Tapping a choice again clears it.
 */
export function WishlistStep({
  value,
  onChange,
}: {
  value: Wishlist;
  onChange: <K extends keyof Wishlist>(field: K, value: Wishlist[K]) => void;
}) {
  const styles = useStyles();
  // The same list, and cache, as the looks feed's style filters.
  const { data: taxonomy = [] } = useQuery({
    queryKey: ['styles'],
    queryFn: async () => (await apiClient.get<{ id: string; name: string }[]>('/api/styles/')).data,
    staleTime: 60 * 60 * 1000,
  });
  const picked = value.nextStyles ?? [];

  const one = <K extends 'nextLength' | 'nextColour' | 'nextUpkeep' | 'nextSit'>(
    field: K,
    title: string,
    options: { value: NonNullable<Wishlist[K]>; label: string }[]
  ) => (
    <View style={styles.group}>
      <Text variant="bodyStrong">{title}</Text>
      <View style={styles.chips}>
        {options.map(option => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value[field] === option.value}
            onPress={() =>
              onChange(
                field,
                (value[field] === option.value ? undefined : option.value) as Wishlist[K]
              )
            }
          />
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.groups}>
        <View style={styles.group}>
          <Text variant="bodyStrong">Styles you’d like</Text>
          <View style={styles.chips}>
            {taxonomy.map(style => {
              const selected = picked.includes(style.id);
              return (
                <Chip
                  key={style.id}
                  label={style.name}
                  selected={selected}
                  onPress={() =>
                    onChange(
                      'nextStyles',
                      selected
                        ? picked.filter(id => id !== style.id)
                        : [...picked, style.id].slice(-MAX_STYLES)
                    )
                  }
                />
              );
            })}
          </View>
        </View>
        {one('nextLength', 'Length', LENGTHS)}
        {one('nextColour', 'Colour', COLOURS)}
        {one('nextUpkeep', 'Upkeep', UPKEEP)}
        {one('nextSit', 'Time in the chair', SIT)}
      </View>
    </ScrollView>
  );
}
