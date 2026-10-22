import axios from 'axios';
import { defineMocks, installMocks, matchRoute } from '../mock';

describe('mock routes', () => {
  defineMocks({
    'GET /api/stylists/me/': () => 'me',
    'GET /api/stylists/:id/': () => 'one',
    'PATCH /api/bookings/:id/status/': () => 'status',
  });

  it('prefers the route defined first, so static paths beat params', () => {
    expect(matchRoute('get', '/api/stylists/me/')?.route.handler({} as never)).toBe('me');
    expect(matchRoute('get', '/api/stylists/abc/')?.params).toEqual({ id: 'abc' });
  });

  it('matches method, optional trailing slash and query strings', () => {
    expect(matchRoute('patch', '/api/bookings/42/status?x=1')?.query.get('x')).toBe('1');
    expect(matchRoute('post', '/api/bookings/42/status/')).toBeNull();
    expect(matchRoute('get', '/api/unknown/')).toBeNull();
  });
});

describe('a mock session', () => {
  it('never sends its token to a real server, even one added by an earlier interceptor', async () => {
    const network = jest.fn();
    const client = axios.create({ adapter: network });
    // Added first, so axios runs it after the mocks' own interceptor, as in the app.
    client.interceptors.request.use(config => {
      config.headers.Authorization = 'Bearer mock.acc_client';
      return config;
    });
    installMocks(client);
    await expect(client.get('/api/not-mocked/')).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect(network).not.toHaveBeenCalled();
  });
});
