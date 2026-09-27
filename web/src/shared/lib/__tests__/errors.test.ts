import { ApiError } from '../api/client';
import { errorMessage, isNotFound } from '../errors';

const FALLBACK = 'We couldn’t load this page.';

describe('errorMessage', () => {
  it('passes on a sentence the server wrote for people', () => {
    expect(
      errorMessage(new ApiError(400, { message: 'That email doesn’t look right' }), FALLBACK)
    ).toBe('That email doesn’t look right');
  });

  it('never shows codes, field names or raw data', () => {
    expect(errorMessage(new ApiError(400, { message: 'invalid_email' }), FALLBACK)).toBe(FALLBACK);
    expect(errorMessage(new ApiError(400, { detail: '{"email": ["bad"]}' }), FALLBACK)).toBe(
      FALLBACK
    );
    expect(errorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
  });

  it('says when it’s us, the connection, or a slow answer', () => {
    expect(errorMessage(new ApiError(502, undefined), FALLBACK)).toMatch(/our side/);
    expect(errorMessage(new TypeError('Failed to fetch'), FALLBACK)).toMatch(/offline/);
    expect(errorMessage(new DOMException('', 'TimeoutError'), FALLBACK)).toMatch(/too long/);
  });

  it('tells a missing page from a failed one', () => {
    expect(isNotFound(new ApiError(404, undefined))).toBe(true);
    expect(isNotFound(new ApiError(500, undefined))).toBe(false);
  });
});
