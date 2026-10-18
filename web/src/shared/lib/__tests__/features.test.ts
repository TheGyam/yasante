import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '../queryClient';
import { useFeature } from '../features';

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

function mockFeatures(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    )
  );
}

function renderFeature(key: 'multi_photo_looks' | 'video_posts') {
  const client = makeQueryClient();
  return renderHook(() => useFeature(key), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  });
}

describe('useFeature', () => {
  it('is false before the switches have loaded', () => {
    mockFeatures({ features: { multi_photo_looks: true } });
    const { result } = renderFeature('multi_photo_looks');
    expect(result.current).toBe(false);
  });

  it('is true once the server says a switch is on', async () => {
    mockFeatures({ features: { multi_photo_looks: true } });
    const { result } = renderFeature('multi_photo_looks');
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false for a key the server did not send', async () => {
    mockFeatures({ features: { multi_photo_looks: true } });
    const { result } = renderFeature('video_posts');
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is false on an error', async () => {
    mockFeatures({ message: 'nope' }, 400);
    const { result } = renderFeature('multi_photo_looks');
    await waitFor(() => expect(result.current).toBe(false));
  });
});
