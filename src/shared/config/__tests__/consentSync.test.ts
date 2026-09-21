import { apiClient } from '@/shared/lib/api/client';
import { useConsentStore } from '../consentStore';
import { syncConsents } from '../consentSync';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn() } }));
const post = apiClient.post as jest.Mock;

const synced = () =>
  Object.values(useConsentStore.getState().consents).filter(c => c.syncedAt).length;

beforeEach(() => {
  post.mockReset();
  useConsentStore.setState(state => ({
    consents: Object.fromEntries(
      Object.entries(state.consents).map(([k, v]) => [k, { ...v, syncedAt: null }])
    ) as typeof state.consents,
  }));
});

describe('consent sync', () => {
  it('sends every record only on this device, and marks them stored', async () => {
    post.mockResolvedValue({});
    await syncConsents();
    const body = post.mock.calls[0][1];
    expect(body.consents).toHaveLength(5);
    expect(body.consents[0]).toEqual(
      expect.objectContaining({ purpose: expect.any(String), policyVersion: expect.any(String) })
    );
    expect(synced()).toBe(5);
    await syncConsents();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('keeps them pending when the send fails', async () => {
    post.mockRejectedValue(new Error('offline'));
    await syncConsents();
    expect(synced()).toBe(0);
  });

  it('doesn’t mark a choice stored if it changed again while being sent', async () => {
    let finish: () => void = () => {};
    post.mockReturnValue(new Promise(resolve => (finish = () => resolve({}))));
    const sending = syncConsents();
    useConsentStore.getState().setConsent('analytics', true);
    finish();
    await sending;
    expect(useConsentStore.getState().consents.analytics.syncedAt).toBeNull();
    expect(synced()).toBe(4);
  });
});
