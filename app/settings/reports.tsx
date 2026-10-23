import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { Flag, ShieldAlert } from 'lucide-react-native';
import {
  actionLabel,
  APPEAL_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  reportReasonLabel,
  targetNoun,
  useMyModeration,
  useMyReports,
} from '@/features/looks';
import { makeStyles, space } from '@/shared/theme';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { SEP } from '@/shared/lib/format';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * What she reported and how it went, and anything done to her own posts — each of
 * those can be appealed once.
 */
export default function ReportsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const reports = useMyReports();
  const actions = useMyModeration();
  const failed = (reports.isError && !reports.data) || (actions.isError && !actions.data);

  return (
    <Screen title="Reports and appeals" back testID="reports-screen">
      <View style={styles.body}>
        {failed && (
          <Text tone="secondary">Couldn’t load this. Check your connection and try again.</Text>
        )}

        {!!actions.data?.length && (
          <Section
            title="Your posts"
            footer="If you think we got it wrong, you can appeal once. A person reads every appeal."
          >
            {actions.data.map(action => {
              const appeal = action.appeal;
              return (
                <ListRow
                  key={action.id}
                  title={`${actionLabel(action.action, action.target)}: your ${targetNoun(action.target)}`}
                  subtitle={`${day(action.createdAt)}${SEP}${
                    appeal ? APPEAL_STATUS_LABELS[appeal.status] : action.reason
                  }`}
                  icon={ShieldAlert}
                  iconTone={appeal?.status === 'overturned' ? 'success' : 'neutral'}
                  onPress={
                    appeal
                      ? undefined
                      : () =>
                          router.push({
                            pathname: '/settings/appeal',
                            params: {
                              id: action.id,
                              what: `${actionLabel(action.action, action.target)}: your ${targetNoun(action.target)}`,
                              reason: action.reason,
                            },
                          } as never)
                  }
                  testID={`action-${action.id}`}
                />
              );
            })}
          </Section>
        )}

        <Section
          title="What you reported"
          footer="The person you reported is never told who it was."
        >
          {reports.data?.length ? (
            reports.data.map(report => (
              <ListRow
                key={report.id}
                title={`A ${targetNoun(report.target)}: ${reportReasonLabel(report.reason)}`}
                subtitle={`${day(report.createdAt)}${SEP}${
                  report.resolution ?? REPORT_STATUS_LABELS[report.status]
                }`}
                icon={Flag}
                iconTone={report.status === 'open' ? 'neutral' : 'success'}
              />
            ))
          ) : (
            <ListRow
              title={reports.isLoading ? 'Loading…' : 'Nothing reported'}
              subtitle={
                reports.isLoading
                  ? undefined
                  : 'Report a post from its ••• menu if it breaks the rules'
              }
              icon={Flag}
              iconTone="neutral"
            />
          )}
        </Section>
      </View>
    </Screen>
  );
}
