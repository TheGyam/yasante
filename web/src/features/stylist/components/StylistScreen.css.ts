import { globalStyle, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { HEADER_HEIGHT } from '@/shared/ui/SiteHeader.css';

export const layout = style({
  display: 'grid',
  gap: space.xxl,
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: '360px minmax(0, 1fr)',
      gap: space.huge,
      alignItems: 'start',
    },
  },
});

export const aside = style({
  '@media': { [media.desktop]: { position: 'sticky', top: HEADER_HEIGHT + space.xxl } },
});

export const identity = style({
  display: 'grid',
  justifyItems: 'center',
  gap: space.md,
  textAlign: 'center',
});

export const names = style({ display: 'grid', gap: 2 });
export const nameHeading = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: space.sm,
});
export const bio = style({ whiteSpace: 'pre-line' });

export const book = style({
  display: 'grid',
  gap: space.sm,
  marginTop: space.xl,
  textAlign: 'center',
});

export const featuredButtons = style({
  display: 'grid',
  gap: space.sm,
});

export const claimFooter = style({
  marginTop: space.xxxl,
  textAlign: 'center',
  paddingTop: space.lg,
  borderTop: `1px solid ${vars.color.separator}`,
});

export const claimTrigger = style({
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: vars.color.text.secondary,
  fontSize: '0.875rem',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
  transition: `color ${vars.time.state} ${EASE_OUT}`,
  ':hover': {
    color: vars.color.text.primary,
  },
});

export const claimNote = style({
  padding: `${space.sm}px ${space.md}px`,
  maxWidth: 480,
  margin: '0 auto',
});

export const inlineInstagramLink = style({
  color: vars.color.text.primary,
  fontWeight: weight.medium,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
});

export const main = style({});
globalStyle(`${main} > :first-child`, { marginTop: 0 });

export const subhead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
  margin: `${space.xxxl}px ${space.xs}px ${space.sm}px`,
});

export const work = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: space.xs,
  borderRadius: radius.lg,
  overflow: 'hidden',
});

export const workLink = style({
  position: 'relative',
  display: 'block',
  transition: `opacity ${vars.time.state} ${EASE_OUT}`,
  ':hover': { opacity: 0.88 },
});

export const average = style({ display: 'inline-flex', alignItems: 'center', gap: 6 });
export const reviews = style({ display: 'grid', gap: space.md });
export const review = style({ display: 'grid', gap: space.sm });

export const reviewHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
});

export const more = style({ marginTop: space.sm, display: 'flex', justifyContent: 'center' });
