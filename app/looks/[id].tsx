import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, ImageOff, MoreHorizontal } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  LookCard,
  postedLabel,
  useAddComment,
  useComments,
  useLook,
  useLookActions,
  type LookComment,
} from '@/features/looks';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { fonts, GUTTER, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { track } from '@/shared/lib/analytics';

// Comments are virtualised: a look people love can gather hundreds.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(t => ({
  fill: { flex: 1 },
  heading: { marginTop: -space.md, marginBottom: space.md },
  comment: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm },
  commentText: { flex: 1, gap: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: GUTTER,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.chromeSolid,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: space.lg,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: t.colors.text.primary,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
}));

/** One look, whole: the picture, the conversation under it, and a way to join in. */
export default function LookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: look, isLoading } = useLook(id);
  useEffect(() => {
    track('view_look', { lookId: id });
  }, [id]);

  if (!look) {
    return (
      <Screen back testID="look-screen">
        {isLoading ? (
          <Skeleton height={420} />
        ) : (
          <EmptyState
            icon={ImageOff}
            title="This look is gone"
            message="It may have been taken down."
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen back title={look.authorName} scroll="list" testID="look-screen">
      <LookThread id={id} />
    </Screen>
  );
}

function LookThread({ id }: { id: string }) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useContentInsets();
  const safe = useSafeAreaInsets();
  const onScroll = useScreenScrollHandler();
  const router = useRouter();
  const actions = useLookActions({ onItsOwnPage: true });
  const listRef = useRef<FlashListRef<LookComment>>(null);

  const { data: look } = useLook(id);
  const thread = useComments(id);
  const comments = thread.data?.pages.flatMap(page => page.data) ?? [];

  const openOptions = (comment: LookComment) =>
    router.push(
      `/looks/options?kind=comment&id=${comment.id}&lookId=${id}&name=${encodeURIComponent(comment.authorName)}&authorId=${comment.authorId}&mine=${comment.mine ? 1 : 0}`
    );

  if (!look) return null;

  return (
    <View style={styles.fill}>
      <AnimatedFlashList
        ref={listRef}
        data={comments}
        keyExtractor={comment => comment.id}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar uri={item.authorAvatarUri} name={item.authorName} size={30} />
            <View style={styles.commentText}>
              <Text variant="footnote" tone="tertiary">
                <Text variant="footnote" style={{ color: theme.colors.text.primary }}>
                  {item.authorName}
                </Text>
                {'  '}
                {postedLabel(item.createdAt)}
              </Text>
              <Text variant="subhead">{item.body}</Text>
            </View>
            <IconButton
              icon={MoreHorizontal}
              variant="plain"
              size={30}
              accessibilityLabel={`Options for ${item.authorName}'s comment`}
              onPress={() => openOptions(item)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View>
            <LookCard
              look={look}
              detail
              {...actions}
              onOpen={undefined}
              onSave={look.mine ? undefined : actions.onSave}
            />
            <Text variant="overline" tone="tertiary" style={styles.heading}>
              {look.commentCount
                ? `${look.commentCount} ${look.commentCount === 1 ? 'comment' : 'comments'}`
                : 'Comments'}
            </Text>
            {thread.isLoading && <Skeleton height={60} />}
          </View>
        }
        ListEmptyComponent={
          thread.isLoading ? null : (
            <Text variant="subhead" tone="secondary">
              No comments yet. Say what you love about it.
            </Text>
          )
        }
        ListFooterComponent={
          thread.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.accent} style={{ padding: space.lg }} />
          ) : null
        }
        onEndReached={() => {
          if (thread.hasNextPage && !thread.isFetchingNextPage) thread.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: space.xl,
          paddingHorizontal: GUTTER,
        }}
      />
      <KeyboardStickyView offset={{ closed: 0, opened: safe.bottom }}>
        <Composer
          lookId={id}
          bottom={safe.bottom + space.sm}
          onSent={() =>
            // The new comment is at the end, once the thread re-reads.
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 250)
          }
        />
      </KeyboardStickyView>
    </View>
  );
}

function Composer({
  lookId,
  bottom,
  onSent,
}: {
  lookId: string;
  bottom: number;
  onSent: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [body, setBody] = useState('');
  const add = useAddComment(lookId);
  const ready = body.trim().length > 0 && !add.isPending;

  // The send button grows in as soon as there's something to send.
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(withTiming(ready ? 1 : 0, timing.state));
  }, [ready, shown]);
  const sendStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + shown.get() * 0.65,
    transform: [{ scale: 0.85 + shown.get() * 0.15 }],
  }));

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBody('');
    try {
      await add.mutateAsync(text);
      haptics.success();
      onSent();
    } catch (error) {
      setBody(text);
      haptics.error();
      await notify({
        title: 'Couldn’t post that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <View style={[styles.composer, { paddingBottom: bottom }]}>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Add a comment"
        placeholderTextColor={theme.colors.text.tertiary}
        multiline
        maxLength={500}
        style={styles.input}
        accessibilityLabel="Add a comment"
        testID="comment-input"
      />
      <PressableScale
        onPress={send}
        disabled={!ready}
        accessibilityLabel="Post comment"
        scaleTo={0.9}
        testID="comment-send"
      >
        <Animated.View style={[styles.send, sendStyle]}>
          <ArrowUp size={20} color={theme.colors.text.onAccent} strokeWidth={2.6} />
        </Animated.View>
      </PressableScale>
    </View>
  );
}
