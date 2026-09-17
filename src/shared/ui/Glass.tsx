import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { makeStyles, radius as radii, useTheme } from '@/shared/theme';

export interface GlassProps extends ViewProps {
  /**
   * `card` — translucent fill, no blur. Cheap enough for every card and list.
   * `chrome` — real blur on iOS for bars and sheets that float over moving content.
   *   Android gets a near-opaque fill instead: its blur re-renders every frame the
   *   content behind it moves, which is exactly when bars are on screen.
   */
  variant?: 'card' | 'chrome';
  radius?: number;
}

const useStyles = makeStyles(t => ({
  card: {
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  chromeSolid: {
    backgroundColor: t.colors.glass.chromeSolid,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  chromeBlur: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  tint: { backgroundColor: t.colors.glass.chromeTint },
}));

export function Glass({
  variant = 'card',
  radius = radii.lg,
  style,
  children,
  ...rest
}: GlassProps) {
  const styles = useStyles();
  const theme = useTheme();

  if (variant === 'chrome' && Platform.OS === 'ios') {
    return (
      <View {...rest} style={[styles.chromeBlur, { borderRadius: radius }, style]}>
        <BlurView tint={theme.blurTint} intensity={80} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
        {children}
      </View>
    );
  }

  return (
    <View
      {...rest}
      style={[
        variant === 'chrome' ? styles.chromeSolid : styles.card,
        { borderRadius: radius },
        style,
      ]}
    >
      {children}
    </View>
  );
}
