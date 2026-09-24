import { View } from 'react-native';
import { Check, Droplets, Plus, Ruler, Scissors } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space, useTheme } from '@/shared/theme';
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
                : `${done} of ${total} answered${next ? ` · ${next.name} next` : ''}`}
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
            footer="Tap when it happens. Over time it shows how often you trim and wash."
          >
            <ListRow
              title="I had a trim"
              subtitle={
                sinceLast(log.data, 'trim') ? `Last: ${sinceLast(log.data, 'trim')}` : undefined
              }
              icon={Scissors}
              iconTone="neutral"
              onPress={() => note('trim')}
              testID="log-trim"
            />
            <ListRow
              title="Wash day done"
              subtitle={
                sinceLast(log.data, 'wash') ? `Last: ${sinceLast(log.data, 'wash')}` : undefined
              }
              icon={Droplets}
              iconTone="neutral"
              onPress={() => note('wash')}
              testID="log-wash"
            />
          </Section>
        )}
      </View>
    </Screen>
  );
}
