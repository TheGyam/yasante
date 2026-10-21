import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, Flag } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { reportSentMessage } from '@/features/looks';
import {
  REVIEW_REPORT_REASONS,
  useReportReview,
  type ReviewReportReason,
} from '@/features/booking';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/** Reporting a review. Same shape as reporting a look: a reason, and nobody is told who. */
export default function ReportReviewScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id, author } = useLocalSearchParams<{ id: string; author: string }>();
  const [reason, setReason] = useState<ReviewReportReason>();
  const [note, setNote] = useState('');
  const report = useReportReview();

  const send = async () => {
    if (!reason) return;
    try {
      await report.mutateAsync({ id, reason, note: note.trim() || undefined });
      haptics.success();
      router.back();
      await notify({
        title: 'Thanks for telling us',
        message: reportSentMessage(reason),
      });
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t send that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Report this review" modal keyboard testID="review-report">
      <View style={styles.body}>
        <Text variant="subhead" tone="secondary">
          Tell us what’s wrong with {author ? `${author}’s` : 'this'} review. Nobody is told who
          reported it.
        </Text>

        <Section>
          {REVIEW_REPORT_REASONS.map(option => (
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

        <View style={styles.footer}>
          <Button
            label="Send report"
            onPress={send}
            disabled={!reason}
            loading={report.isPending}
            fullWidth
            testID="review-report-send"
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
