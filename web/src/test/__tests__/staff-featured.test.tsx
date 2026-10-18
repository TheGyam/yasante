import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { staffRoutes } from '@/staff/routes';
import { Featured } from '@/features/staff';
import { mockApi } from '../render';

const overview = {
  user: { name: 'Akua', superuser: true },
  csrfToken: 'staff-csrf',
  models: [
    {
      key: 'stylists.featuredpage',
      name: 'Featured stylists',
      singular: 'stylist',
      group: 'People',
      icon: 'Users',
      description: '',
      order: 1,
      url: '/records/stylists/featuredpage',
      addUrl: null,
      canView: true,
    },
  ],
  metrics: [],
  queues: [],
  totalOpen: 0,
  needs: [],
  errors: { open: 0, new: 0 },
  audit: [],
  trend: { dates: [], series: [] },
  generatedAt: '2026-10-18T10:00:00Z',
};
const page = {
  id: 'ama',
  display_name: 'Ama',
  handle: 'ama.braids',
  instagram_handle: 'ama.braids',
  avatar_uri: '',
  base_area: 'Peckham',
  bio: 'Braids in Peckham',
  live: false,
  agreed: false,
  agreed_at: null as string | null,
  look_count: 0,
  waiting: 0,
  link_expires_at: null as string | null,
  claimed_at: null as string | null,
  agreed_note: '',
  looks: [] as {
    id: string;
    photos: { uri: string; thumb_uri: string }[];
    styles: string[];
    hair_texture: string;
    caption: string;
  }[],
};
const look = {
  id: 'look-1',
  photos: [{ uri: '/media/braid.jpg', thumb_uri: '/media/thumb.jpg' }],
  styles: ['knotless'],
  hair_texture: 'coily',
  caption: 'Braids',
};
const yes = {
  agreed: true,
  agreed_at: '2026-10-18T10:00:00Z',
  agreed_note: 'Said yes to Akua on Instagram',
};
const styles = {
  columns: [{ key: 'name' }, { key: 'slug' }],
  rows: [
    { id: 'one', values: ['Knotless braids', 'knotless'] },
    { id: 'two', values: ['Cornrows', 'cornrows'] },
  ],
  count: 2,
  page: 1,
  pages: 1,
};
const listing = (items = [page]) => ({ items, count: items.length, page: 1, pages: 1 });
const setup = (table: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({
    '/data/session/': { authenticated: true, csrfToken: 'staff-csrf' },
    '/data/overview/': overview,
    '/data/featured/': listing(),
    '/data/featured/ama/': page,
    '/data/records/looks/style/': styles,
    ...table,
  });
function renderStaff(path = '/featured') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const router = createMemoryRouter(staffRoutes, { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { ...view, client, router };
}
const photo = (name: string) => new File(['photo'], name, { type: 'image/jpeg' });
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

it('opens Featured stylists from People and filters the list with the five next steps', async () => {
  const user = userEvent.setup();
  const items = [
    page,
    { ...page, id: 'waiting', display_name: 'Efua', look_count: 1 },
    { ...page, ...yes, id: 'ready', display_name: 'Akosua', look_count: 1 },
    { ...page, ...yes, id: 'live', display_name: 'Abena', look_count: 1, live: true, waiting: 14 },
    { ...page, id: 'claimed', display_name: 'Esi', claimed_at: '2026-10-18T10:00:00Z' },
  ];
  setup({ '/data/featured/': listing(items) });
  renderStaff();
  await screen.findByRole('link', { name: 'Add a featured stylist' }, { timeout: 5000 });
  expect(await screen.findByText('Needs photos')).toBeInTheDocument();
  expect(screen.getByText('Waiting for their yes')).toBeInTheDocument();
  expect(screen.getByText('Ready to go live')).toBeInTheDocument();
  expect(screen.getByText('Live · 14 on the waitlist')).toBeInTheDocument();
  expect(screen.getByText('Claimed 18 Oct')).toBeInTheDocument();
  const nav = screen.getByRole('link', { name: 'Featured stylists' });
  expect(nav).toHaveAttribute('href', '/featured');
  expect(nav.parentElement).toHaveTextContent('People');
  expect(screen.queryByText('Filters the current page.')).not.toBeInTheDocument();
  await user.type(screen.getByRole('searchbox', { name: 'Search by name or handle' }), 'Efua');
  expect(screen.getByText('Efua')).toBeInTheDocument();
  expect(screen.queryByText('Akosua')).not.toBeInTheDocument();
});

it('shows the real empty state and an obvious next step', async () => {
  setup({ '/data/featured/': listing([]) });
  renderStaff();
  expect(await screen.findByText('No featured stylists yet.')).toBeInTheDocument();
  expect(screen.getByText("Add one once they've said yes.")).toBeInTheDocument();
  expect(
    screen.queryByRole('searchbox', { name: 'Search by name or handle' })
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Add a featured stylist' })).toHaveAttribute(
    'href',
    '/featured/new'
  );
});

it.each(['@Ama.Braids', 'https://www.instagram.com/Ama.Braids/?hl=en'])(
  'keeps only the handle from %s and sends creation CSRF',
  async handle => {
    const user = userEvent.setup();
    const calls = setup({ 'POST /data/featured/': page });
    renderStaff('/featured/new');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Ama');
    await user.type(screen.getByRole('textbox', { name: 'Instagram handle' }), handle);
    await user.type(screen.getByRole('textbox', { name: 'Area' }), 'Peckham');
    await user.click(screen.getByRole('button', { name: 'Add a featured stylist' }));
    await screen.findByRole('button', { name: 'Save details' });
    const call = calls.find(call => call.method === 'POST' && call.url === '/data/featured/')!;
    expect((call.body as FormData).get('instagram_handle')).toBe('ama.braids');
    expect(call.csrf).toBe('staff-csrf');
  }
);

it('shows a refused handle under the field without losing the form', async () => {
  const user = userEvent.setup();
  setup({ 'POST /data/featured/': { status: 400, body: { message: 'That handle is taken.' } } });
  renderStaff('/featured/new');
  await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Ama');
  await user.type(screen.getByRole('textbox', { name: 'Instagram handle' }), '@ama');
  await user.type(screen.getByRole('textbox', { name: 'Area' }), 'Peckham');
  await user.click(screen.getByRole('button', { name: 'Add a featured stylist' }));
  expect(await screen.findByText('That handle is taken.')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Instagram handle' })).toHaveAccessibleDescription(
    'That handle is taken.'
  );
});

it.each([
  [page, 'Add a look and record the yes before putting the page live.'],
  [{ ...page, ...yes }, 'Add a look before putting the page live.'],
  [{ ...page, looks: [look], look_count: 1 }, 'Record the yes before putting the page live.'],
])('explains why putting a page live is unavailable %#', async (detail, reason) => {
  setup({ '/data/featured/ama/': detail });
  renderStaff('/featured/ama');
  expect(await screen.findByRole('button', { name: 'Put the page live' })).toBeDisabled();
  expect(screen.getByText(reason)).toBeInTheDocument();
});

it('validates look photos and styles before uploading, reorders cover first and clears the open panel', async () => {
  const user = userEvent.setup();
  let detail = { ...page };
  const calls = setup({
    '/data/featured/ama/': () => detail,
    'POST /data/featured/ama/looks/': () => {
      detail = { ...page, looks: [look], look_count: 1 };
      return { id: look.id };
    },
  });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  const form = screen.getByRole('form', { name: 'Add a look' });
  const save = within(form).getByRole('button', { name: 'Save look' });
  expect(save).toBeDisabled();
  await user.click(await within(form).findByRole('checkbox', { name: 'Knotless braids' }));
  expect(save).toBeDisabled();
  await user.upload(
    within(form).getByLabelText('Choose photos'),
    Array.from({ length: 6 }, (_, i) => photo(`photo${i}.jpg`))
  );
  expect(await within(form).findByText('Add 1 to 5 photos')).toBeInTheDocument();
  expect(calls.some(call => call.method === 'POST')).toBe(false);
  await user.upload(within(form).getByLabelText('Choose photos'), [
    photo('one.jpg'),
    photo('two.jpg'),
  ]);
  expect(await within(form).findByAltText('one.jpg')).toBeInTheDocument();
  expect(within(form).getByAltText('two.jpg')).toBeInTheDocument();
  // Tapping a picked style again unpicks it.
  await user.click(within(form).getByRole('checkbox', { name: 'Knotless braids' }));
  expect(save).toBeDisabled();
  await user.click(within(form).getByRole('checkbox', { name: 'Knotless braids' }));
  await user.click(within(form).getByRole('button', { name: 'Move photo 2 earlier' }));
  await user.click(within(form).getByRole('radio', { name: 'Coily' }));
  await user.click(save);
  await within(form).findByText('Look saved. Add the next look.');
  const upload = calls.find(call => call.method === 'POST')!;
  expect(upload.csrf).toBe('staff-csrf');
  expect((upload.body as FormData).getAll('files').map(file => (file as File).name)).toEqual([
    'two.jpg',
    'one.jpg',
  ]);
  expect((upload.body as FormData).getAll('styles')).toEqual(['knotless']);
  expect(within(form).getByRole('button', { name: 'Save look' })).toBeDisabled();
  expect(within(form).queryByAltText('one.jpg')).not.toBeInTheDocument();
  expect(calls.filter(call => call.url.startsWith('/data/overview/'))).toHaveLength(1);
});

it('shows Saving… and prevents repeating an unfinished look upload', async () => {
  const user = userEvent.setup();
  setup();
  const original = globalThis.fetch;
  let complete: (() => void) | undefined;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url === '/data/featured/ama/looks/' && init?.method === 'POST')
      await new Promise<void>(resolve => {
        complete = resolve;
      });
    return original(url, init);
  });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  await user.upload(screen.getByLabelText('Choose photos'), photo('one.jpg'));
  await user.click(await screen.findByRole('checkbox', { name: 'Knotless braids' }));
  await user.click(screen.getByRole('button', { name: 'Save look' }));
  expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  complete?.();
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Saving…' })).not.toBeInTheDocument()
  );
});

