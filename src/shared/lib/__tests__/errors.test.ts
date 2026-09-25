import { errorMessage } from '../errors';

const FALLBACK = 'We couldn’t sign you in.';
const failed = (status: number, data?: object) => ({ request: {}, response: { status, data } });

describe('what people read when something fails', () => {
  it('passes on a sentence the server wrote for people', () => {
    expect(
      errorMessage(failed(400, { message: 'That email or password isn’t right.' }), FALLBACK)
    ).toBe('That email or password isn’t right.');
  });

  it('never shows codes, raw data or developer text', () => {
    for (const message of [
      'Request failed with status code 401',
      'token_not_valid',
      '{"detail": "x"}',
      'TypeError: undefined is not an object',
      '500 Internal Server Error',
    ]) {
      expect(errorMessage(failed(400, { message }), FALLBACK)).toBe(FALLBACK);
    }
    // A thrown Error's own text is for developers too.
    expect(errorMessage(new Error('Invalid login response format'), FALLBACK)).toBe(FALLBACK);
  });

  it('says what kind of trouble it is when there is no answer to pass on', () => {
    expect(errorMessage({ request: {} }, FALLBACK)).toMatch(/offline/);
    expect(errorMessage({ request: {}, code: 'ECONNABORTED' }, FALLBACK)).toMatch(/too long/);
    expect(errorMessage(failed(502, { message: 'Bad gateway' }), FALLBACK)).toMatch(/our side/);
  });
});
