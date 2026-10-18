import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi } from '../render';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { staffRoutes } from '@/staff/routes';
function renderStaff(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={createMemoryRouter(staffRoutes, { initialEntries: [path] })} />
    </QueryClientProvider>
  );
}
const mockStaff = (table: Parameters<typeof mockApi>[0]) =>
  mockApi({
    '/data/session/': { authenticated: true, phase: 'password', csrfToken: 'staff-csrf' },
    ...table,
  });

const overview = {
  user: { name: 'Staff Member', superuser: false },
  csrfToken: 'staff-csrf',
  models: [
    {
      key: 'accounts.user',
      name: 'People',
      singular: 'person',
      group: 'People',
      icon: 'Users',
      description: 'Accounts in your community',
      order: 0,
      url: '/records/accounts/user',
      addUrl: null,
      canView: true,
    },
  ],
  metrics: [
    {
      label: 'New people',
      value: 27,
      previous: 20,
      change: 35,
      values: [1, 2, 3],
      hint: 'This week',
      url: '/records/accounts/user',
    },
  ],
  queues: [],
  status: {},
  totalOpen: 0,
  needs: [],
  errors: { open: 0, new: 0 },
  audit: [],
  trend: { dates: [], series: [] },
  generatedAt: '2026-09-30T10:00:00Z',
};
const records = {
  name: 'People',
  description: 'Accounts in your community',
  singular: 'person',
  views: [],
  columns: [{ key: 'name', label: 'Name', sort: 1, direction: null }],
  rows: [
    {
      id: 'person-1',
      values: ['Ama'],
      cells: [{ kind: 'text', value: 'Ama' }],
      url: '/records/accounts/user/person-1',
    },
  ],
  count: 27,
  page: 1,
  pages: 2,
  searchable: true,
  filters: [],
  actions: [{ key: 'delete_selected', label: 'Delete selected users' }],
  addUrl: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

it('keeps unsaved edits until the staff member confirms discarding them', async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  const user = userEvent.setup();
  mockStaff({
    '/data/overview/': overview,
    '/data/records/accounts/user/': records,
    '/data/forms/accounts/user/person-1/': {
      name: 'People',
      singular: 'person',
      title: 'Ama',
      object: 'Ama',
      id: 'person-1',
      revision: 'one',
      editable: true,
      canDelete: false,
      canSaveAs: false,
      password: false,
      errors: [],
      prepopulated: {},
      inlines: [],
      sections: [
        {
          name: 'Details',
          description: '',
          fields: [{ name: 'name', label: 'Name', kind: 'text', value: 'Ama', errors: [] }],
        },
      ],
    },
  });
  renderStaff('/records/accounts/user/person-1');
  await user.click(await screen.findByRole('button', { name: /^Edit/ }));
  await user.type(await screen.findByRole('textbox', { name: 'Name' }), ' Draft');
  const back = () => screen.getAllByRole('link', { name: /People/ })[0];
  await user.click(back());
  const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
  await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ama Draft');
  await user.click(back());
  await user.click(
    within(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole(
      'button',
      { name: 'Discard changes' }
    )
  );
  expect(await screen.findByText('Ama')).toBeInTheDocument();
});

it('gates staff data until the second factor is verified', async () => {
  const user = userEvent.setup();
  let verified = false;
  const calls = mockStaff({
    '/data/session/': () => ({
      authenticated: verified,
      phase: 'verify',
      csrfToken: 'factor-csrf',
    }),
    '/data/two-factor/': { phase: 'verify' },
    'POST /data/two-factor/': () => {
      verified = true;
      return { verified: true, recoveryCodes: [] };
    },
    '/data/overview/': overview,
  });
  renderStaff('/');
  await user.type(
    await screen.findByRole('textbox', { name: 'Authenticator or recovery code' }),
    '123456'
  );
  expect(calls.some(call => call.url === '/data/overview/')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Verify code' }));
  expect(await screen.findByText('27')).toBeInTheDocument();
  expect(calls.find(call => call.method === 'POST')?.csrf).toBe('factor-csrf');
});

it('shows enrollment and recovery codes once before opening the workspace', async () => {
  const user = userEvent.setup();
  let verified = false;
  mockStaff({
    '/data/session/': () => ({
      authenticated: verified,
      phase: 'enroll',
      csrfToken: 'factor-csrf',
    }),
    '/data/two-factor/': { phase: 'enroll', secret: 'ABCD EFGH', uri: 'otpauth://totp/Yasante' },
    'POST /data/two-factor/': () => {
      verified = true;
      return { verified: true, recoveryCodes: ['once-only-code'] };
    },
    '/data/overview/': overview,
  });
  renderStaff('/');
  expect(await screen.findByText('ABCD EFGH')).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'First six-digit code' }), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify code' }));
  expect(await screen.findByText('once-only-code')).toBeInTheDocument();
  expect(screen.queryByText('27')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'I saved my codes' }));
  expect(await screen.findByText('27')).toBeInTheDocument();
  expect(screen.queryByText('once-only-code')).not.toBeInTheDocument();
});

