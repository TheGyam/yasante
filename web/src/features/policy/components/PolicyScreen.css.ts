import { globalStyle, style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { HEADER_HEIGHT } from '@/shared/ui/SiteHeader.css';

export const head = style({ display: 'grid', gap: space.sm, marginBottom: space.xxxl });
export const body = style({ display: 'grid', gap: space.lg });

globalStyle(`${body} p`, { whiteSpace: 'pre-line' });
globalStyle(`${body} h2`, { marginTop: space.xl, scrollMarginTop: HEADER_HEIGHT + space.xxl });
