import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CalendarHeart, Droplets, FolderHeart, Plus } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  CollectionCard,
  describePlan,
  dueLabel,
  nextDue,
  useCarePlans,
  useCollections,
} from '@/features/planner';
import { SEP } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';

type PlannerView = 'collections' | 'plans';

const VIEWS = [
  { value: 'collections', label: 'Collections' },
  { value: 'plans', label: 'Care plans' },
] as const;

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  cell: { width: '50%', flexDirection: 'row' },
}));

export default function PlannerScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<PlannerView>('collections');

  const collections = useCollections();
  const plans = useCarePlans();

  // What's late, then what's next. A plan she's already done today is the least
  // useful row on the screen, so it sinks to the bottom on its own.
  const duePlans = useMemo(
    () => [...(plans.data ?? [])].sort((a, b) => +nextDue(a) - +nextDue(b)),
    [plans.data]
  );

  if (!isAuthenticated) {
    return (
      <Screen title="Planner" testID="planner-screen">
        <EmptyState
          icon={CalendarHeart}
          title="Plan your next look"
          message="Save what you like into collections, and keep a care plan for the hair you have now."
          actionLabel="Create a free account"
          onAction={() => router.push('/auth/join')}
        />
      </Screen>
    );
  }

  const active = view === 'collections' ? collections : plans;
  // Hers first; then ones she follows, which update as their authors change them.
  const own = (collections.data ?? []).filter(collection => !collection.following);
  const followed = (collections.data ?? []).filter(collection => collection.following);
  const grid = (list: typeof own) => (
    <View style={styles.grid}>
      {list.map(collection => (
        <View key={collection.id} style={styles.cell}>
          <CollectionCard
            collection={collection}
            onPress={() => router.push(`/collections/${collection.id}`)}
          />
        </View>
      ))}
    </View>
  );
  const create = () =>
    router.push(view === 'collections' ? '/collections/new' : '/care-plans/edit');

  return (
    <Screen
      title="Planner"
      testID="planner-screen"
      refreshing={active.isRefetching}
      onRefresh={() => active.refetch()}
      headerRight={
        <IconButton
          icon={Plus}
          variant="accent"
          size={36}
          accessibilityLabel={view === 'collections' ? 'New collection' : 'New care plan'}
          onPress={create}
        />
      }
    >
      <View style={styles.body}>
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />

        {active.isLoading ? (
          <Skeleton height={200} />
        ) : view === 'collections' ? (
          collections.data?.length ? (
            <View style={styles.body}>
              {own.length > 0 && grid(own)}
              {followed.length > 0 && (
                <View>
                  <SectionHeader title="Tagging along" />
                  {grid(followed)}
                </View>
              )}
            </View>
          ) : (
            <EmptyState
              icon={FolderHeart}
              title="Nothing saved yet"
              message="Save a look or an article and it lands in a collection — private unless you say otherwise."
              actionLabel="Start a collection"
              onAction={create}
            />
          )
        ) : duePlans.length ? (
          <Section footer="Marking a plan done is what moves its next date.">
            {duePlans.map(plan => (
              <ListRow
                key={plan.id}
                title={plan.name}
                subtitle={
                  plan.following
                    ? `By ${plan.following.author.name.split(' ')[0]}${SEP}${describePlan(plan)}`
                    : describePlan(plan)
                }
                value={dueLabel(plan)}
                icon={Droplets}
                onPress={() => router.push(`/care-plans/${plan.id}`)}
                testID={`plan-${plan.id}`}
              />
            ))}
          </Section>
        ) : (
          <EmptyState
            icon={Droplets}
            title="No care plan yet"
            message="Wash day, oiling, a protein treatment — write the steps once and keep the rhythm."
            actionLabel="Write a care plan"
            onAction={create}
          />
        )}
      </View>
    </Screen>
  );
}
