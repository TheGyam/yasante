import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import * as styles from './InlineAlert.css';

export interface InlineAlertProps {
  tone?: 'danger' | 'success' | 'info';
  message: string;
}

const ICON = { danger: CircleAlert, success: CircleCheck, info: Info };

export function InlineAlert({ tone = 'danger', message }: InlineAlertProps) {
  const Icon = ICON[tone];
  return (
    <div
      className={`${styles.alert} ${styles.tone[tone]}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon size={16} strokeWidth={2.2} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
