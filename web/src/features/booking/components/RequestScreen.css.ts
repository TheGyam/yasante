import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';

export const column = style({ maxWidth: 640, margin: '0 auto', display: 'grid', gap: space.lg });
export const head = style({ display: 'grid', gap: space.xs });
export const card = style({ display: 'grid', gap: space.lg });
export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const actions = style({ display: 'grid', gap: space.sm });
export const look = style({ width: 120, borderRadius: radius.md });
export const lookRow = style({ display: 'flex', gap: space.lg, alignItems: 'center' });
