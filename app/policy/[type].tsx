import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText } from 'lucide-react-native';
import { apiClient, type ApiSchemas } from '@/shared/lib/api';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

type Policy = ApiSchemas['Policy'];

const TITLES: Record<string, string> = {
  terms: 'Terms of use',
  privacy: 'Privacy policy',
  guidelines: 'Community guidelines',
  'stylist-terms': 'Stylist terms',
};

const useStyles = makeStyles(() => ({
  body: { gap: space.md },
  meta: { marginBottom: space.md },
  heading: { marginTop: space.lg },
}));

/**
 * A published policy, read in the app: the current version from the server, so what
 * she reads is exactly what she's agreeing to. Also where yasante.com/terms and
 * /privacy land when the app is installed.
 */
export default function PolicyScreen() {
  const styles = useStyles();
  const { type = 'terms' } = useLocalSearchParams<{ type: string }>();
  const apiType = type.replace('-', '_');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['policy', apiType],
    queryFn: async () => (await apiClient.get<Policy>(`/api/policies/${apiType}/`)).data,
    staleTime: 60 * 60 * 1000,
  });

  const title = data?.title ?? TITLES[type] ?? 'Policy';
  // Plain text from the admin: blank lines split paragraphs; "3. Title" lines are headings.
  const blocks = (data?.body ?? '').split(/\n\s*\n/).filter(Boolean);

  return (
    <Screen title={title} back testID="policy-screen">
      {isLoading ? (
        <Skeleton height={320} />
      ) : isError || !data ? (
        <EmptyState
          icon={FileText}
          title="Not published yet"
          message="This one isn’t available right now. Try again in a little while."
        />
      ) : (
        <View style={styles.body}>
          <Text variant="footnote" tone="tertiary" style={styles.meta}>
            Version {data.version} · in effect from{' '}
            {format(new Date(data.effectiveAt), 'd MMMM yyyy')}
          </Text>
          {blocks.map((block, i) =>
            /^\d+\.\s/.test(block) && !block.includes('\n') && block.length < 80 ? (
              <Text key={i} variant="title3" accessibilityRole="header" style={styles.heading}>
                {block}
              </Text>
            ) : (
              <Text key={i} variant="body" tone="secondary">
                {block}
              </Text>
            )
          )}
        </View>
      )}
    </Screen>
  );
}
