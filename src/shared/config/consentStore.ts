import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POLICY_VERSION } from './policies';

/**
 * Consent is recorded per purpose, never as one blanket switch, so each can be
 * given and withdrawn on its own.
 *
 * `research` covers any future dataset or model-training use. It defaults to off
 * and must never be bundled with anything else.
 */
export type ConsentPurpose =
  | 'terms'
  | 'privacy'
  | 'analytics'
  | 'personalisation'
  | 'research';

export interface ConsentRecord {
  granted: boolean;
  policyVersion: string;
  updatedAt: string;
  /** Set once the backend has stored this record. Null means it only exists on this device. */
  syncedAt: string | null;
}

const record = (granted: boolean): ConsentRecord => ({
  granted,
  policyVersion: POLICY_VERSION,
  updatedAt: new Date().toISOString(),
  syncedAt: null,
});

// Nothing optional is pre-ticked.
const DEFAULTS: Record<ConsentPurpose, ConsentRecord> = {
  terms: record(false),
  privacy: record(false),
  analytics: record(false),
  personalisation: record(true), // how the feed is matched to your hair; part of the service
  research: record(false),
};

interface ConsentState {
  consents: Record<ConsentPurpose, ConsentRecord>;
  setConsent: (purpose: ConsentPurpose, granted: boolean) => void;
  isGranted: (purpose: ConsentPurpose) => boolean;
  /** Records not yet stored server-side. */
  pendingSync: () => Array<{ purpose: ConsentPurpose } & ConsentRecord>;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      consents: DEFAULTS,

      setConsent: (purpose, granted) => {
        set((state) => ({
          consents: { ...state.consents, [purpose]: record(granted) },
        }));
        // ponytail: device-local until the consent endpoint exists; pendingSync() is
        // the hook for posting these, and syncedAt is what marks them done.
      },

      isGranted: (purpose) => get().consents[purpose]?.granted ?? false,

      pendingSync: () =>
        (Object.entries(get().consents) as Array<[ConsentPurpose, ConsentRecord]>)
          .filter(([, value]) => value.syncedAt === null)
          .map(([purpose, value]) => ({ purpose, ...value })),
    }),
    {
      name: '@yasante:consent',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
