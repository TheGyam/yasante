import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react-native';
import { radius, space, useTheme } from '@/shared/theme';
import { Text } from './Text';

const subscribe = (change: () => void) => onlineManager.subscribe(change);
const online = () => onlineManager.isOnline();

/**
 * Over every screen while the phone has no connection: what she sees is what was
 * saved, and anything she loads waits until it's back. Gone the moment it is.
 */
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, online, online);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (isOnline) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.xs }]}>
      <Animated.View
        entering={FadeInUp.duration(200)}
        exiting={FadeOutUp.duration(200)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.pill, { backgroundColor: theme.colors.text.primary }]}
      >
        <WifiOff size={14} color={theme.colors.bg} strokeWidth={2.4} />
        <Text variant="footnote" style={{ color: theme.colors.bg }}>
          You’re offline. Showing what was saved.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
});
