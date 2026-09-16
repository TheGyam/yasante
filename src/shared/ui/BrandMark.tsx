import { View } from 'react-native';
import { fonts, makeStyles, radius, space } from '@/shared/theme';
import { Text } from './Text';

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  tile: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
  letter: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 22, color: t.colors.text.onAccent },
  word: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
}));

export function BrandMark() {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Yasante">
      <View style={styles.tile}>
        <Text style={styles.letter}>Y</Text>
      </View>
      <Text style={styles.word}>yasante</Text>
    </View>
  );
}
