import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

/** The shape of something still on its way. Only opacity moves. */
export function Skeleton({ style, className }: { style?: CSSProperties; className?: string }) {
  return <div aria-hidden className={`${styles.skeleton} ${className ?? ''}`} style={style} />;
}
