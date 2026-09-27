import { style, styleVariants } from '@vanilla-extract/css';
import { media, radius as radii, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const edge = {
  border: `1px solid ${vars.color.glass.border}`,
  borderTopColor: vars.color.glass.highlight,
};

export const variant = styleVariants({
  /** A translucent fill, no blur. Cheap enough for every card and list. */
  card: { ...edge, background: vars.color.glass.fill },
  /** Real blur, for bars that float over moving content. */
  chrome: {
    ...edge,
    background: vars.color.glass.chromeTint,
    WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
    backdropFilter: 'blur(24px) saturate(1.4)',
    '@supports': {
      'not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
        background: vars.color.glass.chromeSolid,
      },
    },
  },
});

export const radius = styleVariants(
  { sm: radii.sm, md: radii.md, lg: radii.lg, xl: radii.xl, none: 0 },
  borderRadius => ({ borderRadius })
);

export const padded = style({
  padding: space.lg,
  '@media': { [media.wide]: { padding: space.xxl } },
});
