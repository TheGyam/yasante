import { apiClient } from '@/shared/lib/api/client';
import { useConsentStore, type ConsentPurpose } from '../consentStore';
import { loadConsents, syncConsents } from '../consentSync';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
const post = apiClient.post as jest.Mock;
const get = apiClient.get as jest.Mock;

const store = () => useConsentStore.getState();
const synced = () => Object.values(store().consents).filter(c => c.syncedAt).length;

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  useConsentStore.setState({ consents: {} });
});

describe('consent choices', () => {
  it('start with nothing ticked and nothing to send', () => {
    const purposes: ConsentPurpose[] = [
      'terms',
      'privacy',
      'analytics',
      'personalisation',
      'research',
    ];
    for (const purpose of purposes) expect(store().isGranted(purpose)).toBe(false);
    expect(store().pendingSync()).toEqual([]);
  });
});

describe('consent sync', () => {
  it('sends only the choices she made on this device, and marks them stored', async () => {
    post.mockResolvedValue({});
    store().setConsent('analytics', true);
    store().setConsent('research', false);
    await syncConsents();
    const body = post.mock.calls[0][1];
    expect(body.consents.map((c: { purpose: string }) => c.purpose)).toEqual([
      'analytics',
      'research',
    ]);
    expect(synced()).toBe(2);
    await syncConsents();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('keeps them pending when the send fails', async () => {
    post.mockRejectedValue(new Error('offline'));
    store().setConsent('analytics', true);
    await syncConsents();
    expect(synced()).toBe(0);
  });

  it('doesn’t mark a choice stored if it changed again while being sent', async () => {
    let finish: () => void = () => {};
    post.mockReturnValue(new Promise(resolve => (finish = () => resolve({}))));
    store().setConsent('analytics', false);
    store().setConsent('research', false);
    const sending = syncConsents();
    store().setConsent('analytics', true);
    finish();
    await sending;
    expect(store().consents.analytics?.syncedAt).toBeNull();
    expect(synced()).toBe(1);
  });
});

describe('loading the server’s answers', () => {
  const answer = (purpose: string, granted: boolean) => ({
    purpose,
    granted,
    policyVersion: '2026-09',
    recordedAt: '2026-10-01T10:00:00.000Z',
  });

  it('replaces what this device had stored with the account’s answers', async () => {
    post.mockResolvedValue({});
    store().setConsent('analytics', true);
    store().setConsent('research', true);
    await syncConsents();
    // Changed elsewhere: analytics turned off, research never answered on this account.
    get.mockResolvedValue({ data: { consents: [answer('analytics', false)] } });
    await loadConsents();
    expect(store().isGranted('analytics')).toBe(false);
    expect(store().consents.research).toBeUndefined();
    expect(store().pendingSync()).toEqual([]);
  });

  it('keeps a choice this device hasn’t sent yet', async () => {
    store().setConsent('analytics', true);
    get.mockResolvedValue({ data: { consents: [answer('analytics', false)] } });
    await loadConsents();
    expect(store().isGranted('analytics')).toBe(true);
    expect(store().pendingSync()).toHaveLength(1);
  });

  it('leaves the device’s answers alone when the server can’t be reached', async () => {
    store().setConsent('research', true);
    get.mockRejectedValue(new Error('offline'));
    await loadConsents();
    expect(store().isGranted('research')).toBe(true);
  });
});
