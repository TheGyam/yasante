import { act, renderHook } from '@testing-library/react-native';
import { confirm } from '@/shared/ui/dialog';
import { useConsentStore } from '../consentStore';
import { useTellAboutPolicyChange } from '../consentSync';
import { POLICY_VERSION } from '../policies';

const mockPush = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/shared/ui/dialog', () => ({ confirm: jest.fn() }));
jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
const ask = confirm as jest.Mock;

const seen = (policyVersion: string) => ({
  granted: true,
  policyVersion,
  updatedAt: '2026-09-01T00:00:00Z',
  syncedAt: '2026-09-01T00:00:00Z',
});
const agreed = (policyVersion: string, terms = policyVersion) => ({
  privacy: seen(policyVersion),
  terms: seen(terms),
});

beforeEach(() => {
  mockPush.mockReset();
  ask.mockReset();
});

describe('changed terms or privacy policy', () => {
  it('is told once, then counts as seen under the new version', async () => {
    ask.mockResolvedValue(true);
    useConsentStore.setState({ consents: agreed('older'), loaded: true });
    const { rerender } = renderHook(() => useTellAboutPolicyChange(true));
    await act(async () => {});
    expect(ask).toHaveBeenCalledTimes(1);
    const { privacy, terms } = useConsentStore.getState().consents;
    expect([privacy?.policyVersion, terms?.policyVersion]).toEqual([
      POLICY_VERSION,
      POLICY_VERSION,
    ]);
    expect(mockPush).toHaveBeenCalledWith('/settings');
    rerender({});
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('isn’t mentioned when she has seen this version, or before her answers arrive', async () => {
    useConsentStore.setState({ consents: agreed(POLICY_VERSION), loaded: true });
    renderHook(() => useTellAboutPolicyChange(true));
    useConsentStore.setState({ consents: {}, loaded: false });
    renderHook(() => useTellAboutPolicyChange(true));
    await act(async () => {});
    expect(ask).not.toHaveBeenCalled();
  });

  it('is told when only the terms have changed', async () => {
    ask.mockResolvedValue(false);
    useConsentStore.setState({ consents: agreed(POLICY_VERSION, 'older'), loaded: true });
    renderHook(() => useTellAboutPolicyChange(true));
    await act(async () => {});
    expect(ask).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(useConsentStore.getState().consents.terms?.policyVersion).toBe(POLICY_VERSION);
  });
});
