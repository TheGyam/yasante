import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { staffRoutes } from '@/staff/routes';
import { TimeChart } from '@/features/staff/components/charts/TimeChart';
import { mockApi } from '../render';

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

function renderStaff(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={createMemoryRouter(staffRoutes, { initialEntries: [path] })} />
    </QueryClientProvider>
  );
}

const overview = {
  user: { name: 'Staff Member', superuser: true },
  csrfToken: 'staff-csrf',
  models: [
    {
      key: 'accounts.user',
      name: 'People',
      singular: 'person',
      group: 'People',
      icon: 'Users',
      description: 'Accounts',
      order: 0,
      url: '/records/accounts/user',
      addUrl: null,
      canView: true,
    },
  ],
  metrics: [],
  queues: [
    {
      key: 'products',
      model: 'shelf.product',
      label: 'Products to approve',
      hint: '',
      count: 1,
      url: '/review/products',
    },
  ],
  status: { products: 1 },
  totalOpen: 1,
  needs: [],
  errors: { open: 0, new: 0 },
  audit: [],
  trend: { dates: [], series: [] },
  generatedAt: '2026-09-30T10:00:00Z',
};

const queue = {
  name: 'Products to approve',
  key: 'shelf.product',
  next: null,
  actions: [
    { key: 'approve', label: 'Approve', shortcut: 'a', reversible: true },
    { key: 'reject', label: 'Reject', shortcut: 'x', reversible: true },
  ],
  items: [
    {
      id: 'p1',
      title: 'Rosemary oil',
      at: '2026-09-30T09:00:00Z',
      facts: ['Mielle'],
      text: '',
      images: [],
      url: '/records/shelf/product/p1',
    },
  ],
};

const session = {
  '/data/session/': { authenticated: true, phase: 'password', csrfToken: 'staff-csrf' },
};

it('decides with one key, then undoes from the toast', async () => {
  const user = userEvent.setup();
  const calls = mockApi({
    ...session,
    '/data/overview/': overview,
    '/data/review/products/': queue,
    'POST /data/review/products/p1/decide/': { done: true, label: 'Approve', undo: 'undo-token' },
    'POST /data/undo/': { done: true },
  });
  renderStaff('/review/products');
  await screen.findByRole('heading', { name: 'Rosemary oil' });
  await user.keyboard('a');
  expect(await screen.findByText('Approved · Rosemary oil')).toBeInTheDocument();
  const decide = calls.find(call => call.url.endsWith('/decide/'))!;
  expect((decide.body as FormData).get('action')).toBe('approve');
  expect(decide.csrf).toBe('staff-csrf');
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(await screen.findByText('Undone')).toBeInTheDocument();
  expect((calls.find(call => call.url === '/data/undo/')!.body as FormData).get('token')).toBe(
    'undo-token'
  );
});

it('ignores shortcuts while someone is typing', async () => {
  const user = userEvent.setup();
  const calls = mockApi({
    ...session,
    '/data/overview/': overview,
    '/data/review/products/': queue,
  });
  renderStaff('/review/products');
  await user.type(await screen.findByRole('textbox', { name: /Note for the log/ }), 'a quick note');
  expect(calls.some(call => call.method === 'POST')).toBe(false);
});

it('finds records from the command palette, grouped, with the keyboard', async () => {
  const user = userEvent.setup();
  mockApi({
    ...session,
    '/data/overview/': overview,
    '/data/search/': {
      groups: [
        {
          name: 'People',
          items: [
            {
              name: 'Ama Mensah',
              subtitle: 'People',
              url: '/records/accounts/user/1',
              icon: 'Users',
            },
            {
              name: 'Ama Owusu',
              subtitle: 'People',
              url: '/records/accounts/user/2',
              icon: 'Users',
            },
          ],
        },
      ],
    },
  });
  renderStaff('/');
  await screen.findByText(/Good (morning|afternoon|evening)/);
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  const dialog = await screen.findByRole('dialog', { name: 'Search everything' });
  await user.type(within(dialog).getByRole('combobox', { name: 'Search' }), 'ama');
  const group = await within(dialog).findByRole('group', { name: 'People' });
  expect(within(group).getByRole('option', { name: /Ama Mensah/ })).toBeInTheDocument();
  const options = within(dialog).getAllByRole('option');
  expect(options[0]).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{ArrowDown}');
  expect(within(dialog).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
});

it('moves through a chart with the arrow keys and says the exact numbers', async () => {
  render(
    <TimeChart
      labels={['2026-09-28', '2026-09-29', '2026-09-30']}
      series={[{ name: 'Bookings', values: [3, 5, 8] }]}
      label="Bookings per day"
    />
  );
  const chart = screen.getByRole('img', { name: 'Bookings per day' });
  fireEvent.focus(chart);
  expect(screen.getByRole('status')).toHaveTextContent('30 Sept');
  expect(screen.getByRole('status')).toHaveTextContent('8');
  fireEvent.keyDown(chart, { key: 'ArrowLeft' });
  expect(screen.getByRole('status')).toHaveTextContent('29 Sept');
  expect(screen.getByRole('status')).toHaveTextContent('5');
});
