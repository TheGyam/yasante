import { style } from '@vanilla-extract/css';
import { HIT_TARGET, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const screen = style({ minHeight: '100svh', display: 'grid', alignItems: 'center' });
export const content = style({ maxWidth: 440, margin: '0 auto', paddingTop: space.xxxl });
export const header = style({
  display: 'grid',
  justifyItems: 'center',
  gap: space.md,
  textAlign: 'center',
  marginBottom: space.xxxl,
});
export const logo = style({ borderRadius: radius.lg, marginBottom: space.sm });
export const tagline = style({ maxWidth: 280 });
export const links = style({ display: 'grid', gap: space.md });
export const link = style({ borderRadius: radius.lg });
export const card = style({
  display: 'grid',
  gridTemplateColumns: `${HIT_TARGET}px minmax(0, 1fr) auto`,
  alignItems: 'center',
  gap: space.lg,
  padding: space.xl,
  selectors: { [`${link}:hover &`]: { background: vars.color.glass.fillStrong } },
});
export const icon = style({
  width: HIT_TARGET,
  height: HIT_TARGET,
  display: 'grid',
  placeItems: 'center',
  borderRadius: radius.md,
  background: vars.color.accentSoft,
  color: vars.color.accent,
});
export const label = style({ display: 'grid', gap: space.xxs });
export const arrow = style({ color: vars.color.text.tertiary });
export const copyright = style({ marginTop: space.xxxl, textAlign: 'center' });
