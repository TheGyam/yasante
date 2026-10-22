import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Link2Off, Share as ShareIcon } from 'lucide-react-native';
import { Share } from 'react-native';
import { AuthPromptModal, errorMessage, useAuth } from '@/features/auth';
import {
  FollowingSheet,
  MakeItYoursSheet,
  SharedCollectionView,
  SharedLoading,
  useFollowCollection,
  useMakeCollectionMine,
  useSharedCollection,
  useUnfollow,
} from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { confirm, notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { Screen } from '@/shared/ui/Screen';

/**
 * yasante.com/c/<code>: someone's shared collection. Anyone can look; following it
 * or making it hers takes an account.
 */
export default function SharedCollectionScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useSharedCollection(code);
  const follow = useFollowCollection();
  const unfollow = useUnfollow('collection');
  const makeMine = useMakeCollectionMine();
  const [sheet, setSheet] = useState<'make' | 'following' | 'join' | null>(null);
  // Signed out, a tap asks her to join, and what she tapped finishes once she has.
  const [pending, setPending] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !pending) return;
    setPending(null);
    setSheet(null);
    pending();
  }, [isAuthenticated, pending]);

  // Her own link opens her own collection, where she can manage it.
  useEffect(() => {
    if (data?.ownId) router.replace(`/collections/${data.ownId}`);
  }, [data?.ownId, router]);

  const fail = async (error: unknown) => {
    haptics.error();
    await notify({
      title: 'Couldn’t do that',
      message: errorMessage(error, 'Check your connection and try again.'),
    });
  };

  if (isError && !data) {
    return (
      <Screen back title="Collection" testID="shared-collection-gone">
        <EmptyState
          icon={Link2Off}
          title="This isn’t shared any more"
          message="Its owner may have stopped sharing it or deleted it."
          actionLabel="Go home"
          onAction={() => router.replace('/home')}
        />
      </Screen>
    );
  }

  const following = !!data?.followingId;
  const signedIn = (then: () => void) => () => {
    if (isAuthenticated) return then();
    setPending(() => then);
    setSheet('join');
  };

  return (
    <Screen
      back
      title={data?.name ?? 'Collection'}
      scroll="list"
      testID="shared-collection"
      headerRight={
        data && (
          <IconButton
            icon={ShareIcon}
            size={36}
            accessibilityLabel="Share"
            onPress={() =>
              Share.share({
                message: `${data.name} by ${data.author.name} on Yasante: https://yasante.com/c/${code}`,
              }).catch(() => {})
            }
          />
        )
      }
    >
      {data && (
        <SharedCollectionView
          name={data.name}
          author={data.author}
          itemCount={data.itemCount}
          updatedAt={data.updatedAt}
          previewUris={data.previewUris}
          items={data.items}
          following={following}
          busy={follow.isPending}
          onFollow={signedIn(() =>
            follow.mutate(code, {
              onSuccess: () => haptics.success(),
              onError: fail,
            })
          )}
          onFollowing={() => setSheet('following')}
          onMakeItYours={signedIn(() => setSheet('make'))}
        />
      )}
      {!data && isLoading && <SharedLoading />}

      {data && (
        <>
          <MakeItYoursSheet
            visible={sheet === 'make'}
            onClose={() => setSheet(null)}
            name={data.name}
            authorName={data.author.name.split(' ')[0]}
            what={`the ${data.itemCount} looks`}
            busy={makeMine.isPending}
            onConfirm={() =>
              makeMine.mutate(
                { from: following ? { id: data.followingId } : { code }, name: data.name },
                {
                  onSuccess: mine => {
                    setSheet(null);
                    haptics.success();
                    router.replace(`/collections/${mine.id}`);
                  },
                  onError: fail,
                }
              )
            }
          />
          <FollowingSheet
            visible={sheet === 'following'}
            onClose={() => setSheet(null)}
            authorName={data.author.name.split(' ')[0]}
            onMakeItYours={() => setSheet('make')}
            onUnfollow={async () => {
              setSheet(null);
              const yes = await confirm({
                title: `Unfollow ${data.name}?`,
                message: 'It leaves your Planner. You can follow it again from the link.',
                confirmLabel: 'Unfollow',
                destructive: true,
              });
              if (yes && data.followingId) unfollow.mutate(data.followingId, { onError: fail });
            }}
          />
        </>
      )}
      <AuthPromptModal visible={sheet === 'join'} onClose={() => setSheet(null)} feature="shared" />
    </Screen>
  );
}
