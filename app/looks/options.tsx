import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, Flag, Trash2, UserX } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  REPORT_REASONS,
  useBlockAuthor,
  useRemoveComment,
  useRemoveLook,
  useReport,
  type ReportReason,
  type ReportTarget,
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
 * with it, or stop seeing them at all. Your own gets one option — take it down.
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
  const removeLook = useRemoveLook();
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
        message: 'Someone will look at this. We won’t say who reported it.',
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

  if (isMine) {
    return (
      <Screen title={`Your ${noun}`} modal testID="look-options">
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
