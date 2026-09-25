import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from './Link';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface Common {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
}

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    loading?: boolean;
    to?: undefined;
    href?: undefined;
  };
/** A page on this site. */
type AsLink = Common & { to: string; preload?: () => void; href?: undefined };
/** Somewhere else: the app, another site. */
type AsAnchor = Common & { href: string; to?: undefined };

export type ButtonProps = AsButton | AsLink | AsAnchor;

const ICON: Record<ButtonSize, number> = { lg: 20, md: 18, sm: 16 };

export function Button(props: ButtonProps) {
  const {
    label,
    variant = 'primary',
    size = 'lg',
    icon: Icon,
    trailingIcon: Trailing,
    fullWidth,
    className,
  } = props;
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ].join(' ');
  const busy = 'loading' in props && props.loading;
  const content: ReactNode = (
    <>
      {busy ? (
        <span className={styles.spinner} aria-hidden />
      ) : (
        Icon && <Icon size={ICON[size]} strokeWidth={2.2} aria-hidden />
      )}
      <span>{label}</span>
      {Trailing && <Trailing size={ICON[size]} strokeWidth={2.2} aria-hidden />}
    </>
  );

  if (props.to !== undefined) {
    return (
      <Link to={props.to} preload={props.preload} className={classes}>
        {content}
      </Link>
    );
  }
  if (props.href !== undefined) {
    return (
      <a href={props.href} className={classes}>
        {content}
      </a>
    );
  }

  const {
    label: _l,
    variant: _v,
    size: _s,
    icon: _i,
    trailingIcon: _t,
    fullWidth: _f,
    className: _c,
    loading,
    disabled,
    type = 'button',
    ...rest
  } = props;
  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
