import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const column = style({ maxWidth: 480, margin: '0 auto', display: 'grid', gap: space.xl });
export const heading = style({ display: 'grid', gap: space.sm, textAlign: 'center' });
export const form = style({ display: 'grid', gap: space.lg });
export const footer = style({ textAlign: 'center' });

/** A text-sized action inside a sentence: "send another code". */
export const linkButton = style({
  border: 0,
  padding: 0,
  background: 'none',
  color: vars.color.accent,
  textDecoration: 'underline',
  cursor: 'pointer',
  ':disabled': { color: 'inherit', textDecoration: 'none', cursor: 'default' },
});

export const signedIn = style({ textAlign: 'center', padding: `${space.lg}px ${space.xl}px 0` });
