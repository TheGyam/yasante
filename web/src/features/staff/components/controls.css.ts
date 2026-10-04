import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { globalStyle, style } from '@vanilla-extract/css';
const c = vars.color;
export const tableWrap = style({
  overflowX: 'auto',
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.lg,
  background: c.glass.fill,
});
export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
  textAlign: 'left',
});
globalStyle(`${table} th`, {
  padding: '14px 18px',
  background: c.glass.fillStrong,
  color: c.text.secondary,
  whiteSpace: 'nowrap',
  fontWeight: weight.medium,
  borderBottom: `1px solid ${c.separator}`,
});
globalStyle(`${table} td`, {
  padding: '16px 18px',
  borderBottom: `1px solid ${c.separator}`,
  maxWidth: 320,
  overflowWrap: 'anywhere',
});
globalStyle(`${table} tbody tr:hover`, { background: c.accentSoft });
globalStyle(`${table} input[type="checkbox"]`, { width: 18, height: 18, accentColor: c.accent });
export const sort = style({
  border: 0,
  padding: 0,
  minHeight: 32,
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.sm,
  background: 'none',
  cursor: 'pointer',
  fontWeight: weight.medium,
});
export const filters = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: space.md,
});
export const filter = style({ minWidth: 150, maxWidth: 260 });
export const search = style({
  display: 'flex',
  alignItems: 'end',
  gap: space.sm,
  flex: 1,
  minWidth: 240,
});
export const selection = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: space.md,
  padding: space.lg,
  borderRadius: radius.md,
  background: c.accentSoft,
});
export const empty = style({
  textAlign: 'center',
  padding: '48px 24px',
  display: 'grid',
  justifyItems: 'center',
  gap: space.lg,
  color: c.text.secondary,
});
export const dialog = style({
  width: 'min(560px, calc(100vw - 32px))',
  maxHeight: '80dvh',
  overflowY: 'auto',
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.lg,
  padding: space.xxl,
  background: c.glass.chromeSolid,
  color: c.text.primary,
  selectors: { '&::backdrop': { background: c.scrim } },
});
export const gate = style({
  maxWidth: 520,
  margin: '12vh auto',
  padding: space.xxl,
  display: 'grid',
  gap: space.xxl,
});
export const skip = style({
  position: 'fixed',
  top: 8,
  left: 8,
  zIndex: 10,
  padding: space.md,
  background: c.glass.chromeSolid,
  transform: 'translateY(-200%)',
  selectors: { '&:focus': { transform: 'translateY(0)' } },
});
export const resourceMenu = style({ fontSize: 13 });
export const fields = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
  gap: space.xxl,
  marginTop: space.xxl,
});
export const field = style({
  display: 'grid',
  gap: space.sm,
  minWidth: 0,
  alignContent: 'start',
  overflowWrap: 'anywhere',
});
export const fullField = style({ gridColumn: '1 / -1' });
export const editorActions = style({
  position: 'sticky',
  bottom: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.md,
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: space.lg,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.md,
  background: c.glass.chromeSolid,
  zIndex: 2,
});
export const choiceList = style({
  maxHeight: 260,
  overflowY: 'auto',
  display: 'grid',
  gap: space.xs,
});
export const choice = style([
  { justifyContent: 'space-between', textAlign: 'left', fontWeight: weight.regular },
]);
export const inlineRow = style({
  borderTop: `1px solid ${c.separator}`,
  padding: '24px 0',
  display: 'grid',
  gap: space.lg,
});
export const actionsMenu = style({ position: 'relative' });
export const actionOptions = style({
  position: 'absolute',
  bottom: 'calc(100% + 12px)',
  right: 0,
  minWidth: 230,
  display: 'grid',
  gap: space.sm,
  padding: space.lg,
  background: c.glass.chromeSolid,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.md,
});

export const loadingPanel = style({ height: 160, width: '100%' });
