import { View } from 'react-native';
import { Check, Plus, Ruler } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { ListRow } from '@/shared/ui/ListRow';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Rise } from '@/shared/ui/Rise';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { hairTraits } from '../format';
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
  const { user } = useAuth();
  const { data: account } = useUser(user?.id);
  const local = useUserStore(s => s.hairProfile);
  const profile = { ...local, ...account?.hairProfile };
  const { done, total, next } = progressOf(profile);
  const stale = lengthIsStale(profile);

  const open = (key: string) => router.push(`/hair-profile/${key}`);

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
      </View>
    </Screen>
  );
}
