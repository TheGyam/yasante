import { Link } from './Link';
import { Text } from './Text';
import * as styles from './SectionHeader.css';

export interface SectionHeaderProps {
  title: string;
  action?: { label: string; to: string };
  id?: string;
}

export function SectionHeader({ title, action, id }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <Text variant="title2" id={id}>
        {title}
      </Text>
      {action && (
        <Link to={action.to} className={styles.action}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
