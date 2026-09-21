import type { Ref } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { fonts, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SearchFieldProps extends Omit<TextInputProps, 'style'> {
  placeholder: string;
  /** Given `onPress`, the field is a button that opens a search screen. */
  onPress?: () => void;
  ref?: Ref<TextInput>;
}

const useStyles = makeStyles(t => ({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: t.colors.text.primary },
  placeholder: { flex: 1 },
}));

export function SearchField({
  placeholder,
  onPress,
  value,
  onChangeText,
  ref,
  ...rest
}: SearchFieldProps) {
  const styles = useStyles();
  const theme = useTheme();
  const icon = <Search size={18} color={theme.colors.text.tertiary} strokeWidth={2.2} />;

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={styles.field}
      >
        {icon}
        <Text variant="body" tone="tertiary" numberOfLines={1} style={styles.placeholder}>
          {placeholder}
        </Text>
      </PressableScale>
    );
  }

  return (
    <View style={styles.field}>
      {icon}
      <TextInput
        ref={ref}
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        selectionColor={theme.colors.accent}
        cursorColor={theme.colors.accent}
        keyboardAppearance={theme.scheme}
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={1.4}
        accessibilityRole="search"
        style={styles.input}
      />
      {!!value && (
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText?.('')}
        >
          <X size={18} color={theme.colors.text.secondary} strokeWidth={2.2} />
        </Pressable>
      )}
    </View>
  );
}
