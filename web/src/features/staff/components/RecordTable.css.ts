export * from './layout.css';
import { vars } from '@/shared/theme/vars.css';
import { globalStyle, style } from '@vanilla-extract/css';
import { tableWrap } from './layout.css';
export const recordTableWrap = style([
  tableWrap,
  { '@media': { '(max-width:719px)': { overflowX: 'visible' } } },
]);
globalStyle(`${recordTableWrap} table`, {
  '@media': { '(max-width:719px)': { display: 'block' } },
});
globalStyle(`${recordTableWrap} thead`, { '@media': { '(max-width:719px)': { display: 'none' } } });
globalStyle(`${recordTableWrap} tbody`, {
  '@media': { '(max-width:719px)': { display: 'grid', gap: 12 } },
});
globalStyle(`${recordTableWrap} tbody tr`, {
  '@media': {
    '(max-width:719px)': {
      display: 'grid',
      padding: 12,
      borderBottom: `1px solid ${vars.color.separator}`,
    },
  },
});
globalStyle(`${recordTableWrap} td`, {
  '@media': {
    '(max-width:719px)': { display: 'block', maxWidth: 'none', padding: '8px 0', border: 0 },
  },
});
globalStyle(`${recordTableWrap} td[data-label]::before`, {
  '@media': {
    '(max-width:719px)': { content: 'attr(data-label) ": "', color: vars.color.text.secondary },
  },
});

export const mobileSelection = style({
  display: 'none',
  '@media': { '(max-width:719px)': { display: 'block', padding: 12 } },
});
globalStyle(`${recordTableWrap} td[data-title]`, {
  '@media': { '(max-width:719px)': { fontWeight: 600, fontSize: 16 } },
});
