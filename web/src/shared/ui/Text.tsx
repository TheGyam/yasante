import type { CSSProperties, ElementType, ReactNode } from 'react';
import type { TypeVariant } from '@/shared/theme';
import * as styles from './Text.css';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success';

export interface TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  /** The element to render; defaults to a sensible one for the variant. */
  as?: ElementType;
  /** Cut off after this many lines. */
  lines?: number;
  tabular?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  role?: string;
  children: ReactNode;
}

const ELEMENT: Partial<Record<TypeVariant, ElementType>> = {
  display: 'h1',
  title1: 'h1',
  title2: 'h2',
  title3: 'h3',
  body: 'p',
};

/** All type goes through here, so every size and weight comes from the scale. */
export function Text({
  variant = 'body',
  tone = 'primary',
  as,
  lines,
  tabular,
  className,
  style,
  id,
  role,
  children,
}: TextProps) {
  const Element = as ?? ELEMENT[variant] ?? 'span';
  const classes = [
    styles.text,
    styles.variant[variant],
    styles.tone[tone],
    lines ? styles.clamp : '',
    tabular ? styles.tabular : '',
    className ?? '',
  ].join(' ');
  return (
    <Element
      id={id}
      role={role}
      className={classes}
      style={lines ? { WebkitLineClamp: lines, ...style } : style}
    >
      {children}
    </Element>
  );
}
