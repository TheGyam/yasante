import { globalStyle, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space } from '@/shared/theme/tokens';
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
export const bio = style({ whiteSpace: 'pre-line' });

export const book = style({
  display: 'grid',
  gap: space.sm,
  marginTop: space.xl,
  textAlign: 'center',
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
