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
  /**
   * The mode a new account opens in, once sign-up has closed. Switching while the
   * sign-up screens are still up swapped every tab underneath them in the same moment
   * the account signed in, and crashed; this waits, then plays the normal switch.
   */
  startAs: AppMode | null;
  setStartAs: (mode: AppMode | null) => void;
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
      startAs: null,
      setStartAs: startAs => set({ startAs }),
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
      partialize: state => ({ mode: state.mode, startAs: state.startAs }),
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
