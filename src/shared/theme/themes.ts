import type { BlurTint } from 'expo-blur';

/**
 * Two theme objects, built once at module load. Components receive one of these
 * exact references, so anything keyed on the theme (styles, memoised values) is
 * stable until the colour scheme actually changes.
 *
 * Palette: an aubergine ground carrying warm rose and amber glows — the Yasante
 * plum, lit rather than flat. Glass is a translucent fill with a lighter top edge;
 * real blur is reserved for chrome (tab bar, headers, sheets).
 */
export interface Theme {
  scheme: 'light' | 'dark';
  statusBar: 'light' | 'dark';
  blurTint: BlurTint;
  colors: {
    bg: string;
    /** Soft light sources painted behind content. */
    ambient: readonly [string, string, string];
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
    bg: '#0B0709',
    ambient: ['#6B1F3D', '#B8456E', '#C98A3E'],
    glass: {
      fill: 'rgba(255,255,255,0.06)',
      fillStrong: 'rgba(255,255,255,0.12)',
      border: 'rgba(255,255,255,0.09)',
      highlight: 'rgba(255,255,255,0.18)',
      chromeTint: 'rgba(18,10,14,0.35)',
      chromeSolid: 'rgba(24,15,20,0.94)',
    },
    text: {
      primary: '#F8F1F4',
      secondary: 'rgba(248,241,244,0.66)',
      tertiary: 'rgba(248,241,244,0.42)',
      onAccent: '#1C0912',
    },
    accent: '#FF8FB8',
    accentSoft: 'rgba(255,143,184,0.16)',
    gold: '#F4B860',
    success: '#5ED6A2',
    successSoft: 'rgba(94,214,162,0.14)',
    warning: '#F4B860',
    warningSoft: 'rgba(244,184,96,0.14)',
    danger: '#FF6B7A',
    dangerSoft: 'rgba(255,107,122,0.14)',
    separator: 'rgba(255,255,255,0.07)',
    scrim: 'rgba(5,3,4,0.62)',
  },
};

export const lightTheme: Theme = {
  scheme: 'light',
  statusBar: 'dark',
  blurTint: 'systemThinMaterialLight',
  colors: {
    bg: '#F7F2F4',
    ambient: ['#F2C3D3', '#F8D9C0', '#E9CDD8'],
    glass: {
      fill: 'rgba(255,255,255,0.62)',
      fillStrong: 'rgba(255,255,255,0.9)',
      border: 'rgba(40,16,26,0.07)',
      highlight: 'rgba(255,255,255,0.95)',
      chromeTint: 'rgba(255,255,255,0.45)',
      chromeSolid: 'rgba(255,255,255,0.96)',
    },
    text: {
      primary: '#1B0E14',
      secondary: 'rgba(27,14,20,0.62)',
      tertiary: 'rgba(27,14,20,0.42)',
      onAccent: '#FFFFFF',
    },
    accent: '#B8336A',
    accentSoft: 'rgba(184,51,106,0.10)',
    gold: '#A86C12',
    success: '#1F8F62',
    successSoft: 'rgba(31,143,98,0.10)',
    warning: '#A86C12',
    warningSoft: 'rgba(168,108,18,0.10)',
    danger: '#C7303F',
    dangerSoft: 'rgba(199,48,63,0.09)',
    separator: 'rgba(27,14,20,0.07)',
    scrim: 'rgba(27,14,20,0.42)',
  },
};
