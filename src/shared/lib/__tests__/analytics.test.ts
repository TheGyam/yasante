import { useConsentStore } from '@/shared/config/consentStore';
import { localTimestamp, queuedEvents, track } from '../analytics';

jest.mock('../api/client', () => ({ apiClient: { post: jest.fn().mockResolvedValue({}) } }));

const consent = (granted: boolean) => useConsentStore.getState().setConsent('analytics', granted);

describe('analytics', () => {
  it('drops events without the analytics consent — never queued, never sent', () => {
    consent(false);
    track('view_look', { lookId: 'a' });
    expect(queuedEvents()).toHaveLength(0);
  });

  it('queues events with both UTC and her local time', () => {
    consent(true);
    track('search', { surface: 'looks', results: 3 });
    const [event] = queuedEvents();
    expect(event).toMatchObject({ name: 'search', properties: { results: 3 } });
    expect(event.localAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    // The same moment, to the second.
    expect(Math.floor(new Date(event.at).getTime() / 1000) * 1000).toBe(
      new Date(event.localAt).getTime()
    );
  });

  it('forgets anything queued the moment the consent is withdrawn', () => {
    consent(true);
    track('view_stylist', { handle: 'x' });
    expect(queuedEvents().length).toBeGreaterThan(0);
    consent(false);
    expect(queuedEvents()).toHaveLength(0);
  });

  it('writes local time with its offset', () => {
    expect(localTimestamp(new Date(2026, 8, 21, 18, 5, 9))).toMatch(
      /^2026-09-21T18:05:09[+-]\d\d:\d\d$/
    );
  });
});
