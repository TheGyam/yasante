import axios from 'axios';
import { authApi } from '../api';

it('sends a refresh token once, however many callers ask at the same time', async () => {
  const post = jest.fn(() =>
    Promise.resolve({ data: { accessToken: 'new', refreshToken: 'next', expiresAt: 1 } })
  );
  jest.spyOn(axios, 'create').mockReturnValue({ post } as never);
  // Start-up's check and a 401 retry, together: the second must not spend the token again.
  const [a, b] = await Promise.all([authApi.refreshToken('once'), authApi.refreshToken('once')]);
  expect(post).toHaveBeenCalledTimes(1);
  expect(a.data.accessToken).toBe('new');
  expect(b).toBe(a);
  // Once answered, a new token refreshes afresh.
  await authApi.refreshToken('next');
  expect(post).toHaveBeenCalledTimes(2);
});
