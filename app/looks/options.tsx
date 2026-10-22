import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, EyeOff, Flag, Globe, Info, Lock, Trash2, UserX } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  REPORT_REASONS,
  useBlockAuthor,
  useRemoveComment,
  useLook,
  useNotForMe,
  useRemoveLook,
  useReport,
  useSetLookVisibility,
  type ReportReason,
  type ReportTarget,
  reportSentMessage,
} from '@/features/looks';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

const NOUN: Record<ReportTarget, string> = { look: 'look', comment: 'comment', profile: 'page' };

/**
 * What you can do about someone else's look, comment or page: say what's wrong
 * with it, or stop seeing them at all. Your own look can be shown to everyone or kept
 * to yourself, or taken down.
 */
export default function ReportOptionsScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: ReportTarget;
    id: string;
    lookId?: string;
    name: string;
    authorId: string;
    mine: string;
    /** Set when the screen underneath has nothing left once this one is gone. */
    leave?: string;
    /** Why it's in her feed, in words: for "Why you’re seeing this". */
    why?: string;
  }>();
  const kind = params.kind ?? 'look';
  const { id, name, authorId } = params;
  const isMine = params.mine === '1';
  // Close this and, when asked, the screen under it too — one intent, two screens.
  const close = (emptied: boolean) =>
    emptied && params.leave === '1' ? router.dismiss(2) : router.back();
  const noun = NOUN[kind];
  // "It isn't their work" is about pictures, so a comment can't be stolen work;
  // "not about hair" is for looks only.
  const reasons = REPORT_REASONS.filter(
    r =>
      !(kind === 'comment' && r.value === 'not-their-work') &&
      !(kind !== 'look' && r.value === 'not-hair')
  );

  const [reason, setReason] = useState<ReportReason>();
  const [note, setNote] = useState('');

  const report = useReport();
  const block = useBlockAuthor();
  const notForMe = useNotForMe();
  const removeLook = useRemoveLook();
  const setVisibility = useSetLookVisibility();
  // Her own look, from what's already loaded: whether it's out there or just hers.
  const { data: look } = useLook(kind === 'look' && isMine ? id : '');
  const removeComment = useRemoveComment(params.lookId ?? '');

  const fail = async (error: unknown, title: string) => {
    haptics.error();
    await notify({ title, message: errorMessage(error, 'Check your connection and try again.') });
  };

  const send = async () => {
    if (!reason) return;
    try {
      await report.mutateAsync({ kind, id, reason, note: note.trim() || undefined });
      haptics.success();
      router.back();
      await notify({
        title: 'Thanks for telling us',
        message: reportSentMessage(reason),
      });
    } catch (error) {
      await fail(error, 'Couldn’t send that');
    }
  };

  const confirmBlock = async () => {
    const yes = await confirm({
      title: `Block ${name}?`,
      message: 'You won’t see their looks or comments, and they won’t see yours.',
      confirmLabel: 'Block',
      destructive: true,
    });
    if (!yes) return;
    try {
      await block.mutateAsync(authorId);
      haptics.success();
      close(kind !== 'comment');
    } catch (error) {
      await fail(error, 'Couldn’t block them');
    }
  };

  // Not for me: quieter than a report, and nobody is told.
  const hide = async () => {
    try {
      await notForMe.mutateAsync(kind === 'look' ? { lookId: id } : { stylistId: authorId });
      haptics.success();
      close(true);
    } catch (error) {
      await fail(error, 'Couldn’t do that');
    }
  };

  const confirmDelete = async () => {
    const yes = await confirm({
      title: `Take this ${noun} down?`,
      message:
        kind === 'look' ? 'It comes out of the feed straight away.' : 'It’s removed for everyone.',
      confirmLabel: 'Take it down',
      destructive: true,
    });
    if (!yes) return;
    try {
      if (kind === 'comment') await removeComment.mutateAsync(id);
      else await removeLook.mutateAsync(id);
      haptics.success();
      close(kind === 'look');
    } catch (error) {
      await fail(error, 'Couldn’t take it down');
    }
  };

  const share = async () => {
    if (!look) return;
    const going = look.visibility === 'private' ? 'public' : 'private';
    if (going === 'public') {
      const yes = await confirm({
        title: 'Show this look to everyone?',
        message:
          'It goes in the feed and on any stylist page it’s tagged to, at the date you posted it.',
        confirmLabel: 'Show it',
      });
      if (!yes) return;
    }
    try {
      await setVisibility.mutateAsync({ id, visibility: going });
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t change who sees it');
    }
  };

  if (isMine) {
    return (
      <Screen title={`Your ${noun}`} modal testID="look-options">
        {look && (
          <Section
            footer={
              look.visibility === 'private'
                ? 'Only you can see it now.'
                : 'Its likes and comments come back if you show it again.'
            }
          >
            <ListRow
              title={look.visibility === 'private' ? 'Show it to everyone' : 'Make it just for me'}
              icon={look.visibility === 'private' ? Globe : Lock}
              onPress={share}
              testID="look-visibility"
            />
          </Section>
        )}
        <Section footer={`Nobody is told when a ${noun} comes down.`}>
          <ListRow
            title={`Take this ${noun} down`}
            icon={Trash2}
            destructive
            onPress={confirmDelete}
            testID="look-delete"
          />
        </Section>
      </Screen>
    );
  }

  return (
    <Screen title={`Report this ${noun}`} modal keyboard testID="look-options">
      <View style={styles.body}>
        {kind === 'look' && !!params.why && (
          <Section footer="Only you see this.">
            <ListRow title="Why you’re seeing this" subtitle={params.why} icon={Info} />
          </Section>
        )}
        {kind !== 'comment' && (
          <Section footer="Nobody is told.">
            <ListRow
              title="Not for me"
              subtitle={
                kind === 'look'
                  ? 'You’ll see fewer looks like this'
                  : `You won’t see ${name}’s looks in your feed`
              }
              icon={EyeOff}
              iconTone="neutral"
              onPress={hide}
              testID="look-not-for-me"
            />
          </Section>
        )}

        <Text variant="subhead" tone="secondary">
          Tell us what’s wrong with it. {name} is never told who reported{' '}
          {kind === 'profile' ? 'their page' : `a ${noun}`}.
        </Text>

        <Section>
          {reasons.map(option => (
            <ListRow
              key={option.value}
              title={option.label}
              icon={Flag}
              iconTone={reason === option.value ? 'accent' : 'neutral'}
              trailing={
                reason === option.value ? (
                  <Check size={18} color={theme.colors.accent} strokeWidth={2.4} />
                ) : null
              }
              onPress={() => setReason(option.value)}
              wrap
              testID={`reason-${option.value}`}
            />
          ))}
        </Section>

        {reason === 'other' && (
          <Input
            label="What happened?"
            value={note}
            onChangeText={setNote}
            placeholder="A line is enough"
            multiline
            style={{ minHeight: 72 }}
          />
        )}

        <Section footer="Blocking is separate from reporting, and takes effect straight away.">
          <ListRow
            title={`Block ${name}`}
            subtitle="You stop seeing each other"
            icon={UserX}
            destructive
            onPress={confirmBlock}
            testID="look-block"
          />
        </Section>

        <View style={styles.footer}>
          <Button
            label="Send report"
            onPress={send}
            disabled={!reason}
            loading={report.isPending}
            fullWidth
            testID="look-report-send"
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
