import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Check, Scissors, TicketX } from 'lucide-react-native';
import { errorMessage, useAuth, useInvite, useRedeemInvite } from '@/features/auth';
import { useIsStylist, useModeStore } from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { EASE_OUT, makeStyles, radius, space, spring, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const OFFER = [
  'Free for you, for good',
  'One page for your Instagram bio',
  'Your menu, prices and policies without the DMs',
  'Keep Fresha, keep Instagram',
];

const enter = (i: number) =>
  FadeInDown.duration(420)
    .delay(180 + i * 60)
    .easing(EASE_OUT);
const ENTER = Array.from({ length: OFFER.length + 3 }, (_, i) => enter(i));

const useStyles = makeStyles(t => ({
  body: { flex: 1, justifyContent: 'space-between', gap: space.xxl },
  hero: { gap: space.xl, marginTop: space.xxl },
  well: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  heading: { gap: space.sm },
  offer: { gap: space.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successSoft,
  },
  actions: { gap: space.xs },
}));

/** Where an invite link lands: the offer, then an account — or stylist mode on an existing one. */
export default function InviteScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const isStylist = useIsStylist();
  const invite = useInvite(code);
  const redeem = useRedeemInvite();

  // The scissors arrive with a small turn, like something being handed over.
  const arrive = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (invite.data && !reduced) arrive.set(withDelay(80, withSpring(1, spring.snap)));
  }, [invite.data, reduced, arrive]);
  const wellStyle = useAnimatedStyle(() => ({
    opacity: arrive.get(),
    transform: [{ scale: 0.7 + arrive.get() * 0.3 }, { rotate: `${(1 - arrive.get()) * -20}deg` }],
  }));

  const switchToStylist = () => {
    router.dismissAll();
    useModeStore.getState().beginSwitch('stylist');
  };

  const accept = async () => {
    try {
      await redeem.mutateAsync(code);
      haptics.success();
      switchToStylist();
    } catch {
      haptics.error();
    }
  };

  if (invite.isLoading) {
    return (
      <Screen back>
        <Skeleton height={240} />
      </Screen>
    );
  }

  if (!invite.data) {
    return (
      <Screen back testID="invite-screen">
        <EmptyState
          icon={TicketX}
          title="This invite doesn’t work"
          message={
            errorMessage(invite.error, 'It may have expired.') +
            ' You can still set up a stylist page.'
          }
          actionLabel={isStylist ? undefined : 'Set up a stylist page'}
          onAction={() => router.replace({ pathname: '/auth/signup', params: { role: 'stylist' } })}
        />
      </Screen>
    );
  }

  return (
    <Screen back scroll={false} testID="invite-screen">
      <View style={styles.body}>
        <View style={styles.hero}>
          <Animated.View style={[styles.well, wellStyle]}>
            <Scissors size={34} color={theme.colors.accent} strokeWidth={2} />
          </Animated.View>
          <Animated.View entering={ENTER[0]} style={styles.heading}>
            <Text variant="overline" tone="accent">
              You’re invited
            </Text>
            <Text variant="display" accessibilityRole="header">
              Become a founding stylist
            </Text>
            <Text variant="body" tone="secondary">
              {invite.data.invitedBy} invited you to set up your page on Yasante.
            </Text>
          </Animated.View>
          <View style={styles.offer}>
            {OFFER.map((point, i) => (
              <Animated.View key={point} entering={ENTER[i + 1]} style={styles.point}>
                <View style={styles.tick}>
                  <Check size={13} color={theme.colors.success} strokeWidth={3} />
                </View>
                <Text variant="callout">{point}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View entering={ENTER[OFFER.length + 1]} style={styles.actions}>
          {redeem.isError ? (
            <InlineAlert message={errorMessage(redeem.error, 'We couldn’t accept the invite.')} />
          ) : null}
          {isStylist ? (
            <Button label="Go to stylist mode" onPress={switchToStylist} fullWidth />
          ) : isAuthenticated ? (
            <Button
              label="Add stylist mode to my account"
              onPress={accept}
              loading={redeem.isPending}
              fullWidth
            />
          ) : (
            <>
              <Button
                label="Create stylist account"
                onPress={() =>
                  router.push({
                    pathname: '/auth/signup',
                    params: { role: 'stylist', invite: invite.data.code },
                  })
                }
                fullWidth
                testID="accept-invite"
              />
              <Button
                label="I already have an account"
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
