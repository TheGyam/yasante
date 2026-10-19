import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check, Droplets, Plus, Ruler, Scissors, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, space, useTheme } from '@/shared/theme';
import { haptics } from '@/shared/lib/haptics';
import { Card } from '@/shared/ui/Card';
import { notify } from '@/shared/ui/dialog';
import { ListRow } from '@/shared/ui/ListRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Rise } from '@/shared/ui/Rise';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { hairTraits } from '../format';
import { sinceLast, useHairLog, useLogHair, type HairLogKind } from '../hairLog';
import { useUser } from '../hooks';
import { useUserStore } from '../store';
import { lengthIsStale, progressOf, sectionSummary, SECTIONS } from './sections';
import { StrandArt } from './TextureStep';
import { SEP } from '@/shared/lib/format';

/** One tap each, dated by the phone. */
const LOGGABLE: { kind: HairLogKind; title: string; icon: LucideIcon }[] = [
  { kind: 'trim', title: 'I had a trim', icon: Scissors },
  { kind: 'wash', title: 'Wash day done', icon: Droplets },
];

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { alignItems: 'center', gap: space.md },
  progress: { alignSelf: 'stretch', gap: space.xs },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nudgeText: { flex: 1, gap: 2 },
}));

/**
 * Her hair profile, a section at a time. Nothing has to be done in one go: each
 * part saves on its own, and what's missing says so plainly.
 */
export function HairProfileHub() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const log = useHairLog(isAuthenticated);
  const logHair = useLogHair();
  const { data: account } = useUser(user?.id);
  const local = useUserStore(s => s.hairProfile);
  const profile = { ...local, ...account?.hairProfile };
  const { done, total, next } = progressOf(profile);
  const stale = lengthIsStale(profile);

  const open = (key: string) => router.push(`/hair-profile/${key}`);

  // One tap, dated by the phone: time since a trim, and which day she washes.
  const note = (kind: HairLogKind) =>
    logHair.mutate(kind, {
      onSuccess: () => haptics.success(),
      onError: () => {
        haptics.error();
        notify({ title: 'Couldn’t save that', message: 'Check your connection and try again.' });
      },
    });

  return (
    <Screen title="Your hair" modal testID="hair-profile-hub">
      <View style={styles.body}>
        <View style={styles.head}>
          {profile.texture && <StrandArt texture={profile.texture} selected height={110} />}
          <View style={styles.progress}>
            <ProgressBar progress={done / total} height={6} />
            <Text variant="footnote" tone="secondary" align="center">
              {done === total
                ? 'All of it — thank you. Change anything whenever it changes.'
                : `${done} of ${total} answered${next ? `${SEP}${next.name} next` : ''}`}
            </Text>
          </View>
        </View>

        {stale && (
          <Rise>
            <Card onPress={() => open('length')} accessibilityLabel="Check your length">
              <View style={styles.nudge}>
                <Ruler size={22} color={theme.colors.accent} />
                <View style={styles.nudgeText}>
                  <Text variant="bodyStrong">It’s been a month. Has it grown?</Text>
                  <Text variant="footnote" tone="secondary">
                    One drag. Over a year, it’s your growth curve.
                  </Text>
                </View>
              </View>
            </Card>
          </Rise>
        )}

        <Section footer="Each part saves on its own. Only you and stylists you book see it.">
          {SECTIONS.map(section => {
            const summary = sectionSummary(section.key, profile, hairTraits);
            return (
              <ListRow
                key={section.key}
                title={section.name}
                subtitle={summary || undefined}
                value={summary ? undefined : 'Add'}
                icon={summary ? Check : Plus}
                iconTone={summary ? 'success' : 'accent'}
                onPress={() => open(section.key)}
                testID={`section-${section.key}`}
              />
            );
          })}
        </Section>

        {isAuthenticated && (
          <Section
            title="Between appointments"
            footer="Over time this shows how often you trim and wash, and which day is wash day."
          >
            {LOGGABLE.map(({ kind, title, icon }) => {
              const last = sinceLast(log.data, kind);
              const doneToday = last === 'Today';
              return (
                <ListRow
                  key={kind}
                  title={title}
                  subtitle={last ? `Last: ${last}` : 'Tap when it happens'}
                  icon={icon}
                  iconTone={doneToday ? 'success' : 'neutral'}
                  // Once a day is enough: a second tap would count a second trim.
                  onPress={doneToday ? undefined : () => note(kind)}
                  trailing={
                    doneToday ? (
                      <Animated.View entering={ZoomIn.duration(240).easing(EASE_OUT)}>
                        <Check size={20} color={theme.colors.success} strokeWidth={2.4} />
                      </Animated.View>
                    ) : null
                  }
                  accessibilityLabel={doneToday ? `${title}, noted today` : title}
                  testID={`log-${kind}`}
                />
              );
            })}
          </Section>
        )}
      </View>
    </Screen>
  );
}