it('requires staff authentication and does not expose the workspace on failure', async () => {
  mockStaff({
    '/data/overview/': { status: 401, body: { message: 'Staff sign-in required.' } },
    '/data/session/': { authenticated: false, phase: 'password', csrfToken: 'login-csrf' },
  });
  renderStaff('/');
  expect(
    await screen.findByText('Sign in with your Yasante staff account.', {}, { timeout: 5000 })
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Workspace' })).not.toBeInTheDocument();
});

it('shows real counts and only the tools returned for the staff member', async () => {
  mockStaff({ '/data/overview/': overview });
  renderStaff('/');
  expect(await screen.findByText('27')).toBeInTheDocument();
  const nav = screen.getAllByRole('navigation', { name: 'Workspace' })[0];
  expect(within(nav).getByRole('link', { name: 'People' })).toBeInTheDocument();
  expect(within(nav).queryByRole('link', { name: 'Bookings' })).not.toBeInTheDocument();
  expect(within(nav).queryByRole('link', { name: 'Business metrics' })).not.toBeInTheDocument();
  expect(screen.getByText(/Nothing is waiting for you/)).toBeInTheDocument();
});

it('searches on the server, paginates, and clears selections when the query changes', async () => {
  const user = userEvent.setup();
  const calls = mockStaff({
    '/data/overview/': overview,
    '/data/records/accounts/user/': records,
  });
  renderStaff('/records/accounts/user');
  await user.click(await screen.findByRole('checkbox', { name: 'Select Ama' }));
  expect(screen.getByText('1 selected')).toBeInTheDocument();
  await user.type(screen.getByRole('searchbox'), 'Ama{Enter}');
  await screen.findByText('Ama');
  expect(calls.some(call => call.url.includes('q=Ama'))).toBe(true);
  expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Ama');
  expect(calls.some(call => call.url.includes('p=2'))).toBe(true);
});

it('reviews bulk actions and submits the selected ids with CSRF without leaving React', async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  const user = userEvent.setup();
  const calls = mockStaff({
    '/data/overview/': overview,
    '/data/records/accounts/user/': records,
    'POST /data/actions/accounts/user/': (call: { body?: unknown }) =>
      (call.body as FormData).get('confirm') === 'yes'
        ? { done: true, count: 1, messages: [] }
        : { token: 'review-token', count: 1, label: 'Delete selected users', deletion: null },
  });
  renderStaff('/records/accounts/user');
  await user.click(await screen.findByRole('checkbox', { name: 'Select Ama' }));
  // jsdom doesn't open popovers from their buttons; the item is there, just not shown.
  await user.click(screen.getByRole('menuitem', { name: 'Delete selected users', hidden: true }));
  const dialog = await screen.findByRole('dialog', { name: 'Review your action' });
  const preview = calls.find(call => call.method === 'POST')!;
  expect(preview.csrf).toBe('staff-csrf');
  expect((preview.body as FormData).getAll('ids')).toEqual(['person-1']);
  expect((preview.body as FormData).get('confirm')).toBeNull();
  await user.click(within(dialog).getByRole('button', { name: 'Apply action' }));
  expect(await screen.findByText('Done for 1 records.')).toBeInTheDocument();
  expect(
    calls.some(call => call.method === 'POST' && (call.body as FormData).get('confirm') === 'yes')
  ).toBe(true);
});

