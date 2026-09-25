/**
 * The theme lives in CSS (./theme.css) so pages paint in the right colours before any
 * script runs. This is the little that code needs to know.
 */
export { useReducedMotion } from './useReducedMotion';

/** The app's type scale: each variant is a class in shared/ui/Text.module.css. */
export type TypeVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline';