it('sends CSRF for yes, live and details, shows the saved date and locks a live handle', async () => {
  const user = userEvent.setup();
  let detail = { ...page, looks: [look], look_count: 1 };
  const calls = setup({
    '/data/featured/ama/': () => detail,
    'POST /data/featured/ama/yes/': () => {
      detail = { ...detail, ...yes };
      return { done: true };
    },
    'POST /data/featured/ama/live/': () => {
      detail = { ...detail, live: true };
      return { done: true };
    },
    'PATCH /data/featured/ama/': (call: { body?: unknown }) => {
      detail = { ...detail, bio: String((call.body as FormData).get('bio')) };
      return detail;
    },
  });
  renderStaff('/featured/ama');
  await user.type(
    await screen.findByRole('textbox', { name: 'Where and when did they say yes?' }),
    yes.agreed_note
  );
  await user.click(screen.getByRole('button', { name: 'They said yes' }));
  expect(
    await screen.findByText(/Said yes on .*Said yes to Akua on Instagram/)
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Put the page live' }));
  expect(await screen.findByRole('link', { name: 'View the page' })).toHaveAttribute(
    'target',
    '_blank'
  );
  expect(screen.getByRole('textbox', { name: 'Instagram handle' })).toBeDisabled();
  expect(screen.getByText('Locked while the page is live')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save details' }));
  await screen.findByText('Details saved.');
  expect(calls.filter(call => call.method !== 'GET').map(call => [call.method, call.csrf])).toEqual(
    [
      ['POST', 'staff-csrf'],
      ['POST', 'staff-csrf'],
      ['PATCH', 'staff-csrf'],
    ]
  );
});

it('shows and copies a link once and keeps only its expiry after leaving', async () => {
  const user = userEvent.setup();
  let detail = { ...page };
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const calls = setup({
    '/data/featured/ama/': () => detail,
    'POST /data/featured/ama/link/': () => {
      detail = { ...detail, link_expires_at: '2099-10-25T10:00:00Z' };
      return { url: 'https://yasante.com/claim/secret-code', expires_at: detail.link_expires_at };
    },
  });
  const view = renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Make a new link' }));
  expect(await screen.findByText('https://yasante.com/claim/secret-code')).toBeInTheDocument();
  // Ready to paste into the chat: the link, and when it runs out, said once.
  expect(screen.getByText(/The link works once and runs out on 25 Oct/)).toBeInTheDocument();
  expect(screen.getByText(/Making a new link stops this one working/)).toBeInTheDocument();
  expect(screen.queryByText(/^Link live ·/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Copy their link' }));
  expect(clipboard).toHaveBeenCalledWith('https://yasante.com/claim/secret-code');
  await user.click(screen.getAllByRole('link', { name: 'Featured stylists' }).at(-1)!);
  await user.click(await screen.findByRole('link', { name: /Ama.*@ama.braids/ }));
  expect(await screen.findByRole('button', { name: 'Make a new link' })).toBeInTheDocument();
  expect(screen.queryByText('https://yasante.com/claim/secret-code')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Copy their link' })).not.toBeInTheDocument();
  expect(screen.getByText(/Link live/)).toBeInTheDocument();
  expect(screen.queryByText(/This link works once/)).not.toBeInTheDocument();
  expect(screen.getAllByText(/25 Oct 2099/)).toHaveLength(1);
  expect(
    JSON.stringify(
      view.client
        .getQueryCache()
        .getAll()
        .map(query => query.state.data)
    )
  ).not.toContain('secret-code');
  expect(calls.find(call => call.method === 'POST')?.csrf).toBe('staff-csrf');
});

it('requires the typed handle to take a page down and confirms exact look/photo counts', async () => {
  const user = userEvent.setup();
  const detail = { ...page, looks: [look], look_count: 1 };
  const calls = setup({
    '/data/featured/ama/': detail,
    'POST /data/featured/ama/take-down/': { done: true },
  });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Take the page down' }));
  const dialog = screen.getByRole('dialog', { name: 'Take the page down' });
  const confirm = within(dialog).getByRole('button', { name: 'Take the page down' });
  expect(confirm).toBeDisabled();
  expect(
    within(dialog).getByText(
      'Their page, 1 look and 1 photo are deleted for good. The waitlist is emptied.'
    )
  ).toBeInTheDocument();
  await user.type(within(dialog).getByRole('textbox'), 'wrong');
  expect(confirm).toBeDisabled();
  await user.clear(within(dialog).getByRole('textbox'));
  await user.type(within(dialog).getByRole('textbox'), page.handle);
  await user.click(confirm);
  await screen.findByRole('link', { name: 'Add a featured stylist' });
  const call = calls.find(call => call.method === 'POST')!;
  expect(call.csrf).toBe('staff-csrf');
  expect((call.body as FormData).get('handle')).toBe(page.handle);
});

it('hides staff writes after claiming and shows when the page became the stylist’s', async () => {
  setup({ '/data/featured/ama/': { ...page, claimed_at: '2026-10-18T10:00:00Z', live: true } });
  renderStaff('/featured/ama');
  expect(await screen.findByText(/Claimed by them on .*It's their page now./)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Take the page down' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Make a new link' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save details' })).toBeDisabled();
});

it('confirms removal, sends DELETE with CSRF and updates only the affected page', async () => {
  const user = userEvent.setup();
  let detail = { ...page, looks: [look], look_count: 1 };
  const calls = setup({
    '/data/featured/ama/': () => detail,
    'DELETE /data/featured/ama/looks/look-1/': () => {
      detail = { ...page, looks: [], look_count: 0 };
      return { done: true };
    },
  });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Remove look 1' }));
  await user.click(
    within(screen.getByRole('dialog', { name: 'Remove this look?' })).getByRole('button', {
      name: 'Remove look',
    })
  );
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Remove look 1' })).not.toBeInTheDocument()
  );
  expect(calls.find(call => call.method === 'DELETE')?.csrf).toBe('staff-csrf');
  expect(calls.filter(call => call.url === '/data/overview/')).toHaveLength(1);
});

it('supports dropping photos and dragging them into cover order', async () => {
  const user = userEvent.setup();
  const calls = setup({ 'POST /data/featured/ama/looks/': { id: 'look-1' } });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  const input = screen.getByLabelText('Choose photos');
  fireEvent.drop(input.parentElement!, {
    dataTransfer: { files: [photo('first.jpg'), photo('second.jpg')] },
  });
  const first = await screen.findByAltText('first.jpg');
  const second = await screen.findByAltText('second.jpg');
  fireEvent.dragStart(second.closest('[draggable]')!);
  fireEvent.drop(first.closest('[draggable]')!, { dataTransfer: { files: [] } });
  await user.click(await screen.findByRole('checkbox', { name: 'Knotless braids' }));
  await user.click(screen.getByRole('button', { name: 'Save look' }));
  await screen.findByText('Look saved. Add the next look.');
  expect(
    (calls.find(call => call.method === 'POST')?.body as FormData)
      .getAll('files')
      .map(file => (file as File).name)
  ).toEqual(['second.jpg', 'first.jpg']);
});

it('loads the Featured stylists section lazily', () => {
  expect(Featured).toHaveProperty('$$typeof', Symbol.for('react.lazy'));
});

it('shows when an existing link has run out without exposing its code', async () => {
  setup({ '/data/featured/ama/': { ...page, link_expires_at: '2020-01-01T10:00:00Z' } });
  renderStaff('/featured/ama');
  expect(await screen.findByText(/Link has run out/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Make a new link' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Copy their link' })).not.toBeInTheDocument();
});

it('shows the picked style and hair labels on every card with one shared catalogue read', async () => {
  const calls = setup({
    '/data/featured/ama/': {
      ...page,
      look_count: 3,
      looks: [look, { ...look, id: 'look-2' }, { ...look, id: 'look-3' }],
    },
  });
  renderStaff('/featured/ama');
  await screen.findAllByText('Knotless braids');
  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(3);
  for (const card of cards) {
    expect(within(card).getByText('Knotless braids')).toBeInTheDocument();
    expect(within(card).getByText('Coily')).toBeInTheDocument();
    expect(within(card).queryByText('knotless')).not.toBeInTheDocument();
    expect(within(card).queryByText('coily')).not.toBeInTheDocument();
  }
  const reads = calls.filter(call => call.url.startsWith('/data/records/looks/style/'));
  expect(reads).toHaveLength(1);
  expect(new URL(reads[0].url, 'https://admin.localhost').searchParams.get('slug__in')).toBe(
    'knotless'
  );
});

it('resolves style names beyond the first catalogue page', async () => {
  const calls = setup({
    '/data/featured/ama/': {
      ...page,
      look_count: 1,
      looks: [{ ...look, styles: ['knotless', 'cornrows'] }],
    },
    '/data/records/looks/style/': (call: { url: string }) => ({
      ...styles,
      pages: 2,
      page: call.url.includes('&p=2') ? 2 : 1,
      rows: [styles.rows[call.url.includes('&p=2') ? 1 : 0]],
    }),
  });
  renderStaff('/featured/ama');
  expect(await screen.findByText('Knotless braids')).toBeInTheDocument();
  expect(screen.getByText('Cornrows')).toBeInTheDocument();
  expect(calls.filter(call => call.url.startsWith('/data/records/looks/style/'))).toHaveLength(2);
});

it('uses compact icon controls with accessible names and tooltips and hides impossible moves', async () => {
  const user = userEvent.setup();
  setup();
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  const form = screen.getByRole('form', { name: 'Add a look' });
  await user.upload(within(form).getByLabelText('Choose photos'), [
    photo('one.jpg'),
    photo('two.jpg'),
    photo('three.jpg'),
  ]);
  await within(form).findByAltText('three.jpg');
  expect(
    within(form).queryByRole('button', { name: 'Move photo 1 earlier' })
  ).not.toBeInTheDocument();
  expect(
    within(form).queryByRole('button', { name: 'Move photo 3 later' })
  ).not.toBeInTheDocument();
  const buttons = within(form).getAllByRole('button', { name: /^(Move photo|Remove photo)/ });
  expect(buttons).toHaveLength(7);
  for (const button of buttons) {
    expect(button).toHaveAttribute('title', button.getAttribute('aria-label'));
    expect(button.textContent).toBe('');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button).toBeEnabled();
  }
  await user.click(within(form).getByRole('button', { name: 'Move photo 2 earlier' }));
  expect(
    within(form)
      .getAllByRole('img')
      .map(img => img.getAttribute('alt'))
  ).toEqual(['two.jpg', 'one.jpg', 'three.jpg']);
  await user.click(within(form).getByRole('button', { name: 'Remove photo 2' }));
  expect(within(form).queryByAltText('one.jpg')).not.toBeInTheDocument();
});

it('keeps chosen style chips above filtered choices and updates the picked count on removal', async () => {
  const user = userEvent.setup();
  const calls = setup({
    '/data/records/looks/style/': (call: { url: string }) => ({
      ...styles,
      rows: call.url.includes('name__icontains=corn') ? [styles.rows[1]] : styles.rows,
    }),
  });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  const form = screen.getByRole('form', { name: 'Add a look' });
  expect(within(form).getByLabelText('Find a style')).toHaveAccessibleDescription(
    'Pick up to 3 styles'
  );
  await user.click(await within(form).findByRole('checkbox', { name: 'Knotless braids' }));
  await user.click(within(form).getByRole('checkbox', { name: 'Cornrows' }));
  expect(within(form).getByLabelText('Find a style')).toHaveAccessibleDescription('2 of 3 picked');
  await user.type(within(form).getByLabelText('Find a style'), 'corn');
  await waitFor(() =>
    expect(calls.some(call => call.url.includes('name__icontains=corn'))).toBe(true)
  );
  await waitFor(() =>
    expect(
      within(form).queryByRole('checkbox', { name: 'Knotless braids' })
    ).not.toBeInTheDocument()
  );
  const chosen = within(form).getByRole('group', { name: 'Chosen styles' });
  expect(within(chosen).getByRole('button', { name: 'Remove Knotless braids' })).toHaveTextContent(
    'Knotless braids'
  );
  expect(within(chosen).getByRole('button', { name: 'Remove Cornrows' })).toHaveTextContent(
    'Cornrows'
  );
  expect(
    chosen.compareDocumentPosition(within(form).getByRole('checkbox', { name: 'Cornrows' })) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  await user.click(within(chosen).getByRole('button', { name: 'Remove Knotless braids' }));
  expect(
    within(chosen).queryByRole('button', { name: 'Remove Knotless braids' })
  ).not.toBeInTheDocument();
  expect(within(form).getByLabelText('Find a style')).toHaveAccessibleDescription('1 of 3 picked');
  expect(within(form).getByRole('checkbox', { name: 'Cornrows' })).toBeChecked();
});

it('cancels the add-look panel without uploading', async () => {
  const user = userEvent.setup();
  const calls = setup();
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  expect(screen.queryByRole('button', { name: 'Close add a look' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('form', { name: 'Add a look' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add a look' })).toBeInTheDocument();
  expect(calls.some(call => call.method !== 'GET')).toBe(false);
});

it('shows and copies the full https Yasante address returned by the server', async () => {
  const user = userEvent.setup();
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const url = 'https://yasante.com/claim/full-link-code';
  setup({ 'POST /data/featured/ama/link/': { url, expires_at: '2099-10-25T10:00:00Z' } });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Make a new link' }));
  expect(await screen.findByText(url, { exact: true })).toBeVisible();
  expect(screen.queryByText('/claim/full-link-code', { exact: true })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Copy their link' }));
  expect(clipboard).toHaveBeenCalledWith(url);
});

it('adds photos pasted straight from the clipboard', async () => {
  const user = userEvent.setup();
  setup();
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Add a look' }));
  const form = screen.getByRole('form', { name: 'Add a look' });
  const paste = new Event('paste', { bubbles: true }) as Event & { clipboardData: unknown };
  paste.clipboardData = { files: [photo('copied.jpg')] };
  fireEvent(window, paste);
  expect(await within(form).findByAltText('copied.jpg')).toBeInTheDocument();
});

it('makes the message to paste into the chat, with the link in it', async () => {
  const user = userEvent.setup();
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const url = 'https://yasante.com/claim/message-code';
  setup({ 'POST /data/featured/ama/link/': { url, expires_at: '2099-10-25T10:00:00Z' } });
  renderStaff('/featured/ama');
  await user.click(await screen.findByRole('button', { name: 'Make a new link' }));
  await user.click(await screen.findByRole('button', { name: 'Copy the message' }));
  expect(clipboard).toHaveBeenCalledWith(expect.stringContaining(url));
  expect(clipboard).toHaveBeenCalledWith(expect.stringContaining('Your page on Yasante is ready'));
  expect(await screen.findByText('Message copied. Paste it into the chat.')).toBeInTheDocument();
});

it('always says what to do next', async () => {
  setup();
  renderStaff('/featured/ama');
  await screen.findByRole('heading', { level: 1 });
  const next = screen.getAllByRole('status').find(el => /^Next/.test(el.textContent ?? ''));
  expect(next).toHaveTextContent(
    /Add their first look|Record their yes|Put it live|Send them their link|Waiting for them/
  );
});

it('adds a TikTok-only stylist, keeping only the handle from a pasted address', async () => {
  const user = userEvent.setup();
  const calls = setup({ 'POST /data/featured/': { ...page, id: 'new-one' } });
  renderStaff('/featured/new');
  await user.click(await screen.findByRole('radio', { name: 'TikTok' }));
  expect(screen.queryByRole('textbox', { name: 'Instagram handle' })).not.toBeInTheDocument();
  await user.type(
    screen.getByRole('textbox', { name: 'TikTok handle' }),
    'https://www.tiktok.com/@Efe.Braids?lang=en'
  );
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Efe');
  await user.type(screen.getByRole('textbox', { name: 'Area' }), 'Croydon');
  await user.click(screen.getByRole('button', { name: 'Add a featured stylist' }));
  await waitFor(() => expect(calls.some(call => call.method === 'POST')).toBe(true));
  const body = calls.find(call => call.method === 'POST')!.body as FormData;
  expect(body.get('tiktok_handle')).toBe('efe.braids');
  expect(body.get('instagram_handle')).toBe('');
});
