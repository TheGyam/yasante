import { View } from 'react-native';
import { makeStyles, space } from '@/shared/theme';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

const useStyles = makeStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.md,
  },
  title: { flex: 1 },
}));

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text variant="title3" style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <Text variant="callout" tone="accent" onPress={onAction} suppressHighlighting>
          {actionLabel}
        </Text>
      )}
    </View>
  );
}
