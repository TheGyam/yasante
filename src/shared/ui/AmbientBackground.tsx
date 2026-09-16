import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/shared/theme';

/**
 * The light behind the glass: three soft radial glows on the ground colour. Static —
 * drawn once per screen and never animated, so it costs nothing after first paint.
 */
export function AmbientBackground() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const [plum, rose, amber] = theme.colors.ambient;
  const strength = theme.scheme === 'dark' ? 0.55 : 0.75;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]}
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="ambient-a" cx="12%" cy="6%" r="58%">
            <Stop offset="0" stopColor={plum} stopOpacity={strength} />
            <Stop offset="1" stopColor={plum} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="ambient-b" cx="100%" cy="34%" r="46%">
            <Stop offset="0" stopColor={rose} stopOpacity={strength * 0.55} />
            <Stop offset="1" stopColor={rose} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="ambient-c" cx="30%" cy="104%" r="60%">
            <Stop offset="0" stopColor={amber} stopOpacity={strength * 0.4} />
            <Stop offset="1" stopColor={amber} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ambient-a)" />
        <Rect width="100%" height="100%" fill="url(#ambient-b)" />
        <Rect width="100%" height="100%" fill="url(#ambient-c)" />
      </Svg>
    </View>
  );
}
