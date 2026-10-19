import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { errorMessage } from '@/shared/lib/errors';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { useTogglePageWaitlist } from '../hooks';
import type { StylistPage } from '../types';

const useStyles = makeStyles(() => ({
  actions: { gap: space.sm },
  claim: { alignItems: 'center', paddingVertical: space.md },
}));

const instagramUrl = (handle: string) => `https://www.instagram.com/${encodeURIComponent(handle)}/`;
const tiktokUrl = (handle: string) => `https://www.tiktok.com/@${encodeURIComponent(handle)}`;

/**
 * A featured stylist's page in place of booking: book them where they already take
 * bookings (Instagram or TikTok), and join the waitlist to hear when they take them
 * here. Tapped signed out, it asks for an account and joins when they're back.
 */
export function FeaturedActions({ page }: { page: StylistPage }) {
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { profile } = page;
  const toggle = useTogglePageWaitlist(profile.handle);
  const [error, setError] = useState('');
  const wanted = useRef(false);
  const instagram = profile.instagramHandle || (profile.tiktokHandle ? '' : profile.handle);
  const tiktok = profile.tiktokHandle;
  const joined = page.waitlistJoined === true;
  // Read signed out, the page doesn't say whether this person is waiting: ask again as them.
  const known = page.waitlistJoined !== undefined;
  useEffect(() => {
    if (isAuthenticated && !known)
      void queryClient.invalidateQueries({ queryKey: ['stylist', 'page', profile.handle] });
  }, [isAuthenticated, known, queryClient, profile.handle]);

  const set = (join: boolean) => {
    setError('');
    haptics.light();
    toggle.mutate(join, {
      onError: failure => {
        haptics.error();
        setError(errorMessage(failure, 'That didn’t work. Try again.'));
      },
    });
  };
  // Back from signing up to join: join without a second tap.
  useEffect(() => {
    if (isAuthenticated && known && wanted.current) {
      wanted.current = false;
      if (!joined) set(true);
    }
    // `set` is the same every render in what it does; only these should re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, known, joined]);

  return (
    <View style={styles.actions}>
      <Button
        label={instagram ? 'Book on Instagram' : 'Book on TikTok'}
        onPress={() =>
          void Linking.openURL(instagram ? instagramUrl(instagram) : tiktokUrl(tiktok!))
        }
        fullWidth
        testID="featured-book"
      />
      {!!instagram && !!tiktok && (
        <Button
          label="Also on TikTok"
          variant="ghost"
          size="sm"
          onPress={() => void Linking.openURL(tiktokUrl(tiktok))}
        />
      )}
      {isAuthenticated ? (
        <Button
          label={joined ? 'On the waitlist' : 'Join the waitlist'}
          icon={joined ? Check : undefined}
          variant="secondary"
          disabled={!known || toggle.isPending}
          onPress={() => set(!joined)}
          fullWidth
          accessibilityHint={
            joined ? 'Leaves the waitlist' : `Tells you when ${profile.displayName} takes bookings`
          }
          testID="featured-waitlist"
        />
      ) : (
        <Button
          label="Sign in to join the waitlist"
          variant="secondary"
          onPress={() => {
            wanted.current = true;
            router.push('/auth/join');
          }}
          fullWidth
          testID="featured-waitlist"
        />
      )}
      {!!error && <InlineAlert message={error} />}
      <Text variant="footnote" tone="tertiary" align="center">
        We’ll let you know when {profile.displayName} takes bookings.
      </Text>
    </View>
  );
}

/** At the foot of a page still Yasante's: how its stylist makes it theirs. */
export function ClaimNote({ page }: { page: StylistPage }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const { profile } = page;
  if (!profile.claimable) return null;
  const instagram = profile.instagramHandle;
  const tiktok = profile.tiktokHandle;
  const where = [
    instagram && `@yasantebeauty on Instagram from @${instagram}`,
    tiktok && `@yasante_beauty on TikTok from @${tiktok}`,
  ].filter(Boolean);
  return (
    <View style={styles.claim}>
      {open ? (
        <Text variant="footnote" tone="secondary" align="center" accessibilityLiveRegion="polite">
          Message {where.length ? where.join(', or ') : '@yasantebeauty on Instagram'} and we’ll
          send you a link to make this page yours.
        </Text>
      ) : (
        <PressableScale
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          hitSlop={12}
          testID="featured-claim"
        >
          <Text variant="footnote" tone="secondary" align="center">
            Is this you? Make this page yours.
          </Text>
        </PressableScale>
      )}
    </View>
  );
}
