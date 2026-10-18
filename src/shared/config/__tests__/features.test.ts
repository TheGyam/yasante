import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { apiClient } from '@/shared/lib/api/client';
import { useFeature } from '../features';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { get: jest.fn() } }));
const get = apiClient.get as jest.Mock;

function setup(key: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useFeature(key as never), {
    wrapper: ({ children }) => React.createElement(QueryClientProvider, { client }, children),
  });
}

beforeEach(() => get.mockReset());

describe('useFeature', () => {
  it('is false before the answer has loaded', () => {
    get.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = setup('multi_photo_looks');
    expect(result.current).toBe(false);
    unmount();
  });

  it('is true once the server says the switch is on', async () => {
    get.mockResolvedValue({ data: { features: { multi_photo_looks: true } } });
    const { result } = setup('multi_photo_looks');
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false for a switch the server says is off', async () => {
    get.mockResolvedValue({ data: { features: { multi_photo_looks: false } } });
    const { result } = setup('multi_photo_looks');
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is false for a key the server never mentioned', async () => {
    get.mockResolvedValue({ data: { features: { multi_photo_looks: true } } });
    const { result } = setup('video_posts');
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('fails closed on a server error', async () => {
    get.mockRejectedValue(new Error('offline'));
    const { result } = setup('multi_photo_looks');
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('stays true when a later refetch fails', async () => {
    get.mockResolvedValue({ data: { features: { multi_photo_looks: true } } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFeature('multi_photo_looks'), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client }, children),
    });
    await waitFor(() => expect(result.current).toBe(true));

    get.mockRejectedValue(new Error('offline'));
    await client.refetchQueries({ queryKey: ['features'] });

    expect(result.current).toBe(true);
  });
});
