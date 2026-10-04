import type { ReactNode } from 'react';
import * as s from './Pill.css';
export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  return <span className={`${s.pill} ${s.tone[tone]}`}>{children}</span>;
}
