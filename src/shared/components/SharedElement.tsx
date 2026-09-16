import type { ComponentType, ReactNode } from 'react';
import { SharedElement as LibrarySharedElement } from 'react-native-shared-element';

/**
 * The library types `onNode` as required, but it is injected by the transition
 * at runtime and callers never pass it. Re-typed here once so call sites stay clean.
 */
export const SharedElement = LibrarySharedElement as unknown as ComponentType<{
  id: string;
  children: ReactNode;
  onNode?: (node: unknown) => void;
}>;
