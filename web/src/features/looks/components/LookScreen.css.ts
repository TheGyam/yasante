import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { HEADER_HEIGHT } from '@/shared/ui/SiteHeader.css';

const twoColumns = 'screen and (min-width: 860px)';

export const layout = style({
  display: 'grid',
  gap: space.xxl,
  '@media': {
    [twoColumns]: {
      gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
      gap: space.huge,
      alignItems: 'start',
    },
  },
});

export const photo = style({ borderRadius: radius.xl, maxHeight: '82dvh' });

export const details = style({
  display: 'grid',
  gap: space.xl,
  '@media': { [twoColumns]: { position: 'sticky', top: HEADER_HEIGHT + space.xxl } },
});

export const author = style({ display: 'flex', alignItems: 'center', gap: space.md });
export const caption = style({ whiteSpace: 'pre-line' });
export const tags = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const counts = style({ display: 'flex', gap: space.xl });
export const count = style({ display: 'inline-flex', alignItems: 'center', gap: 6 });
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space.md });
export const skeletonPhoto = style({ aspectRatio: '4 / 5', borderRadius: radius.xl });
