import { View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';
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

/** The tips, edited on the server; kept on the phone so the card never waits. */
function useTips() {
  return useQuery({
    queryKey: ['content', 'tips'],
    queryFn: async () =>
      (await apiClient.get<{ id: number; text: string }[]>('/api/tips/')).data.map(t => t.text),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function TipOfTheDay() {
  const styles = useStyles();
  const theme = useTheme();
  const { data: tips } = useTips();

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
      <Text variant="body">{tipOfTheDay(new Date(), tips)}</Text>
    </Card>
  );
}
