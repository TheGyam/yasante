import { fireEvent, renderWithTheme } from '@/test-utils';
import { ListFooter } from '../ListFooter';
import { LoadError } from '../LoadError';

const offline = { request: {}, code: 'ERR_NETWORK' };
const ours = { request: {}, response: { status: 503, data: {} } };
const said = { request: {}, response: { status: 403, data: { message: 'Sign in to see this.' } } };

describe('a load that failed', () => {
  it('says what didn’t load and why, in plain words, and tries again', () => {
    const retry = jest.fn();
    const { getByText } = renderWithTheme(
      <LoadError what="your bookings" error={offline} onRetry={retry} />
    );
    expect(getByText('Couldn’t load your bookings')).toBeTruthy();
    expect(getByText('You seem to be offline. Check your connection and try again.')).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });

  it('blames our side, not her connection, when the server failed', () => {
    const { getByText, queryByText } = renderWithTheme(
      <LoadError what="looks" error={ours} onRetry={() => {}} />
    );
    expect(
      getByText('Something went wrong on our side. Please try again in a moment.')
    ).toBeTruthy();
    expect(queryByText(/offline/)).toBeNull();
  });

  it('passes on the server’s own sentence when it wrote one for people', () => {
    const { getByText } = renderWithTheme(
      <LoadError what="looks" error={said} onRetry={() => {}} />
    );
    expect(getByText('Sign in to see this.')).toBeTruthy();
  });

  it('ends a list that couldn’t load more with a way to ask again', () => {
    const retry = jest.fn();
    const { getByText } = renderWithTheme(<ListFooter more error={offline} onRetry={retry} />);
    expect(getByText('Couldn’t load more. You seem to be offline.')).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });
});
