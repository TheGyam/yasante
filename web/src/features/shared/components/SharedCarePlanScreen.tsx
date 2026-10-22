import { appLink } from '@/shared/lib/links';
import { plural, SEP } from '@/shared/lib/format';
import { Glass } from '@/shared/ui/Glass';
import { Page } from '@/shared/ui/Page';
import { Rise } from '@/shared/ui/Rise';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { describePlan, updatedLabel } from '../format';
import { useSharedCarePlan } from '../hooks';
import { Author } from './Author';
import { Gone } from './Gone';
import { OpenInApp } from './OpenInApp';
import * as styles from './Shared.css';

/** yasante.com/p/<code>: a care plan someone shared, its steps and her rhythm. */
export function SharedCarePlanScreen({ code }: { code: string }) {
  const { data, isPending, error, refetch } = useSharedCarePlan(code);

  if (isPending) {
    return (
      <Page title="A care plan" noIndex>
        <div className={styles.planLayout} aria-busy>
          <Skeleton style={{ height: 34, width: '60%' }} />
          <Skeleton style={{ height: 44, width: '50%' }} />
          <Skeleton style={{ height: 220 }} />
        </div>
      </Page>
    );
  }
  if (!data) return <Gone error={error} retry={() => refetch()} />;

  return (
    <Page
      title={`${data.name}, by ${data.author.name}`}
      description={`A care plan in ${plural(data.steps.length, 'step')}, on Yasante.`}
      noIndex
    >
      <Rise className={styles.planLayout}>
        <Text variant="title1">{data.name}</Text>
        <Author
          author={data.author}
          detail={`${describePlan(data)}${SEP}${updatedLabel(data.updatedAt)}`}
        />
        <Glass radius="lg">
          <ol className={styles.steps} aria-label="Steps">
            {data.steps.map(step => (
              <li key={step.id} className={styles.step}>
                <Text variant="body">{step.text}</Text>
              </li>
            ))}
          </ol>
        </Glass>
        <OpenInApp href={appLink.sharedCarePlan(code)} />
      </Rise>
    </Page>
  );
}
