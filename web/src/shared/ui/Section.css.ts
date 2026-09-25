import { globalStyle, style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const section = style({ marginTop: space.xxxl });
export const title = style({ marginBottom: space.sm, padding: `0 ${space.xs}px` });
export const rows = style({});
export const footer = style({ marginTop: space.sm, padding: `0 ${space.xs}px` });

// A hairline between rows, as the app's grouped lists.
globalStyle(`${rows} > * + *`, { borderTop: `1px solid ${vars.color.separator}` });
