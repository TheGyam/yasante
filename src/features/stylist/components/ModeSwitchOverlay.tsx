import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { Scissors, Sparkles } from 'lucide-react-native';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { AmbientBackground } from '@/shared/ui/AmbientBackground';
import { Text } from '@/shared/ui/Text';
import { useModeStore } from '../mode';

const ENTER = FadeIn.duration(200).easing(EASE_OUT);
const EXIT = FadeOut.duration(280).easing(EASE_OUT);
// Long enough to read as a deliberate change of place, short enough not to wait on.
const FLIP_AT = 420;
const LIFT_AT = 820;

const useStyles = makeStyles(t => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  well: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
}));

/**
 * The moment between modes, like Airbnb's switch to hosting: the app fades behind a
 * card, the tabs change underneath, and the card lifts. The route guard does the
 * actual swap when the stored mode changes.
 */
export function ModeSwitchOverlay() {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const switchingTo = useModeStore(s => s.switchingTo);

  useEffect(() => {
    if (!switchingTo) return;
    const { setMode, endSwitch } = useModeStore.getState();
    const flip = setTimeout(() => setMode(switchingTo), reduced ? 0 : FLIP_AT);
    const lift = setTimeout(endSwitch, reduced ? 60 : LIFT_AT);
    return () => {
      clearTimeout(flip);
      clearTimeout(lift);
    };
  }, [switchingTo, reduced]);

  if (!switchingTo) return null;

  const Icon = switchingTo === 'stylist' ? Scissors : Sparkles;
  return (
    <Animated.View
      entering={ENTER}
      exiting={EXIT}
      style={StyleSheet.absoluteFill}
      accessibilityLiveRegion="polite"
    >
      <AmbientBackground />
      <View style={styles.center}>
        <View style={styles.well}>
          <Icon size={32} color={theme.colors.accent} strokeWidth={2} />
        </View>
        <Text variant="title2">
          {switchingTo === 'stylist' ? 'Switching to stylist mode' : 'Switching to client mode'}
        </Text>
      </View>
    </Animated.View>
  );
}
