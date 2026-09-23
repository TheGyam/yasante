import { createContext, useContext, type ReactNode } from 'react';
import { RefreshControl, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from '@/shared/lib/navigation';
import { useScrollToTop } from '@react-navigation/native';
import { ChevronLeft, X } from 'lucide-react-native';
import { GUTTER, fonts, makeStyles, space, useTheme } from '@/shared/theme';
import { Glass } from './Glass';
import { IconButton } from './IconButton';
import { HEADER_HEIGHT, sheetTop, useContentInsets } from './layout';
import { Text } from './Text';

export interface ScreenProps {
  children: ReactNode;
  /** Shown large at the top of the content, then compact in the bar once scrolled away. */
  title?: string;
  subtitle?: string;
  /** Show a back button that pops the stack. `false` hides even a modal's close button. */
  back?: boolean;
  /** Inside a modal: sheet-aware insets, and a close button unless `back` is set. */
  modal?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
  /**
   * `true` — the screen scrolls (default).
   * `false` — fixed content.
   * `'list'` — the screen renders its own list; wire it up with `useScreenScrollHandler`
   *   and `useContentInsets`, and put `<ScreenTitle>` in the list header.
   */
  scroll?: boolean | 'list';
  /** Forms: the scroll view keeps the focused field above the keyboard. */
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Apply the page gutter (default true). */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const ScrollContext = createContext<SharedValue<number> | null>(null);

/** Drive the screen's header from a list the screen renders itself. */
export function useScreenScrollHandler() {
  const scrollY = useContext(ScrollContext);
  return useAnimatedScrollHandler(e => {
    scrollY?.set(e.contentOffset.y);
  });
}

const useStyles = makeStyles(t => ({
  fill: { flex: 1 },
  padded: { paddingHorizontal: GUTTER },
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  barGlass: {
    flex: 1,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.separator,
  },
  barRow: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  barSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barRight: { justifyContent: 'flex-end' },
  barTitle: { flex: 1, alignItems: 'center' },
  barTitleText: { fontFamily: fonts.semibold },
  title: { gap: space.xs, marginBottom: space.xxl },
}));

/** The large title block. Use it directly as a list header on `scroll="list"` screens. */
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.title} accessibilityRole="header">
      <Text variant="title1">{title}</Text>
      {subtitle && (
        <Text variant="subhead" tone="secondary">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

/**
 * Every screen's frame: a plain background, a glass bar that fades in as content
 * scrolls under it, a large title that hands over to the bar, and safe-area and
 * tab-bar insets. All scroll-linked motion runs on the UI thread.
 */
export function Screen({
  children,
  title,
  subtitle,
  back,
  modal = false,
  onBack,
  headerRight,
  scroll = true,
  keyboard = false,
  refreshing,
  onRefresh,
  padded = true,
  contentStyle,
  testID,
}: ScreenProps) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  useScrollToTop(scrollRef);

  const canGoBack = back || (modal && back !== false) || !!onBack;
  const top = sheetTop(insets.top, modal);
  const hasBar = canGoBack || !!headerRight || !!title;
  const largeTitle = !!title && scroll !== false;
  const fades = scroll !== false;
  const content = useContentInsets({ header: hasBar, modal });

  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.set(e.contentOffset.y);
  });

  const barBackground = useAnimatedStyle(() => ({
    opacity: fades ? interpolate(scrollY.get(), [0, 12], [0, 1], Extrapolation.CLAMP) : 1,
  }));
  const barTitle = useAnimatedStyle(() => ({
    opacity: largeTitle ? interpolate(scrollY.get(), [26, 46], [0, 1], Extrapolation.CLAMP) : 1,
  }));

  const containerStyle = [
    padded && styles.padded,
    { paddingTop: content.top, paddingBottom: content.bottom },
    contentStyle,
  ];

  const titleBlock = largeTitle && scroll !== 'list' && (
    <ScreenTitle title={title} subtitle={subtitle} />
  );

  let body: ReactNode;
  if (scroll === 'list') {
    body = <View style={styles.fill}>{children}</View>;
  } else if (scroll === false) {
    body = <View style={[styles.fill, containerStyle]}>{children}</View>;
  } else if (keyboard) {
    body = (
      <KeyboardAwareScrollView
        bottomOffset={space.xxl}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        contentContainerStyle={containerStyle}
      >
        {titleBlock}
        {children}
      </KeyboardAwareScrollView>
    );
  } else {
    body = (
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={containerStyle}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
              progressBackgroundColor={theme.colors.glass.chromeSolid}
              progressViewOffset={content.top}
            />
          ) : undefined
        }
      >
        {titleBlock}
        {children}
      </Animated.ScrollView>
    );
  }

  return (
    <ScrollContext.Provider value={scrollY}>
      {/* A flat ground colour: cheap to paint, unlike a full-screen SVG gradient,
          which Android draws on the CPU for every screen in a transition. */}
      <View style={[styles.fill, { backgroundColor: theme.colors.bg }]} testID={testID}>
        {body}
        {hasBar && (
          <View pointerEvents="box-none" style={[styles.bar, { height: top + HEADER_HEIGHT }]}>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, barBackground]}>
              <Glass variant="chrome" radius={0} style={styles.barGlass} />
            </Animated.View>
            <View pointerEvents="box-none" style={[styles.barRow, { marginTop: top }]}>
              <View style={styles.barSide}>
                {canGoBack && (
                  <IconButton
                    icon={modal && !back ? X : ChevronLeft}
                    accessibilityLabel={modal && !back ? 'Close' : 'Back'}
                    size={36}
                    onPress={onBack ?? (() => router.back())}
                  />
                )}
              </View>
              <Animated.View pointerEvents="none" style={[styles.barTitle, barTitle]}>
                {title && (
                  <Text variant="callout" style={styles.barTitleText} numberOfLines={1}>
                    {title}
                  </Text>
                )}
              </Animated.View>
              <View style={[styles.barSide, styles.barRight]}>{headerRight}</View>
            </View>
          </View>
        )}
      </View>
    </ScrollContext.Provider>
  );
}
