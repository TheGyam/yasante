import { Check, Globe, MapPin } from 'lucide-react-native';
import { useLookAreas, useLookFilters } from '@/features/looks';
import { useRouter } from '@/shared/lib/navigation';
import { useTheme } from '@/shared/theme';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { LoadError } from '@/shared/ui/LoadError';

/** Where the work was done. Districts only — the same as a stylist's page shows. */
export default function LookAreaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: areas = [], isLoading, isError, error, refetch, isRefetching } = useLookAreas();
  const area = useLookFilters(s => s.area);
  const setArea = useLookFilters(s => s.setArea);

  const pick = (next?: string) => {
    setArea(next);
    router.back();
  };
  const tick = <Check size={18} color={theme.colors.accent} strokeWidth={2.4} />;

  return (
    <Screen title="Area" modal testID="look-area">
      {isLoading ? (
        <Skeleton height={200} />
      ) : isError && !areas.length ? (
        <LoadError what="the areas" error={error} onRetry={refetch} retrying={isRefetching} />
      ) : (
        <Section footer="Only districts with looks in them are listed.">
          <ListRow
            title="Anywhere"
            icon={Globe}
            iconTone={area ? 'neutral' : 'accent'}
            trailing={area ? null : tick}
            onPress={() => pick(undefined)}
          />
          {areas.map(name => (
            <ListRow
              key={name}
              title={name}
              icon={MapPin}
              iconTone={area === name ? 'accent' : 'neutral'}
              trailing={area === name ? tick : null}
              onPress={() => pick(name)}
              testID={`area-${name}`}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}
