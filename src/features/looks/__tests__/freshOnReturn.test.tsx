import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFreshFeedOnReturn } from '../hooks';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: null }),
  useAuthStore: jest.requireActual('zustand').create(() => ({ user: null })),
}));

let listener: (state: AppStateStatus) => void = () => {};

const MINUTE = 60 * 1000;

function setup() {
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_, handler) => ((listener = handler), { remove: jest.fn() }) as never);
  const client = new QueryClient();
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue();
  const toTop = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  renderHook(() => useFreshFeedOnReturn(toTop), { wrapper });
  return { refetch, toTop };
}

async function away(minutes: number) {
  const now = Date.now();
  await act(async () => {
    listener('background');
    jest.spyOn(Date, 'now').mockReturnValue(now + minutes * MINUTE);
    listener('active');
  });
}

afterEach(() => jest.restoreAllMocks());

describe('coming back to the feed', () => {
  it('leaves it as she left it after a quick trip away', async () => {
    const { refetch, toTop } = setup();
    await away(5);
    expect(toTop).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('starts again from the top after half an hour away', async () => {
    const { refetch, toTop } = setup();
    await away(31);
    expect(toTop).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
