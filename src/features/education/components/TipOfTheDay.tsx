import { View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';
import { tipOfTheDay } from '../content';

const useStyles = makeStyles(t => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginBottom: space.md },
  well: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.warningSoft,
  },
}));

export function TipOfTheDay() {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.well}>
          <Lightbulb size={16} color={theme.colors.gold} strokeWidth={2.2} />
        </View>
        <Text variant="overline" tone="tertiary">
          Tip of the day
        </Text>
      </View>
      <Text variant="body">{tipOfTheDay()}</Text>
    </Card>
  );
}
