import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { fonts, makeStyles } from '@/shared/theme';
import { Text } from './Text';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

const useStyles = makeStyles(t => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: t.colors.accentSoft,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
  },
}));

function initials(name?: string | null) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const styles = useStyles();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.base, shape]} accessibilityRole="image" accessibilityLabel={name ?? 'Avatar'}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text
          tone="accent"
          style={{ fontFamily: fonts.semibold, fontSize: size * 0.38, lineHeight: size * 0.46 }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
