import type { ElementType, ReactNode } from 'react';
import * as styles from './Rise.css';

export interface RiseProps {
  /** Order in a staggered group: each step waits a little longer. */
  index?: number;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/** Content arriving: rises a few pixels as it fades in. Nothing when motion is reduced. */
export function Rise({ index = 0, as: Element = 'div', className, children }: RiseProps) {
  return (
    <Element
      className={`${styles.riseIn} ${className ?? ''}`}
      style={index ? { animationDelay: `${Math.min(index, 8) * 50}ms` } : undefined}
    >
      {children}
    </Element>
  );
}
