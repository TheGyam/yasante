import { FileQuestion } from 'lucide-react';
import { errorMessage, isNotFound } from '@/shared/lib/errors';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { usePolicy } from '../hooks';
import { policyBlocks } from '../format';
import type { PolicyType } from '../types';
import styles from './PolicyScreen.module.css';

/** Terms, privacy, guidelines: the version in effect, as the app shows it. */
export function PolicyScreen({ type }: { type: PolicyType }) {
  const { data: policy, isPending, error, refetch } = usePolicy(type);

  if (isPending) {
    return (
      <Page width="reading">
        <div className={styles.head} aria-busy>
          <Skeleton style={{ height: 40, width: '60%' }} />
          <Skeleton style={{ height: 18, width: '40%' }} />
        </div>
        <Skeleton style={{ height: 320 }} />
      </Page>
    );
  }

  if (!policy) {
    return (
      <Page width="reading" title="Not published yet">
        <EmptyState
          as="h1"
          icon={FileQuestion}
          title={isNotFound(error) ? 'Not published yet' : 'Couldn’t load this page'}
          body={
            isNotFound(error) ? undefined : errorMessage(error, 'Please try again in a moment.')
          }
          action={
            isNotFound(error) ? undefined : (
              <Button label="Try again" variant="secondary" size="md" onClick={() => refetch()} />
            )
          }
        />
      </Page>
    );
  }

  return (
    <Page width="reading" title={policy.title}>
      <header className={styles.head}>
        <Text variant="display">{policy.title}</Text>
        <Text variant="subhead" tone="secondary">
          Version {policy.version} · in effect from {formatDate(policy.effectiveAt)}
        </Text>
      </header>
      <article className={styles.body}>
        {policyBlocks(policy.body).map((block, index) =>
          block.kind === 'heading' ? (
            <Text key={index} variant="title3" as="h2" id={block.id}>
              {block.text}
            </Text>
          ) : (
            <Text key={index} variant="body">
              {block.text}
            </Text>
          )
        )}
      </article>
    </Page>
  );
}
