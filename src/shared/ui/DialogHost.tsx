import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { EASE_OUT, makeStyles, radius, space } from '@/shared/theme';
import { Button } from './Button';
import { Glass } from './Glass';
import { Text } from './Text';
import { useDialogStore } from './dialog';

// Shared values rather than entering/exiting: layout animations don't run reliably
// inside a native modal.
const OPEN = { duration: 200, easing: EASE_OUT };

const useStyles = makeStyles(t => ({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: t.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
  },
  frame: { width: '100%', maxWidth: 380 },
  card: { padding: space.xl, gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
}));

/**
 * Draws whatever `confirm()` or `notify()` asked for. In a native modal, so it sits
 * above sheets and keeps the Android back button as "cancel".
 */
export function DialogHost() {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const dialog = useDialogStore(s => s.queue[0]);
  const answer = useDialogStore(s => s.answer);

  const shown = useSharedValue(0);
  useEffect(() => {
    if (!dialog) {
      shown.set(0);
      return;
    }
    shown.set(reduced ? 1 : withTiming(1, OPEN));
  }, [dialog, reduced, shown]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    // Rises from slightly small — never from nothing.
    transform: [{ scale: interpolate(shown.get(), [0, 1], [0.94, 1]) }],
  }));

  const cancellable = !!dialog?.cancelLabel;
  const close = () => dialog && answer(dialog.id, false);

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      {dialog && (
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onPress={cancellable ? close : undefined}
          />
          <Animated.View style={[styles.frame, cardStyle]}>
            {/* chrome, not card: a dialog has to obscure what it interrupts. */}
            <Glass
              variant="chrome"
              radius={radius.xl}
              style={styles.card}
              accessibilityViewIsModal
              accessibilityRole="alert"
            >
              <Text variant="title3" accessibilityRole="header">
                {dialog.title}
              </Text>
              {!!dialog.message && (
                <Text variant="body" tone="secondary">
                  {dialog.message}
                </Text>
              )}
              <View style={styles.actions}>
                <Button
                  label={dialog.confirmLabel ?? 'OK'}
                  variant={dialog.destructive ? 'danger' : 'primary'}
                  size="md"
                  haptic={dialog.destructive ? 'medium' : undefined}
                  onPress={() => answer(dialog.id, true)}
                  fullWidth
                  testID="dialog-confirm"
                />
                {cancellable && (
                  <Button
                    label={dialog.cancelLabel!}
                    variant="ghost"
                    size="md"
                    onPress={close}
                    fullWidth
                    testID="dialog-cancel"
                  />
                )}
              </View>
            </Glass>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}
