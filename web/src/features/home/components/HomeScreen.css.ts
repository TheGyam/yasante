import { style } from '@vanilla-extract/css';
import { media, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { HEADER_HEIGHT } from '@/shared/ui/SiteHeader.css';

const twoColumns = 'screen and (min-width: 860px)';

export const hero = style({
  display: 'grid',
  gap: space.lg,
  maxWidth: 760,
  padding: `${space.xxxl}px 0 ${space.xxl}px`,
  '@media': { [media.wide]: { padding: `${space.giant}px 0 ${space.huge}px` } },
});

export const lede = style({ maxWidth: '38ch', fontSize: '1.125rem', lineHeight: 1.55 });

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.md,
  marginTop: space.sm,
});

export const sides = style({
  display: 'grid',
  gap: space.lg,
  marginTop: space.xl,
  '@media': { [media.wide]: { gridTemplateColumns: '1fr 1fr' } },
});

export const side = style({ display: 'grid', gap: space.lg, alignContent: 'start' });

export const points = style({
  display: 'grid',
  gap: space.lg,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const point = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: space.md,
  alignItems: 'start',
});

export const icon = style({
  display: 'grid',
  placeItems: 'center',
  width: 36,
  height: 36,
  borderRadius: radius.sm,
  background: vars.color.accentSoft,
  color: vars.color.accent,
});

export const pointText = style({ display: 'grid', gap: 2 });

export const join = style({
  display: 'grid',
  gap: space.xl,
  marginTop: space.giant,
  scrollMarginTop: HEADER_HEIGHT + space.xxl,
  '@media': {
    [twoColumns]: { gridTemplateColumns: '1fr 1.2fr', gap: space.huge, alignItems: 'start' },
  },
});

export const joinText = style({ display: 'grid', gap: space.sm });
