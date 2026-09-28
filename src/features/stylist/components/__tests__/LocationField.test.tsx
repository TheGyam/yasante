import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, renderWithTheme, waitFor } from '@/test-utils';
import { LocationField } from '../LocationField';

const PECKHAM = {
  result: {
    parliamentary_constituency: 'Peckham',
    admin_ward: 'Rye Lane',
    admin_district: 'Southwark',
  },
};

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
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => PECKHAM,
  })) as never;
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
  global.fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })) as never;
  const { getByTestId, findByTestId } = setup();
  fireEvent.changeText(getByTestId('setup-postcode'), 'ZZ1 1ZZ');
  expect(await findByTestId('setup-area')).toBeTruthy();
});
