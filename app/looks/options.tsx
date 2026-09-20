import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, Flag, Trash2, UserX } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  REPORT_REASONS,
  useBlockAuthor,
  useRemoveLook,
  useReportLook,
  type ReportReason,
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

/**
 * What you can do about someone else's look: say what's wrong with it, or stop
 * seeing them at all. Your own look gets one option — take it down.
 */
export default function LookOptionsScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id, author, authorId, mine } = useLocalSearchParams<{
    id: string;
    author: string;
    authorId: string;
    mine: string;
  }>();
  const isMine = mine === '1';

  const [reason, setReason] = useState<ReportReason>();
  const [note, setNote] = useState('');

  const report = useReportLook();
  const block = useBlockAuthor();
  const remove = useRemoveLook();

  const fail = async (error: unknown, title: string) => {
    haptics.error();
    await notify({ title, message: errorMessage(error, 'Check your connection and try again.') });
  };

  const send = async () => {
    if (!reason) return;
    try {
      await report.mutateAsync({ id, reason, note: note.trim() || undefined });
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
      title: `Block ${author}?`,
      message: 'You won’t see their looks, and they won’t see yours.',
      confirmLabel: 'Block',
      destructive: true,
    });
    if (!yes) return;
    try {
      await block.mutateAsync(authorId);
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t block them');
    }
  };

  const confirmDelete = async () => {
    const yes = await confirm({
      title: 'Take this look down?',
      message: 'It comes out of the feed straight away.',
      confirmLabel: 'Take it down',
      destructive: true,
    });
    if (!yes) return;
    try {
      await remove.mutateAsync(id);
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t take it down');
    }
  };

  if (isMine) {
    return (
      <Screen title="Your look" modal testID="look-options">
        <Section footer="Nobody is told when a look comes down.">
          <ListRow
            title="Take this look down"
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
    <Screen title="Report this look" modal keyboard testID="look-options">
      <View style={styles.body}>
        <Text variant="subhead" tone="secondary">
          Tell us what’s wrong with it. {author} is never told who reported a look.
        </Text>

        <Section>
          {REPORT_REASONS.map(option => (
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
            title={`Block ${author}`}
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
