import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { fonts, makeStyles, space } from '@/shared/theme';
import { Text } from './Text';

/** The app icon's "y", traced from assets/icon.png (1024 × 1024), so every mark matches it. */
export const ICON_Y = 'M310 245H430L512 478L597 245H716L486 776H375L451 607Z';
export const ICON_BG = '#0B0709';
export const ICON_PINK = '#FF8FB8';

/** The app icon itself, at any size. */
export function AppIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityElementsHidden>
      <Rect width={1024} height={1024} rx={230} fill={ICON_BG} />
      <Path d={ICON_Y} fill={ICON_PINK} />
    </Svg>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  word: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
}));

export function BrandMark() {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Yasante">
      <AppIcon />
      <Text style={styles.word}>yasante</Text>
    </View>
  );
}
