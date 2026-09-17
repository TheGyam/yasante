import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { useStackPresets } from './stackOptions';

/**
 * The stack inside a tab. Tabs that share routes also share one layout file, and a
 * tab builds its stack from the first declared screen — so each passes its own root.
 * Pair it with `unstable_settings` anchors in the route file for deep links.
 */
export function TabStack({ root, children }: { root: string; children?: ReactNode }) {
  const { push } = useStackPresets();
  return (
    <Stack screenOptions={push}>
      <Stack.Screen name={root} />
      {children}
    </Stack>
  );
}

/** One screen per id: reopening something already in the history returns to it. */
export const singularById = (_name: string, params: Record<string, unknown>) =>
  typeof params?.id === 'string' ? params.id : undefined;
