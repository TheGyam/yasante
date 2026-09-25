import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './Glass.module.css';

export interface GlassProps extends HTMLAttributes<HTMLElement> {
  /**
   * `card` — translucent fill, no blur; safe anywhere.
   * `chrome` — real blur, for the header and anything floating over moving content.
   */
  variant?: 'card' | 'chrome';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  padded?: boolean;
  as?: ElementType;
  children?: ReactNode;
}

export function Glass({
  variant = 'card',
  radius = 'lg',
  padded = false,
  as: Element = 'div',
  className,
  children,
  ...rest
}: GlassProps) {
  const classes = [styles[variant], styles[radius], padded ? styles.padded : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <Element {...rest} className={classes}>
      {children}
    </Element>
  );
}
