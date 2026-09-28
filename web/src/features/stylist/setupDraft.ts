import { useCallback, useState } from 'react';
import { readJson, writeJson } from '@/shared/lib/storage';
import type { StylistProfile, StylistProfileDraft } from './types';

/**
 * Setup gets interrupted. The answers are kept in this browser as she goes, so a
 * closed tab never means starting again. Kept per account, so a second person on the
 * same computer never inherits the first's.
 */
export interface SetupDraft extends StylistProfileDraft {
  /** Which step she reached, so she comes back to it. */
  step: number;
}

function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

/** The app's starting point (src/features/stylist/setupDraft.ts). */
export const EMPTY_DRAFT: SetupDraft = {
  step: 0,
  displayName: '',
  handle: '',
  bio: '',
  serviceModels: [],
  baseArea: '',
  address: '',
  // Her working hours are on this computer's clock.
  timeZone: browserZone(),
  travelRadiusMiles: 5,
  instagramHandle: '',
  policies: { noticeHours: 48, depositType: 'fixed', depositAmount: 20, rescheduleFreeOnce: true },
  proofPhotoUri: undefined,
};

const key = (accountId: string) => `yasante.stylist-setup.${accountId}`;

/** A page she already has, as a draft to edit. */
export function draftFromProfile(profile: StylistProfile): SetupDraft {
  return {
    step: 0,
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio ?? '',
    serviceModels: profile.serviceModels,
    baseArea: profile.baseArea,
    address: profile.address ?? '',
    timeZone: browserZone(),
    travelRadiusMiles: profile.travelRadiusMiles ?? EMPTY_DRAFT.travelRadiusMiles,
    instagramHandle: profile.instagramHandle ?? '',
    policies: {
      noticeHours: profile.policies.noticeHours,
      depositType: profile.policies.depositType,
      depositAmount: profile.policies.depositAmount,
      rescheduleFreeOnce: profile.policies.rescheduleFreeOnce ?? true,
    },
    proofPhotoUri: profile.proofPhotoUri,
  };
}

export function useSetupDraft(accountId: string, start?: Partial<SetupDraft>) {
  const [draft, setDraft] = useState<SetupDraft>(
    () => readJson<SetupDraft>(key(accountId)) ?? { ...EMPTY_DRAFT, ...start }
  );
  const update = useCallback(
    (changes: Partial<SetupDraft>) =>
      setDraft(current => {
        const next = { ...current, ...changes };
        writeJson(key(accountId), next);
        return next;
      }),
    [accountId]
  );
  const reset = useCallback(() => writeJson(key(accountId), undefined), [accountId]);
  return { draft, update, reset };
}
