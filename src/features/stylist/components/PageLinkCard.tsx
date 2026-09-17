import { View } from 'react-native';
import { Globe, Share } from 'lucide-react-native';
import { haptics } from '@/shared/lib/haptics';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';
import { PUBLIC_HOST, sharePage } from '../format';
import type { StylistProfile } from '../types';

const useStyles = makeStyles(t => ({
  body: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  well: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  text: { flex: 1, gap: 2 },
}));

/** Her public page — the link for her Instagram bio, one tap to share. */
export function PageLinkCard({ profile }: { profile: StylistProfile }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={styles.well}>
            <Globe size={20} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.text}>
            <Text variant="overline" tone="tertiary">
              Your page
            </Text>
            <Text variant="callout" numberOfLines={1} selectable>
              {PUBLIC_HOST}/{profile.handle}
            </Text>
          </View>
        </View>
        <Text variant="subhead" tone="secondary">
          Put it in your bio. It answers prices, styles and policies before anyone has to DM you.
        </Text>
        <Button
          label="Share your page"
          icon={Share}
          variant="secondary"
          size="md"
          fullWidth
          onPress={() => {
            haptics.light();
            sharePage(profile);
          }}
        />
      </View>
    </Card>
  );
}
