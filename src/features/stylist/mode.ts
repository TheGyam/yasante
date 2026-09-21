import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuth } from '@/features/auth';
import { track } from '@/shared/lib/analytics';

export type AppMode = 'client' | 'stylist';

interface ModeState {
  /** Remembered across launches: a stylist who lives in stylist mode stays there. */
  mode: AppMode;
  /** Set while the switch interstitial is showing. */
  switchingTo: AppMode | null;
  /** Where the switch was tapped; the transition grows from there. */
  origin: { x: number; y: number } | null;
  setMode: (mode: AppMode) => void;
  beginSwitch: (to: AppMode, origin?: { x: number; y: number }) => void;
  endSwitch: () => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    set => ({
      mode: 'client',
      switchingTo: null,
      origin: null,
      setMode: mode => set({ mode }),
      beginSwitch: (to, origin) => {
        track('switch_mode', { to });
        set({ switchingTo: to, origin: origin ?? null });
      },
      endSwitch: () => set({ switchingTo: null, origin: null }),
    }),
    {
      name: '@yasante:mode',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ mode: state.mode }),
    }
  )
);

/** Whether the signed-in account can use stylist mode. */
export function useIsStylist() {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && !!user?.roles?.includes('stylist');
}

/** The mode actually in effect: stylist only for a signed-in stylist. */
export function useActiveMode(): AppMode {
  const isStylist = useIsStylist();
  const mode = useModeStore(s => s.mode);
  return mode === 'stylist' && isStylist ? 'stylist' : 'client';
}
