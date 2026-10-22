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
