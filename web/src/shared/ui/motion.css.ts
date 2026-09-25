import { keyframes } from '@vanilla-extract/css';
import { EASE_OUT } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

/**
 * Press feedback, the app's PressableScale: a scale on transform only, quick in and
 * softer out. Spread into anything pressable.
 */
export function pressable(scale = 0.97, extra: string[] = []) {
  return {
    transition: [`transform ${vars.time.pressOut} ${EASE_OUT}`, ...extra].join(', '),
    WebkitTapHighlightColor: 'transparent',
    selectors: {
      '&:active:not(:disabled)': {
        transform: `scale(${scale})`,
        transitionDuration: vars.time.pressIn,
      },
    },
  } as const;
}

/** A transition on the app's `state` timing. */
export const stateTransition = (...properties: string[]) =>
  properties.map(p => `${p} ${vars.time.state} ${EASE_OUT}`);

export const spin = keyframes({ to: { transform: 'rotate(360deg)' } });
