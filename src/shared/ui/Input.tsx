import { useState, type Ref } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { fonts, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
}

const useStyles = makeStyles(t => ({
  container: { gap: space.xs + 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: space.lg,
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: t.colors.glass.fill,
  },
  input: {
    flex: 1,
    paddingVertical: space.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: t.colors.text.primary,
  },
  label: { marginLeft: space.xs },
  message: { marginLeft: space.xs },
}));

/**
 * The focus ring animates on the UI thread from a shared value, so focusing and
 * blurring a field never re-renders the form around it.
 */
export function Input({
  label,
  error,
  hint,
  icon: Icon,
  containerStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  editable = true,
  ref,
  ...rest
}: InputProps) {
  const styles = useStyles();
  const theme = useTheme();
  const focus = useSharedValue(0);
  const [concealed, setConcealed] = useState(!!secureTextEntry);

  const idle = error ? theme.colors.danger : theme.colors.glass.border;
  const active = error ? theme.colors.danger : theme.colors.accent;

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [idle, active]),
  }));

  const handleFocus: TextInputProps['onFocus'] = e => {
    focus.set(withTiming(1, timing.state));
    onFocus?.(e);
  };
  const handleBlur: TextInputProps['onBlur'] = e => {
    focus.set(withTiming(0, timing.state));
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="footnote" tone="secondary" style={styles.label}>
          {label}
        </Text>
      )}
      <Animated.View style={[styles.field, fieldStyle, !editable && { opacity: 0.6 }]}>
        {Icon && <Icon size={18} color={theme.colors.text.tertiary} strokeWidth={2} />}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={concealed}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.colors.text.tertiary}
          selectionColor={theme.colors.accent}
          cursorColor={theme.colors.accent}
          keyboardAppearance={theme.scheme}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={[styles.input, rest.style]}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setConcealed(c => !c)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={concealed ? 'Show password' : 'Hide password'}
          >
            {concealed ? (
              <Eye size={18} color={theme.colors.text.secondary} strokeWidth={2} />
            ) : (
              <EyeOff size={18} color={theme.colors.text.secondary} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </Animated.View>
      {(error || hint) && (
        <Text
          variant="footnote"
          tone={error ? 'danger' : 'tertiary'}
          style={styles.message}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}