it('edits and saves a record entirely inside the workspace', async () => {
  const user = userEvent.setup();
  const schema = {
    name: 'People',
    singular: 'person',
    title: 'Ama',
    object: 'Ama',
    id: 'person-1',
    revision: 'version-1',
    editable: true,
    canDelete: false,
    canSaveAs: false,
    password: false,
    errors: [],
    prepopulated: {},
    inlines: [],
    sections: [
      {
        name: 'Details',
        description: '',
        fields: [
          { name: 'name', label: 'Name', kind: 'text', value: 'Ama', errors: [], required: true },
        ],
      },
    ],
  };
  const calls = mockStaff({
    '/data/overview/': overview,
    '/data/records/accounts/user/': records,
    '/data/forms/accounts/user/person-1/': schema,
    'POST /data/forms/accounts/user/person-1/': {
      saved: true,
      id: 'person-1',
      url: '/records/accounts/user/person-1',
    },
  });
  renderStaff('/records/accounts/user/person-1');
  await user.click(await screen.findByRole('button', { name: /^Edit/ }));
  const input = await screen.findByRole('textbox', { name: 'Name' });
  await user.clear(input);
  await user.type(input, 'Ama Updated');
  await user.click(screen.getByRole('button', { name: /^Save/ }));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  const save = calls.find(call => call.method === 'POST')!;
  expect((save.body as FormData).get('name')).toBe('Ama Updated');
  expect((save.body as FormData).get('_revision')).toBe('version-1');
  expect(save.csrf).toBe('staff-csrf');
  expect(document.querySelector('a[href^="/admin"]')).toBeNull();
});

it('signs in and signs out inside React and clears private content', async () => {
  const user = userEvent.setup();
  let authenticated = false;
  mockStaff({
    '/data/overview/': () =>
      authenticated ? overview : { status: 401, body: { message: 'Sign in' } },
    '/data/session/': () => ({ authenticated, phase: 'password', csrfToken: 'login-csrf' }),
    'POST /data/session/': (call: { body?: unknown }) => {
      authenticated = (call.body as FormData).get('intent') !== 'logout';
      return { authenticated, phase: 'password', csrfToken: 'rotated-csrf' };
    },
  });
  renderStaff('/');
  await user.type(await screen.findByRole('textbox', { name: 'Email' }), 'staff@test.dev');
  await user.type(screen.getByLabelText('Password'), 'secret-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('27')).toBeInTheDocument();
  await user.click(screen.getAllByRole('menuitem', { name: 'Sign out', hidden: true })[0]);
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Workspace' })).not.toBeInTheDocument();
});

it('shows every photo of a reported look at once', async () => {
  mockStaff({
    '/data/overview/': {
      ...overview,
      queues: [
        { key: 'reports', model: 'moderation.report', label: 'Reports', hint: '', count: 1, url: '/review/reports' },
      ],
    },
    '/data/review/reports/': {
      name: 'Reports',
      key: 'reports',
      items: [
        {
          id: 'report-1',
          title: 'Reported look',
          at: '2026-10-01T00:00:00Z',
          facts: [],
          text: '',
          images: [
            'https://x/1.jpg',
            'https://x/2.jpg',
            'https://x/3.jpg',
            'https://x/4.jpg',
            'https://x/5.jpg',
          ],
          url: '/records/looks/look-1',
        },
      ],
      next: null,
      actions: [{ key: 'dismiss', label: 'Dismiss', shortcut: 'd', reversible: true }],
    },
  });
  renderStaff('/review/reports');
  const heading = await screen.findByRole('heading', { name: 'Reported look' });
  const article = heading.closest('article')!;
  expect(article.querySelectorAll('img')).toHaveLength(5);
});
