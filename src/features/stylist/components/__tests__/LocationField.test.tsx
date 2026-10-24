import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, renderWithTheme, waitFor } from '@/test-utils';
import { apiClient } from '@/shared/lib/api/client';
import { LocationField } from '../LocationField';

jest.mock('@/shared/lib/api/client', () => ({ apiClient: { get: jest.fn() } }));
const get = apiClient.get as jest.Mock;

// What our server answers for a postcode (it asks postcodes.io, so the phone never does).
const PECKHAM = ['Peckham', 'Rye Lane', 'Southwark'];

function setup(props: Partial<React.ComponentProps<typeof LocationField>> = {}) {
  const onChange = jest.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = renderWithTheme(
    <QueryClientProvider client={client}>
      <LocationField baseArea="" needsStreet onChange={onChange} {...props} />
    </QueryClientProvider>
  );
  return { ...screen, onChange };
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: PECKHAM });
});

it('offers the names a postcode is known by and picks the first', async () => {
  const { getByTestId, getByText, onChange } = setup();
  fireEvent.changeText(getByTestId('setup-postcode'), 'se154qj');
  await waitFor(() => expect(getByText('Rye Lane')).toBeTruthy());
  expect(getByText('Southwark')).toBeTruthy();
  expect(onChange).toHaveBeenCalledWith({ baseArea: 'Peckham' });
  fireEvent.press(getByText('Southwark'));
  expect(onChange).toHaveBeenLastCalledWith({ baseArea: 'Southwark' });
});

it('keeps the street and postcode together as the private address', () => {
  const { getByTestId, onChange } = setup({ address: '12 Bellenden Road, SE15 4QJ' });
  expect(getByTestId('setup-postcode').props.value).toBe('SE15 4QJ');
  fireEvent.changeText(getByTestId('setup-street'), '14 Bellenden Road');
  expect(onChange).toHaveBeenLastCalledWith({ address: '14 Bellenden Road, SE15 4QJ' });
});

it('lets them type the area when the postcode is unknown', async () => {
  get.mockRejectedValue(
    Object.assign(new Error('Not found'), { isAxiosError: true, response: { status: 404 } })
  );
  const { getByTestId, findByTestId } = setup();
  fireEvent.changeText(getByTestId('setup-postcode'), 'ZZ1 1ZZ');
  expect(await findByTestId('setup-area')).toBeTruthy();
});
