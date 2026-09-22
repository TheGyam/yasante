import { guestRedirect } from '../accountGate';

it('sends guests to sign up for anything that needs an account', () => {
  for (const href of [
    '/book/ama?service=1',
    '/waitlist/ama',
    '/looks/new',
    '/looks/options?kind=look&id=1',
    '/collections/save?kind=look&refId=1',
    '/requests/123',
    '/review/report?id=1',
    { pathname: '/bookings/[id]', params: { id: '1' } },
  ]) {
    expect(guestRedirect(href)).toBe('/auth/join');
  }
});

it('lets guests look around', () => {
  for (const href of [
    '/home',
    '/looks/abc',
    '/stylist/ama',
    '/search',
    '/content/1',
    '/hair-profile',
    '/auth/join',
  ]) {
    expect(guestRedirect(href)).toBeUndefined();
  }
});
