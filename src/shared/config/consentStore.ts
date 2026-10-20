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
export type ConsentPurpose = 'terms' | 'privacy' | 'analytics' | 'personalisation' | 'research';

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

/** A purpose with no record is one she hasn't answered, which counts as a no. */
type Consents = Partial<Record<ConsentPurpose, ConsentRecord>>;

/** One answer as the server keeps it. */
export interface ServerConsent {
  purpose: string;
  granted: boolean;
  policyVersion: string;
  recordedAt: string;
}

interface ConsentState {
  consents: Consents;
  setConsent: (purpose: ConsentPurpose, granted: boolean) => void;
  isGranted: (purpose: ConsentPurpose) => boolean;
  /** Records not yet stored server-side. */
  pendingSync: () => Array<{ purpose: ConsentPurpose } & ConsentRecord>;
  /** Marks records stored — only if they haven't changed again since they were sent. */
  markSynced: (
    sent: Array<{ purpose: ConsentPurpose; granted: boolean; updatedAt: string }>,
    at: string
  ) => void;
  /**
   * Takes the account's answers from the server, asked for at `askedAt`. A choice made
   * on this device that the server hadn't stored by then still wins.
   */
  takeServerAnswers: (answers: ServerConsent[], askedAt: string) => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      // Nothing is pre-ticked, and nothing is sent as a choice until she makes it.
      consents: {},

      setConsent: (purpose, granted) => {
        set(state => ({
          consents: { ...state.consents, [purpose]: record(granted) },
        }));
      },

      markSynced: (sent, at) =>
        set(state => {
          const consents = { ...state.consents };
          for (const { purpose, granted, updatedAt } of sent) {
            const current = consents[purpose];
            // Two taps can share a millisecond, so the answer has to match as well.
            if (current?.updatedAt === updatedAt && current.granted === granted) {
              consents[purpose] = { ...current, syncedAt: at };
            }
          }
          return { consents };
        }),

      takeServerAnswers: (answers, askedAt) =>
        set(state => {
          const consents: Consents = {};
          for (const { purpose, granted, policyVersion, recordedAt } of answers) {
            consents[purpose as ConsentPurpose] = {
              granted,
              policyVersion,
              updatedAt: recordedAt,
              syncedAt: recordedAt,
            };
          }
          const mine = Object.entries(state.consents) as [ConsentPurpose, ConsentRecord][];
          for (const [purpose, value] of mine) {
            if (value.syncedAt === null || value.syncedAt > askedAt) consents[purpose] = value;
          }
          return { consents };
        }),

      isGranted: purpose => get().consents[purpose]?.granted ?? false,

      pendingSync: () =>
        (Object.entries(get().consents) as Array<[ConsentPurpose, ConsentRecord]>)
          .filter(([, value]) => value.syncedAt === null)
          .map(([purpose, value]) => ({ purpose, ...value })),
    }),
    {
      name: '@yasante:consent',
      storage: createJSONStorage(() => AsyncStorage),
      // Before version 1 every purpose started with an answer she never gave, hair
      // details ticked on. Start clean; the server's answers come back on the next load.
      version: 1,
      migrate: () => ({ consents: {} }),
    }
  )
);
