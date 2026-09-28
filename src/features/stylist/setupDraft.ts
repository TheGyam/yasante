import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StylistProfileDraft } from './types';

/**
 * Setup is filled in over a twenty-minute call, sometimes interrupted. The answers
 * live on the device as she goes, so closing the app never means starting again.
 */
export interface SetupDraft extends StylistProfileDraft {
  /** Which step she reached, so she comes back to it. */
  step: number;
}

export const EMPTY_DRAFT: SetupDraft = {
  step: 0,
  displayName: '',
  handle: '',
  bio: '',
  serviceModels: [],
  baseArea: '',
  address: '',
  travelRadiusMiles: 5,
  instagramHandle: '',
  policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20, rescheduleFreeOnce: true },
  proofPhotoUri: undefined,
};

interface SetupState {
  draft: SetupDraft;
  update: (changes: Partial<SetupDraft>) => void;
  reset: () => void;
}

export const useSetupDraft = create<SetupState>()(
  persist(
    set => ({
      draft: EMPTY_DRAFT,
      update: changes => set(state => ({ draft: { ...state.draft, ...changes } })),
      reset: () => set({ draft: EMPTY_DRAFT }),
    }),
    { name: '@yasante:stylist-setup', storage: createJSONStorage(() => AsyncStorage) }
  )
);
