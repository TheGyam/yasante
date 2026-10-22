import { SEP } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/Avatar';
import { Text } from '@/shared/ui/Text';
import type { SharedCollection } from '../types';
import * as styles from './Shared.css';

/** Who made it: all anyone else sees of her. */
export function Author({ author, detail }: { author: SharedCollection['author']; detail: string }) {
  return (
    <div className={styles.author}>
      <Avatar name={author.name} uri={author.avatarUri} size={44} />
      <div>
        <Text variant="callout" as="p">
          {author.name}
        </Text>
        <Text variant="footnote" tone="secondary" as="p">
          {[author.username && `@${author.username}`, detail].filter(Boolean).join(SEP)}
        </Text>
      </div>
    </div>
  );
}
