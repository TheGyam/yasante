import { ScrollView } from 'react-native';
import { ChevronDown, MapPin, Waves } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useUser, useUserStore } from '@/features/profile';
import { useQuery } from '@tanstack/react-query';
import { useConsentStore } from '@/shared/config/consentStore';
import { getRecentSearches } from '@/shared/utils/searchHistory';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { confirm } from '@/shared/ui/dialog';
import { searchedStyles, useLookFilters } from '../filters';
import { useLookAreas, useStyleTaxonomy } from '../hooks';
import type { LookFilters } from '../types';

const useStyles = makeStyles(() => ({
  bar: { marginHorizontal: -GUTTER },
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
}));

/**
 * Her curl pattern, from the account or, before signing up, this device. Only while
 * she lets us use her hair details: without that, nothing is matched on it.
 */
function useTexture() {
  const { user } = useAuth();
  const { data: account } = useUser(user?.id, { enabled: !!user?.id });
  const local = useUserStore(s => s.hairProfile);
  const allowed = useConsentStore(s => s.consents.personalisation?.granted ?? false);
  return allowed ? (account?.hairProfile?.texture ?? local?.texture) : undefined;
}

/** The key the feed reads recent searches under; searching refreshes it. */
export const RECENT_SEARCHES = ['recent-searches'];

/** Styles from her recent searches, kept on her phone, for the feed to mix in. */
function useSearchedStyles() {
  const recent = useQuery({ queryKey: RECENT_SEARCHES, queryFn: getRecentSearches });
  const taxonomy = useStyleTaxonomy();
  const queries = (recent.data ?? []).map(item => item.query);
  // Ready once it's known, so the feed loads once rather than reshuffling as these arrive.
  // Without the style list (offline, say) it goes ahead without them.
  const ready = recent.isFetched && (!queries.length || taxonomy.isFetched);
  return { styles: searchedStyles(queries, taxonomy.data ?? []), ready };
}

/** What the feed is narrowed to right now, as the API takes it. */
export function useFeedQuery(): { query: LookFilters; filtered: boolean; ready: boolean } {
  const texture = useTexture();
  const filters = useLookFilters();
  const { styles: searched, ready } = useSearchedStyles();
  const query = {
    hair: filters.hairLikeMine ? texture : undefined,
    style: filters.style,
    area: filters.area,
  };
  const filtered = !!(query.hair || query.style || query.area);
  // Mixed in without a label, and only into the everyday feed, not a chosen style or hair.
  const mix = !query.hair && !query.style && searched.length ? searched.join(',') : undefined;
  return { query: { ...query, searched: mix }, filtered, ready };
}

/**
 * The feed's filters: hair like mine, area, and every style. Shared by the home
 * grid and the looks screen, so a filter set in one is set in both.
 */
export function LookFilterBar({ inset = true }: { inset?: boolean }) {
  const styles = useStyles();
  const router = useRouter();
  const texture = useTexture();
  const hairAllowed = useConsentStore(s => s.consents.personalisation?.granted ?? false);
  const filters = useLookFilters();
  const { data: taxonomy = [] } = useStyleTaxonomy();
  useLookAreas(); // warmed now, so the area picker opens full

  const toggleHair = async () => {
    if (filters.hairLikeMine) return filters.setHairLikeMine(false);
    // Matching on her hair needs her yes first: ask for it instead of filtering.
    if (!hairAllowed) return router.push('/settings/privacy-choices?purpose=personalisation');
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
        icon={Waves}
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
