import type { AxiosAdapter } from 'axios';
import { apiClient, setAuthBridge } from '../client';

const unauthorized: AxiosAdapter = config =>
  Promise.reject(
    Object.assign(new Error('401'), {
      isAxiosError: true,
      config,
      response: { status: 401, data: {}, headers: {}, config, statusText: '401' },
    })
  );

it('settles every request when a 401 arrives with no refresh token', async () => {
  const logout = jest.fn();
  setAuthBridge({
    ready: () => Promise.resolve(),
    getAccessToken: () => 'expired',
    getRefreshToken: () => undefined,
    getUserId: () => undefined,
    setTokens: jest.fn(),
    refresh: jest.fn(),
    logout,
  });
  const get = () => apiClient.get('/api/anything/', { adapter: unauthorized });
  // Several at once, as on app start: none may be left hanging.
  await expect(Promise.all([get(), get(), get()])).rejects.toBeTruthy();
  const settled = await Promise.race([
    get().then(
      () => 'settled',
      () => 'settled'
    ),
    new Promise(resolve => setTimeout(() => resolve('hung'), 500)),
  ]);
  expect(settled).toBe('settled');
  expect(logout).toHaveBeenCalled();
});

it('waits for saved tokens before sending the first request', async () => {
  let token: string | undefined;
  let loaded!: () => void;
  const ready = new Promise<void>(resolve => (loaded = resolve));
  setAuthBridge({
    ready: () => ready,
    getAccessToken: () => token,
    getRefreshToken: () => undefined,
    getUserId: () => undefined,
    setTokens: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  });
  const request = apiClient.get('/api/me/', {
    adapter: async config => ({
      data: config.headers.Authorization,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  });
  token = 'saved';
  loaded();
  expect((await request).data).toBe('Bearer saved');
});

const echo: AxiosAdapter = async config => ({
  data: config.headers.Authorization,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

it('renews a run-out token once before sending, however many requests start at once', async () => {
  let tokens = { access: 'old', refresh: 'r1', expiresAt: Date.now() - 1000 };
  const refresh = jest.fn(async () => ({
    accessToken: 'new',
    refreshToken: 'r2',
    expiresAt: Date.now() + 60_000,
  }));
  setAuthBridge({
    ready: () => Promise.resolve(),
    getAccessToken: () => tokens.access,
    getRefreshToken: () => tokens.refresh,
    getExpiresAt: () => tokens.expiresAt,
    getUserId: () => undefined,
    setTokens: t =>
      (tokens = { access: t.accessToken, refresh: t.refreshToken!, expiresAt: t.expiresAt }),
    // Shared while in flight, as the auth feature's refresh is.
    refresh: (() => {
      let inFlight: ReturnType<typeof refresh> | undefined;
      return () => (inFlight ??= refresh());
    })(),
    logout: jest.fn(),
  });
  const answers = await Promise.all(
    [1, 2, 3].map(() => apiClient.get('/api/me/', { adapter: echo }))
  );
  expect(answers.map(a => a.data)).toEqual(['Bearer new', 'Bearer new', 'Bearer new']);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('sends again with the new token when a request went out with one since renewed', async () => {
  let current = 'old';
  const refresh = jest.fn();
  setAuthBridge({
    ready: () => Promise.resolve(),
    getAccessToken: () => current,
    getRefreshToken: () => 'r',
    getUserId: () => undefined,
    setTokens: jest.fn(),
    refresh,
    logout: jest.fn(),
  });
  let first = true;
  const answer = await apiClient.get('/api/me/', {
    adapter: config => {
      if (first) {
        first = false;
        current = 'renewed elsewhere';
        return unauthorized(config);
      }
      return echo(config);
    },
  });
  expect(answer.data).toBe('Bearer renewed elsewhere');
  expect(refresh).not.toHaveBeenCalled();
});
