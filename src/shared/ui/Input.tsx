import { useEffect, useState, type Ref } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { fonts, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  /** Sits inside the field like a placeholder, and floats up once you focus or type. */
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
}

const TEXT_TOP = 26;
const LABEL_TOP = 18;
const FLOAT_Y = -12;
const FLOAT_SCALE = 0.76;

const useStyles = makeStyles(t => ({
  container: { gap: space.xs + 2 },
  field: {
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: space.lg,
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: t.colors.glass.fill,
  },
  icon: { height: 58, justifyContent: 'center' },
  body: { flex: 1 },
  input: {
    paddingTop: TEXT_TOP,
    paddingBottom: 11,
    paddingHorizontal: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    color: t.colors.text.primary,
    includeFontPadding: false,
  },
  overlay: { position: 'absolute', left: 0, right: 0 },
  label: {
    top: LABEL_TOP,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    transformOrigin: 'left center',
  },
  placeholder: {
    top: TEXT_TOP,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    color: t.colors.text.tertiary,
  },
  toggle: { height: 58, justifyContent: 'center' },
  message: { marginLeft: space.xs },
}));

/**
 * A text field whose label starts inside it and floats up as you focus or type, with
 * the example placeholder fading in beneath. Focus, float and the error shake all run
 * on the UI thread, so none of them re-render the form around the field.
 */
export function Input({
  label,
  error,
  hint,
  icon: Icon,
  containerStyle,
  secureTextEntry,
  placeholder,
  value,
  onFocus,
  onBlur,
  editable = true,
  multiline,
  style,
  ref,
  ...rest
}: InputProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [concealed, setConcealed] = useState(!!secureTextEntry);

  const focus = useSharedValue(0);
  const filled = useSharedValue(value ? 1 : 0);
  const shake = useSharedValue(0);

  useEffect(() => {
    filled.set(withTiming(value ? 1 : 0, timing.state));
  }, [value, filled]);

  // A new error nudges the field side to side — the same frame as the error haptic.
  useEffect(() => {
    if (!error || reduced) return;
    shake.set(
      withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 80 }),
        withTiming(-4, { duration: 70 }),
        withTiming(3, { duration: 60 }),
        withTiming(0, { duration: 50 })
      )
    );
  }, [error, reduced, shake]);

  const colors = theme.colors;
  const border = error ? colors.danger : colors.glass.border;
  const ring = error ? colors.danger : colors.accent;
  const restLabel = colors.text.tertiary;
  const floatedLabel = error ? colors.danger : colors.text.secondary;
  const focusedLabel = error ? colors.danger : colors.accent;

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [border, ring]),
    transform: [{ translateX: shake.get() }],
  }));

  const labelStyle = useAnimatedStyle(() => {
    const float = Math.max(focus.get(), filled.get());
    return {
      color: interpolateColor(
        focus.get(),
        [0, 1],
        [interpolateColor(float, [0, 1], [restLabel, floatedLabel]), focusedLabel]
      ),
      transform: [
        { translateY: interpolate(float, [0, 1], [0, FLOAT_Y]) },
        { scale: interpolate(float, [0, 1], [1, FLOAT_SCALE]) },
      ],
    };
  });

  // The example only appears once the label has made room for it.
  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: focus.get() * (1 - filled.get()),
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
      <Animated.View style={[styles.field, fieldStyle, !editable && { opacity: 0.6 }]}>
        {Icon && (
          <View style={styles.icon}>
            <Icon size={18} color={colors.text.tertiary} strokeWidth={2} />
          </View>
        )}
        <View style={styles.body}>
          {!!placeholder && (
            <Animated.Text
              pointerEvents="none"
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              style={[styles.overlay, styles.placeholder, placeholderStyle]}
              importantForAccessibility="no"
            >
              {placeholder}
            </Animated.Text>
          )}
          <TextInput
            ref={ref}
            {...rest}
            value={value}
            multiline={multiline}
            editable={editable}
            secureTextEntry={concealed}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            keyboardAppearance={theme.scheme}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel={rest.accessibilityLabel ?? label}
            accessibilityHint={placeholder}
            textAlignVertical={multiline ? 'top' : 'center'}
            style={[styles.input, style]}
          />
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[styles.overlay, styles.label, labelStyle]}
            importantForAccessibility="no"
          >
            {label}
          </Animated.Text>
        </View>
        {secureTextEntry && (
          <Pressable
            style={styles.toggle}
            onPress={() => setConcealed(c => !c)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={concealed ? 'Show password' : 'Hide password'}
          >
            {concealed ? (
              <Eye size={18} color={colors.text.secondary} strokeWidth={2} />
            ) : (
              <EyeOff size={18} color={colors.text.secondary} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </Animated.View>
      {(error || hint) && (
        <Animated.View entering={FadeIn.duration(180)} key={error || hint}>
          <Text
            variant="footnote"
            tone={error ? 'danger' : 'tertiary'}
            style={styles.message}
            accessibilityLiveRegion={error ? 'polite' : 'none'}
          >
            {error || hint}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
