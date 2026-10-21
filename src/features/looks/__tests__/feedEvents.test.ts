import { act, renderHook } from '@testing-library/react-native';
import { apiClient } from '@/shared/lib/api/client';
import { useAuthStore } from '@/features/auth';
import { clearFeedEvents, sendFeedEvents, useFeedDwell, useFeedTracking } from '../feedEvents';
import type { Look } from '../types';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('@/features/auth', () => ({
  useAuthStore: jest.requireActual('zustand').create(() => ({ user: null })),
}));
const post = apiClient.post as jest.Mock;

const look = (id: string, source?: string) => ({ id, source }) as Look;
const shown = (item: Look, index: number) => ({
  changed: [{ item, index, isViewable: true, key: item.id, timestamp: 0 }],
});
const sent = () => post.mock.calls.flatMap(([, body]) => body.events);

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({});
  clearFeedEvents();
});

describe('feed events', () => {
  it('record each look once per session, with where it was and why', async () => {
    const a = look('a', 'trending');
    const { result } = renderHook(() => useFeedTracking('session-1', 'home', [a], jest.fn()));
    act(() => {
      result.current.onViewableItemsChanged(shown(a, 4) as never);
      result.current.onViewableItemsChanged(shown(a, 4) as never);
    });
    await act(() => sendFeedEvents());
    expect(sent()).toEqual([
      {
        session: 'session-1',
        surface: 'home',
        lookId: 'a',
        kind: 'impression',
        position: 4,
        source: 'trending',
      },
    ]);
  });

  it('record nothing without a session from the server', async () => {
    const open = jest.fn();
    const a = look('a');
    const { result } = renderHook(() => useFeedTracking(undefined, 'home', [a], open));
    act(() => {
      result.current.onViewableItemsChanged(shown(a, 0) as never);
      result.current.onOpen(a);
    });
    await act(() => sendFeedEvents());
    expect(post).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(a);
  });

  it('record an open from the feed and how long she stayed on the look', async () => {
    const a = look('a');
    const { result } = renderHook(() =>
      useFeedTracking('session-1', 'looks', [look('b'), a], jest.fn())
    );
    act(() => result.current.onOpen(a));
    const page = renderHook(() => useFeedDwell('a'));
    page.unmount();
    await act(() => sendFeedEvents());
    const [opened, stayed] = sent();
    expect(opened).toMatchObject({ kind: 'open', lookId: 'a', position: 1, surface: 'looks' });
    expect(stayed).toMatchObject({ kind: 'dwell', lookId: 'a', position: 1 });
    expect(stayed.ms).toBeGreaterThanOrEqual(0);
  });

  it('are dropped when someone else signs in, never sent as theirs', async () => {
    const a = look('a');
    const { result } = renderHook(() => useFeedTracking('session-1', 'home', [a], jest.fn()));
    act(() => result.current.onViewableItemsChanged(shown(a, 0) as never));
    act(() => useAuthStore.setState({ user: { id: 'someone-else' } as never }));
    await act(() => sendFeedEvents());
    expect(post).not.toHaveBeenCalled();
  });

  it('keep waiting after a network failure, and drop a batch the server refuses', async () => {
    const a = look('a');
    const { result } = renderHook(() => useFeedTracking('session-1', 'home', [a], jest.fn()));
    act(() => result.current.onViewableItemsChanged(shown(a, 0) as never));
    post.mockRejectedValueOnce(new Error('offline'));
    await act(() => sendFeedEvents());
    post.mockRejectedValueOnce({ response: { status: 400 } });
    await act(() => sendFeedEvents());
    await act(() => sendFeedEvents());
    expect(post).toHaveBeenCalledTimes(2);
  });
});
