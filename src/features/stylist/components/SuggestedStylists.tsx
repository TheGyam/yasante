import { ScrollView, View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, radius, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Glass } from '@/shared/ui/Glass';
import { PressableScale } from '@/shared/ui/PressableScale';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Text } from '@/shared/ui/Text';
import { useSuggestedStylists } from '../hooks';

const CARD_WIDTH = 148;

const useStyles = makeStyles(() => ({
  section: { gap: space.sm },
  // Runs edge to edge, with the first card lined up with everything else.
  row: { gap: space.sm, paddingHorizontal: GUTTER },
  scroller: { marginHorizontal: -GUTTER },
  card: { width: CARD_WIDTH, padding: space.md, gap: space.xs, alignItems: 'center' },
}));

/** "Stylists for you": a row of stylists whose work matches what she's drawn to. */
export function SuggestedStylists() {
  const styles = useStyles();
  const router = useRouter();
  const { data: stylists = [] } = useSuggestedStylists();
  if (!stylists.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title="Stylists for you" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}
      >
        {stylists.map(stylist => (
          <PressableScale
            key={stylist.accountId}
            accessibilityLabel={`${stylist.displayName}, ${stylist.baseArea}. ${stylist.reason ?? ''} Open their page`}
            onPress={() => router.push(`/stylist/${stylist.handle}`)}
          >
            <Glass radius={radius.lg} style={styles.card}>
              <Avatar uri={stylist.avatarUri} name={stylist.displayName} size={56} />
              <Text variant="callout" numberOfLines={1}>
                {stylist.displayName}
              </Text>
              <Text variant="footnote" tone="secondary" numberOfLines={2} align="center">
                {stylist.reason ?? stylist.baseArea}
              </Text>
            </Glass>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}
