import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Glass } from './Glass';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Sheets size to their content unless given fixed snap points. */
  snapPoints?: (string | number)[];
}

const useStyles = makeStyles(t => ({
  content: { paddingHorizontal: GUTTER, paddingTop: space.sm },
  handle: { backgroundColor: t.colors.text.tertiary, width: 40 },
}));

function GlassBackground({ style }: BottomSheetBackgroundProps) {
  return <Glass variant="chrome" radius={radius.xl} style={[style, backgroundStyles.flatBottom]} />;
}

function Backdrop(props: BottomSheetBackdropProps) {
  const theme = useTheme();
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      style={[props.style, { backgroundColor: theme.colors.scrim }]}
      opacity={1}
    />
  );
}

// On iOS a pop-up screen is its own window, and a sheet drawn in the app's root would
// sit behind it, out of sight. This draws it above everything; touches there need
// their own gesture root.
const container =
  Platform.OS === 'ios'
    ? ({ children }: { children?: ReactNode }) => (
        <FullWindowOverlay>
          <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {children}
          </GestureHandlerRootView>
        </FullWindowOverlay>
      )
    : undefined;

/**
 * A glass bottom sheet driven by `visible`. The drag, snap and dismiss physics are
 * @gorhom/bottom-sheet's, running on the UI thread.
 */
export function Sheet({ visible, onClose, children, snapPoints }: SheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  // Quicker than the library's default, and no bounce: a spring still carries the
  // speed of a flick into the settle.
  const animationConfigs = useBottomSheetSpringConfigs({ duration: 280, dampingRatio: 1 });

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={ref}
      containerComponent={container}
      snapPoints={snapPoints}
      animationConfigs={animationConfigs}
      enableDynamicSizing={!snapPoints}
      onDismiss={onClose}
      backdropComponent={Backdrop}
      backgroundComponent={GlassBackground}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + space.xxl }]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const backgroundStyles = StyleSheet.create({
  flatBottom: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
});
