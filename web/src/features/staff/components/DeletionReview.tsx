import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import type { Deletion } from '../types';
import * as s from './DeletionReview.css';
export function DeletionReview({ deletion }: { deletion: Deletion }) {
  return (
    <div className={s.stack}>
      <Text tone="secondary">
        This permanently deletes the selected records and their dependent records.
      </Text>
      {Object.entries(deletion.counts).map(([name, count]) => (
        <Text variant="callout" key={name}>
          {count} {name}
        </Text>
      ))}
      {!!deletion.permissions.length && (
        <InlineAlert
          message={`Additional deletion permission needed: ${deletion.permissions.join(', ')}`}
        />
      )}
      {!!deletion.protected.length && (
        <InlineAlert
          message={`Protected records prevent deletion: ${deletion.protected.join(', ')}`}
        />
      )}
      <details>
        <summary>View affected records</summary>
        <pre className={s.deletionTree}>{JSON.stringify(deletion.objects, null, 2)}</pre>
      </details>
    </div>
  );
}
