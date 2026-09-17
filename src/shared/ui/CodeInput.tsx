import { useEffect, useRef, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { EASE_OUT, fonts, makeStyles, radius, space, spring, useTheme } from '@/shared/theme';

export type CodeStatus = 'idle' | 'error' | 'success';

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once when the last digit lands. */
  onComplete?: (value: string) => void;
  length?: number;
  status?: CodeStatus;
  editable?: boolean;
  autoFocus?: boolean;
  ref?: Ref<TextInput>;
}

const CELL_HEIGHT = 60;

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', gap: space.sm },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.glass.fill,
  },
  digit: { fontFamily: fonts.semibold, fontSize: 26, color: t.colors.text.primary },
  caret: { width: 2, height: 26, borderRadius: 1, backgroundColor: t.colors.accent },
  // The real input sits over the cells: it gets the keyboard, paste and SMS autofill.
  input: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    opacity: Platform.OS === 'web' ? 0 : 0.011,
  },
}));

interface CellProps {
  char?: string;
  index: number;
  active: boolean;
  status: CodeStatus;
}

function Cell({ char, index, active, status }: CellProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const focus = useSharedValue(active ? 1 : 0);
  const caret = useSharedValue(1);
  const done = useSharedValue(0);

  // A digit lands with a small pop.
  useEffect(() => {
    if (!char || reduced) return;
    pop.set(0.72);
    pop.set(withSpring(1, spring.snap));
  }, [char, reduced, pop]);

  useEffect(() => {
    focus.set(withTiming(active ? 1 : 0, { duration: 160, easing: EASE_OUT }));
    // The caret blinks like the system's: on, off, on — only in the cell that's waiting.
    caret.set(1);
    if (active && !reduced) {
      caret.set(
        withRepeat(
          withSequence(withTiming(0, { duration: 530 }), withTiming(1, { duration: 530 })),
          -1
        )
      );
    }
  }, [active, reduced, focus, caret]);

  // Success ripples across the cells, left to right.
  useEffect(() => {
    if (status !== 'success') {
      done.set(0);
      return;
    }
    done.set(withDelay(index * 55, withTiming(1, { duration: 220, easing: EASE_OUT })));
    if (!reduced)
      pop.set(
        withDelay(
          index * 55,
          withSequence(withTiming(1.08, { duration: 110 }), withSpring(1, spring.settle))
        )
      );
  }, [status, index, reduced, done, pop]);

  const idle = status === 'error' ? theme.colors.danger : theme.colors.glass.border;
  const ring = status === 'error' ? theme.colors.danger : theme.colors.accent;
  const cellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      done.get(),
      [0, 1],
      [interpolateColor(focus.get(), [0, 1], [idle, ring]), theme.colors.success]
    ),
    backgroundColor: interpolateColor(
      done.get(),
      [0, 1],
      [theme.colors.glass.fill, theme.colors.successSoft]
    ),
  }));
  const digitStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.get() }));

  return (
    <Animated.View style={[styles.cell, cellStyle]}>
      {char ? (
        <Animated.Text style={[styles.digit, digitStyle]} maxFontSizeMultiplier={1.2}>
          {char}
        </Animated.Text>
      ) : (
        active && <Animated.View style={[styles.caret, caretStyle]} />
      )}
    </Animated.View>
  );
}

/**
 * A one-time code, one box per digit. Typing, pasting and the OS's SMS autofill all
 * go through a single real input laid over the boxes.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  status = 'idle',
  editable = true,
  autoFocus,
  ref,
}: CodeInputProps) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const inner = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const cells = Array.from({ length }, (_, i) => i);

  useEffect(() => {
    if (status !== 'error' || reduced) return;
    shake.set(
      withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 80 }),
        withTiming(-6, { duration: 70 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 50 })
      )
    );
  }, [status, reduced, shake]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length && value.length !== length) onComplete?.(digits);
  };

  return (
    <Pressable onPress={() => inner.current?.focus()} accessible={false}>
      <Animated.View style={[styles.row, rowStyle]}>
        {cells.map(i => (
          <Cell
            key={i}
            index={i}
            char={value[i]}
            active={editable && i === Math.min(value.length, length - 1) && value.length < length}
            status={status}
          />
        ))}
      </Animated.View>
      <TextInput
        ref={node => {
          inner.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as { current: TextInput | null }).current = node;
        }}
        value={value}
        // The caret is invisible, so keep it at the end: a tap anywhere must never leave
        // it mid-code, where backspace would do nothing and typing would insert.
        selection={{ start: value.length, end: value.length }}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        caretHidden
        contextMenuHidden={false}
        editable={editable}
        autoFocus={autoFocus}
        accessibilityLabel={`Verification code, ${length} digits`}
        accessibilityValue={{ text: value.split('').join(' ') }}
        style={styles.input}
      />
    </Pressable>
  );
}
