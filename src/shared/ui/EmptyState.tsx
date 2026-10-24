import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Float } from './Motion';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** The action is under way (trying again): its button spins and can't be pressed twice. */
  actionLoading?: boolean;
}

const useStyles = makeStyles(t => ({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.huge,
    paddingHorizontal: space.xxl,
    gap: space.md,
  },
  well: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginBottom: space.xs,
  },
  // Stretch so long copy wraps inside the gutter instead of sizing to one line.
  text: { alignSelf: 'stretch' },
  action: { marginTop: space.sm },
}));

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  actionLoading,
}: EmptyStateProps) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {/* A slow bob: an empty screen still feels alive. */}
      <Float style={styles.well}>
        <Icon size={28} color={theme.colors.accent} strokeWidth={2} />
      </Float>
      <Text variant="title3" align="center" style={styles.text}>
        {title}
      </Text>
      {message && (
        <Text variant="subhead" tone="secondary" align="center" style={styles.text}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          size="md"
          onPress={onAction}
          loading={actionLoading}
          style={styles.action}
        />
      )}
    </View>
  );
}
