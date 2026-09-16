import type { ReactNode } from 'react';
import { Fragment } from 'react';

/**
 * Passthrough stand-in for react-native-shared-element.
 *
 * That library (0.8.9, last released years ago) does not compile against React
 * Native 0.81 — its RNSharedElementDrawable references APIs that no longer
 * exist, which failed the Android build outright.
 *
 * Nothing in the app used the transition machinery: every call site wrapped an
 * image to tag it for a transition that was never wired up. So this renders the
 * children and keeps the call sites unchanged. Navigation is unaffected.
 *
 * If shared element transitions are wanted later, do them with a maintained
 * approach rather than reviving this dependency.
 */
export function SharedElement({
  children,
}: {
  id: string;
  children: ReactNode;
  onNode?: (node: unknown) => void;
}) {
  return <Fragment>{children}</Fragment>;
}
