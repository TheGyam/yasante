import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Camera, Check, ScanBarcode, SearchX } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  CATEGORY_LABELS,
  useAddToShelf,
  useProductByBarcode,
  useShelf,
  type Product,
} from '@/features/shelf';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

// Product barcodes: EAN-13/8 in Europe, UPC in the US.
const PRODUCT_CODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
const ARRIVE = FadeInDown.duration(260).easing(EASE_OUT);

const useStyles = makeStyles(t => ({
  fill: { flex: 1 },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '78%',
    aspectRatio: 1.6,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: t.colors.accent,
  },
  hint: {
    position: 'absolute',
    top: space.xxl,
    left: GUTTER,
    right: GUTTER,
    alignItems: 'center',
  },
  hintPill: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,8,10,0.6)',
  },
  hintText: { color: '#FFFFFF' },
  card: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
    bottom: space.xxl,
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.lg,
    backgroundColor: t.colors.bg,
  },
  actions: { gap: space.xs },
  permission: { flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER },
}));

type Found = { product: Product } | { missing: string };

/**
 * Point the camera at a product's barcode and it's found: from our catalogue, or
 * from Open Beauty Facts the first time anyone scans it. One tap puts it on the
 * shelf. Quicker than typing a brand, which is what makes a shelf worth keeping.
 */
export default function ScanProductScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const lookup = useProductByBarcode();
  const add = useAddToShelf();
  const { data: shelf = [] } = useShelf();
  const [found, setFound] = useState<Found>();
  const [added, setAdded] = useState(false);
  // One scan at a time: the camera reports the same code many times a second.
  const busy = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current || found) return;
    busy.current = true;
    haptics.light();
    try {
      const result = await lookup.mutateAsync(data);
      haptics.success();
      setFound({ product: result.product });
    } catch (error) {
      haptics.error();
      setFound({
        missing: errorMessage(error, 'We couldn’t look that up just now. Try again in a moment.'),
      });
    } finally {
      busy.current = false;
    }
  };

  const again = () => {
    setFound(undefined);
    setAdded(false);
  };

  const product = found && 'product' in found ? found.product : undefined;
  const onShelf = added || (!!product && shelf.some(item => item.product.id === product.id));

  const addIt = async () => {
    if (!product) return;
    try {
      await add.mutateAsync(product.id);
      haptics.success();
      setAdded(true);
    } catch (error) {
      haptics.error();
      setFound({ missing: errorMessage(error, 'Couldn’t add it. Check your connection.') });
    }
  };

  if (!permission) {
    return (
      <Screen title="Scan a product" modal scroll={false}>
        <View />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen title="Scan a product" modal scroll={false}>
        <View style={styles.permission}>
          <EmptyState
            icon={Camera}
            title="Let Yasante use your camera"
            message="It’s only used to read the barcode on your products, and nothing is recorded."
            actionLabel={permission.canAskAgain ? 'Allow camera' : 'Open Settings'}
            onAction={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Scan a product" modal scroll={false} padded={false} testID="shelf-scan-screen">
      <View style={styles.fill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...PRODUCT_CODES] }}
          onBarcodeScanned={found ? undefined : onScanned}
        />
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame} />
        </View>
        {!found && (
          <View style={styles.hint} pointerEvents="none">
            <View style={styles.hintPill}>
              <Text variant="footnote" style={styles.hintText}>
                {lookup.isPending ? 'Looking it up…' : 'Line the barcode up inside the frame'}
              </Text>
            </View>
          </View>
        )}

        {product && (
          <Animated.View entering={ARRIVE} style={styles.card}>
            <View>
              <Text variant="caption" tone="tertiary">
                {product.brand} · {CATEGORY_LABELS[product.category]}
              </Text>
              <Text variant="title3" numberOfLines={2}>
                {product.name}
              </Text>
            </View>
            <View style={styles.actions}>
              {onShelf ? (
                <Button label="On your shelf" icon={Check} variant="secondary" disabled fullWidth />
              ) : (
                <Button
                  label="Add to my shelf"
                  onPress={addIt}
                  loading={add.isPending}
                  fullWidth
                  testID="scan-add"
                />
              )}
              <Button
                label="Scan another"
                icon={ScanBarcode}
                variant="ghost"
                onPress={again}
                fullWidth
              />
            </View>
          </Animated.View>
        )}

        {found && 'missing' in found && (
          <Animated.View entering={ARRIVE} style={styles.card}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <SearchX size={20} color={theme.colors.text.secondary} strokeWidth={2} />
              <Text variant="callout" style={{ flex: 1 }}>
                {found.missing}
              </Text>
            </View>
            <View style={styles.actions}>
              <Button
                label="Search by name"
                onPress={() => router.replace('/shelf/add')}
                fullWidth
              />
              <Button label="Scan again" variant="ghost" onPress={again} fullWidth />
            </View>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}
