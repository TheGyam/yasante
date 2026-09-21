import { ScrollView } from 'react-native';
import { ChevronDown, MapPin, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useUser, useUserStore } from '@/features/profile';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { confirm } from '@/shared/ui/dialog';
import { useLookFilters } from '../filters';
import { useLookAreas, useStyleTaxonomy } from '../hooks';
import type { LookFilters } from '../types';

const useStyles = makeStyles(() => ({
  bar: { marginHorizontal: -GUTTER },
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
}));

/** Her curl pattern, from the account or, before signing up, this device. */
function useTexture() {
  const { user } = useAuth();
  const { data: account } = useUser(user?.id, { enabled: !!user?.id });
  const local = useUserStore(s => s.hairProfile);
  return account?.hairProfile?.texture ?? local?.texture;
}

/** What the feed is narrowed to right now, as the API takes it. */
export function useFeedQuery(): { query: LookFilters; filtered: boolean } {
  const texture = useTexture();
  const filters = useLookFilters();
  const query = {
    hair: filters.hairLikeMine ? texture : undefined,
    style: filters.style,
    area: filters.area,
  };
  return { query, filtered: !!(query.hair || query.style || query.area) };
}

/**
 * The feed's filters: hair like mine, area, and every style. Shared by the home
 * grid and the looks screen, so a filter set in one is set in both.
 */
export function LookFilterBar({ inset = true }: { inset?: boolean }) {
  const styles = useStyles();
  const router = useRouter();
  const texture = useTexture();
  const filters = useLookFilters();
  const { data: taxonomy = [] } = useStyleTaxonomy();
  useLookAreas(); // warmed now, so the area picker opens full

  const toggleHair = async () => {
    if (filters.hairLikeMine) return filters.setHairLikeMine(false);
    if (texture) return filters.setHairLikeMine(true);
    const go = await confirm({
      title: 'Tell us about your hair first',
      message: 'Your curl pattern is what "hair like mine" matches on. It takes a moment.',
      confirmLabel: 'Add it',
    });
    if (go) router.push('/hair-profile/texture');
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={inset ? styles.bar : undefined}
      contentContainerStyle={styles.row}
    >
      <Chip
        label="Hair like mine"
        icon={Sparkles}
        selected={filters.hairLikeMine && !!texture}
        onPress={toggleHair}
      />
      <Chip
        label={filters.area ?? 'Anywhere'}
        icon={filters.area ? MapPin : ChevronDown}
        selected={!!filters.area}
        onPress={() => router.push('/looks/area')}
        accessibilityLabel={`Area: ${filters.area ?? 'anywhere'}`}
      />
      {taxonomy.map(style => (
        <Chip
          key={style.id}
          label={style.name}
          selected={filters.style === style.id}
          onPress={() => filters.setStyle(filters.style === style.id ? undefined : style.id)}
        />
      ))}
    </ScrollView>
  );
}
