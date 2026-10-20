import { act, renderHook } from '@testing-library/react-native';
import { confirm } from '@/shared/ui/dialog';
import { useConsentStore } from '../consentStore';
import { useTellAboutPolicyChange } from '../consentSync';
import { POLICY_VERSION, PRIVACY_ROUTE } from '../policies';

const mockPush = jest.fn();
jest.mock('@/shared/lib/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/shared/ui/dialog', () => ({ confirm: jest.fn() }));
jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
const ask = confirm as jest.Mock;

const agreed = (policyVersion: string) => ({
  privacy: {
    granted: true,
    policyVersion,
    updatedAt: '2026-09-01T00:00:00Z',
    syncedAt: '2026-09-01T00:00:00Z',
  },
});

beforeEach(() => {
  mockPush.mockReset();
  ask.mockReset();
});

describe('a changed privacy policy', () => {
  it('is told once, then counts as seen under the new version', async () => {
    ask.mockResolvedValue(true);
    useConsentStore.setState({ consents: agreed('older'), loaded: true });
    const { rerender } = renderHook(() => useTellAboutPolicyChange(true));
    await act(async () => {});
    expect(ask).toHaveBeenCalledTimes(1);
    expect(useConsentStore.getState().consents.privacy?.policyVersion).toBe(POLICY_VERSION);
    expect(mockPush).toHaveBeenCalledWith(PRIVACY_ROUTE);
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
});
