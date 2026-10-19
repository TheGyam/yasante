import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Link2 } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { useModeStore } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, radius, space, spring } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { waitingLabel } from '../format';
import { useClaimPage, useClaimPreview } from '../hooks';

const enter = (i: number) =>
  FadeInDown.duration(420)
    .delay(120 + i * 60)
    .easing(EASE_OUT);

const useStyles = makeStyles(() => ({
  body: { flex: 1, justifyContent: 'space-between', gap: space.xxl },
  hero: { alignItems: 'center', gap: space.lg, marginTop: space.xl },
  heading: { alignItems: 'center', gap: space.xs },
  strip: { flexDirection: 'row', gap: space.xs, alignSelf: 'stretch' },
  tile: { flex: 1, aspectRatio: 0.8, borderRadius: radius.sm, overflow: 'hidden' },
  actions: { gap: space.sm },
}));

/**
 * Where her private link lands. It shows her page as it is (or will be), how many
 * people want to book her, and one button that makes it hers. Signed out, she
 * signs up or in first and comes straight back here.
 */
export function ClaimScreen({ code }: { code: string }) {
  const styles = useStyles();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const preview = useClaimPreview(code);
  const claim = useClaimPage();

  // Her photo settles in, like something being handed over.
  const arrive = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (preview.data && !reduced) arrive.set(withDelay(80, withSpring(1, spring.snap)));
  }, [preview.data, reduced, arrive]);
  const avatarStyle = useAnimatedStyle(() => ({
    opacity: arrive.get(),
    transform: [{ scale: 0.85 + arrive.get() * 0.15 }],
  }));

  const makeItYours = async () => {
    try {
      await claim.mutateAsync(code);
      haptics.success();
      router.dismissAll();
      useModeStore.getState().beginSwitch('stylist');
      router.push({ pathname: '/finish', params: { claimed: '1' } });
    } catch {
      haptics.error();
    }
  };

  if (preview.isLoading) {
    return (
      <Screen back testID="claim-screen">
        <Skeleton height={320} />
      </Screen>
    );
  }

  if (!preview.data) {
    return (
      <Screen back testID="claim-screen">
        <EmptyState
          icon={Link2}
          title="This link doesn’t work"
          message={errorMessage(
            preview.error,
            'This link has already been used or has run out. Message @yasantebeauty on Instagram or @yasante_beauty on TikTok for a new one.'
          )}
        />
      </Screen>
    );
  }

  const page = preview.data;
  const failure = claim.isError ? errorMessage(claim.error, 'That didn’t work. Try again.') : '';
  const needsEmail = /email/i.test(failure);

  return (
    <Screen back testID="claim-screen">
      <View style={styles.body}>
        <View style={styles.hero}>
          <Animated.View style={avatarStyle}>
            <Avatar uri={page.avatarUri} name={page.displayName} size={96} />
          </Animated.View>
          <Animated.View entering={enter(0)} style={styles.heading}>
            <Text variant="display" align="center" accessibilityRole="header">
              This is your page, {page.displayName}
            </Text>
            {!page.live && (
              <Text variant="body" tone="secondary" align="center">
                Your page isn’t public yet. This is how it will look.
              </Text>
            )}
          </Animated.View>
          {page.waiting > 0 && (
            <Animated.View entering={enter(1)}>
              <Text variant="title3" tone="accent" align="center">
                {waitingLabel(page.waiting)}
              </Text>
            </Animated.View>
          )}
          {page.photos.length > 0 && (
            <Animated.View entering={enter(2)} style={styles.strip}>
              {page.photos.slice(0, 4).map(photo => (
                <View key={photo.uri} style={styles.tile}>
                  <RemoteImage
                    uri={photo.thumbUri ?? photo.uri}
                    style={StyleSheet.absoluteFill}
                    recyclingKey={photo.uri}
                    accessibilityLabel="Your work"
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </View>

        <Animated.View entering={enter(3)} style={styles.actions}>
          {!!failure && <InlineAlert message={failure} />}
          {isAuthenticated ? (
            <>
              {needsEmail && (
                <Button
                  label="Confirm your email"
                  variant="secondary"
                  onPress={() => router.push('/auth/verify-email')}
                  fullWidth
                />
              )}
              <Button
                label="Make it yours"
                onPress={makeItYours}
                loading={claim.isPending}
                disabled={claim.isPending}
                fullWidth
                testID="claim-make-it-yours"
              />
            </>
          ) : (
            <>
              <Text variant="subhead" tone="secondary" align="center">
                Sign up or sign in, then this page is yours.
              </Text>
              <Button
                label="Sign up"
                onPress={() =>
                  router.push({ pathname: '/auth/signup', params: { role: 'stylist' } })
                }
                fullWidth
                testID="claim-sign-up"
              />
              <Button
                label="Sign in"
                variant="ghost"
                onPress={() => router.push('/auth/login')}
                fullWidth
              />
            </>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}
