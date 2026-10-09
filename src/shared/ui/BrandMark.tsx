import { View } from 'react-native';
import { Image } from 'expo-image';
import { fonts, makeStyles, space } from '@/shared/theme';
import { Text } from './Text';

// The app icon (assets/icon.png), small enough to show crisp at any size used here.
const ICON = require('../../../assets/app-icon-small.png');

/** The app icon itself, at any size, with the corners a home screen gives it. */
export function AppIcon({ size = 34 }: { size?: number }) {
  return (
    <Image
      source={ICON}
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
      accessibilityElementsHidden
    />
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
