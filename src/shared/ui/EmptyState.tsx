import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const useStyles = makeStyles(t => ({
  wrap: { alignItems: 'center', paddingVertical: space.huge, paddingHorizontal: space.xxl, gap: space.md },
  well: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginBottom: space.xs,
  },
  action: { marginTop: space.sm },
}));

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.well}>
        <Icon size={28} color={theme.colors.accent} strokeWidth={2} />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="subhead" tone="secondary" align="center">
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} size="md" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}
