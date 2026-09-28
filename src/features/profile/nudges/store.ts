import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NudgeKind, NudgeMemory } from './logic';

/** What's been asked on this phone, and what not to ask again. */
interface NudgeState extends NudgeMemory {
  seen: () => void;
  shown: () => void;
  snooze: (kind: NudgeKind, days: number) => void;
  turnOff: (kind: NudgeKind) => void;
}

export const useNudgeMemory = create<NudgeState>()(
  persist(
    set => ({
      snoozedUntil: {},
      off: [],
      seen: () => set(s => (s.firstSeenAt ? s : { firstSeenAt: new Date().toISOString() })),
      shown: () => set({ lastShownAt: new Date().toISOString() }),
      snooze: (kind, days) =>
        set(s => ({
          snoozedUntil: {
            ...s.snoozedUntil,
            [kind]: new Date(Date.now() + days * 86_400_000).toISOString(),
          },
        })),
      turnOff: kind => set(s => ({ off: [...new Set([...s.off, kind])] })),
    }),
    { name: '@yasante:nudges', storage: createJSONStorage(() => AsyncStorage) }
  )
);
