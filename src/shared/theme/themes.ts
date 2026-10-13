import type { BlurTint } from 'expo-blur';

/**
 * Two theme objects, built once at module load. Components receive one of these
 * exact references, so anything keyed on the theme (styles, memoised values) is
 * stable until the colour scheme actually changes.
 *
 * Palette: Ube, a warm creamy purple with amber beside it, named after the purple
 * yam. Glass is a translucent fill with a lighter top edge;
 * real blur is reserved for chrome (tab bar, headers, sheets).
 */
export interface Theme {
  scheme: 'light' | 'dark';
  statusBar: 'light' | 'dark';
  blurTint: BlurTint;
  colors: {
    bg: string;
    glass: {
      /** Cards and grouped lists. */
      fill: string;
      /** Pressed rows, active controls, the tab indicator. */
      fillStrong: string;
      border: string;
      /** Top edge of a glass surface, catching light. */
      highlight: string;
      /** Chrome over blur on iOS. */
      chromeTint: string;
      /** Chrome where blur isn't used (Android). */
      chromeSolid: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      onAccent: string;
    };
    accent: string;
    accentSoft: string;
    gold: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    separator: string;
    scrim: string;
  };
}

export const darkTheme: Theme = {
  scheme: 'dark',
  statusBar: 'light',
  blurTint: 'systemThinMaterialDark',
  colors: {
    bg: '#100A0F',
    glass: {
      fill: 'rgba(255,255,255,0.06)',
      fillStrong: 'rgba(255,255,255,0.12)',
      border: 'rgba(255,255,255,0.09)',
      highlight: 'rgba(255,255,255,0.18)',
      chromeTint: 'rgba(20,12,19,0.35)',
      chromeSolid: 'rgba(26,17,25,0.94)',
    },
    text: {
      primary: '#F6F0F5',
      secondary: 'rgba(246,240,245,0.66)',
      tertiary: 'rgba(246,240,245,0.42)',
      onAccent: '#1D0F28',
    },
    accent: '#C79CE3',
    accentSoft: 'rgba(199,156,227,0.16)',
    gold: '#F2B35C',
    success: '#5ED6A2',
    successSoft: 'rgba(94,214,162,0.14)',
    warning: '#F2B35C',
    warningSoft: 'rgba(242,179,92,0.14)',
    danger: '#FF6B7A',
    dangerSoft: 'rgba(255,107,122,0.14)',
    separator: 'rgba(255,255,255,0.07)',
    scrim: 'rgba(6,3,6,0.62)',
  },
};

export const lightTheme: Theme = {
  scheme: 'light',
  statusBar: 'dark',
  blurTint: 'systemThinMaterialLight',
  colors: {
    bg: '#F8F3F1',
    glass: {
      fill: 'rgba(255,255,255,0.62)',
      fillStrong: 'rgba(255,255,255,0.9)',
      border: 'rgba(38,20,48,0.07)',
      highlight: 'rgba(255,255,255,0.95)',
      chromeTint: 'rgba(255,255,255,0.45)',
      chromeSolid: 'rgba(255,255,255,0.96)',
    },
    text: {
      primary: '#1A1220',
      secondary: 'rgba(26,18,32,0.62)',
      tertiary: 'rgba(26,18,32,0.42)',
      onAccent: '#FFFFFF',
    },
    accent: '#7A3E9F',
    accentSoft: 'rgba(122,62,159,0.10)',
    gold: '#A86C12',
    success: '#1F8F62',
    successSoft: 'rgba(31,143,98,0.10)',
    warning: '#A86C12',
    warningSoft: 'rgba(168,108,18,0.10)',
    danger: '#C7303F',
    dangerSoft: 'rgba(199,48,63,0.09)',
    separator: 'rgba(26,18,32,0.07)',
    scrim: 'rgba(26,18,32,0.42)',
  },
};
