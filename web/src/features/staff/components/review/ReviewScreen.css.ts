import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const screen = style({ display: 'grid', gap: space.xl, minWidth: 0 });

export const queues = style({
  display: 'flex',
  gap: space.xs,
  overflowX: 'auto',
  paddingBottom: 2,
  scrollbarWidth: 'none',
});

export const queueChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.sm,
  flexShrink: 0,
  minHeight: 36,
  padding: `0 ${space.md}px`,
  borderRadius: radius.pill,
  border: `1px solid ${c.glass.border}`,
  color: c.text.secondary,
  fontSize: 13,
  fontWeight: weight.medium,
  textDecoration: 'none',
  selectors: {
    '&:hover': { background: c.glass.fillStrong, color: c.text.primary },
    '&[aria-current="page"]': {
      background: c.accentSoft,
      borderColor: 'transparent',
      color: c.text.primary,
    },
  },
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: '340px minmax(0, 1fr)',
  gap: space.xl,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const list = style({
  position: 'sticky',
  top: 72,
  display: 'grid',
  gap: 2,
  maxHeight: 'calc(100dvh - 120px)',
  overflowY: 'auto',
  margin: 0,
  padding: space.xs,
  listStyle: 'none',
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  '@media': { 'screen and (max-width: 900px)': { display: 'none' } },
});

export const listItem = style({
  display: 'grid',
  gap: 2,
  width: '100%',
  padding: `${space.sm}px ${space.md}px`,
  border: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: c.text.primary,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: c.glass.fillStrong },
    '&[aria-current="true"]': { background: c.accentSoft },
  },
});

export const listTitle = style({ fontSize: 14, fontWeight: weight.semibold });
export const listMeta = style({ fontSize: 12, color: c.text.tertiary });
export const age = style({ selectors: { '&[data-late="true"]': { color: c.danger } } });
export const more = style({ padding: space.md });

export const done = style({
  justifyItems: 'center',
  textAlign: 'center',
  padding: `${space.giant}px ${space.xl}px`,
});
export const doneIcon = style({ color: c.success });

export const listSkeleton = style({ height: 420, borderRadius: radius.lg });
export const detailSkeleton = style({ height: 520, borderRadius: radius.lg });
