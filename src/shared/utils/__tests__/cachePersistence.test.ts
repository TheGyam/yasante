import { shouldKeep, trimPages } from '../cachePersistence';

const q = (queryKey: unknown[], status = 'success') =>
  ({ queryKey, state: { status } }) as unknown as Parameters<typeof shouldKeep>[0];

describe('what the app keeps between launches', () => {
  it('keeps the screens people come back to, not the moment-only answers', () => {
    expect(shouldKeep(q(['looks', 'feed', 'u1', {}]))).toBe(true);
    expect(shouldKeep(q(['planner', 'collections', 'u1']))).toBe(true);
    expect(shouldKeep(q(['slots', 'ama', 's1', []]))).toBe(false);
    expect(shouldKeep(q(['username-check', 'efua']))).toBe(false);
    expect(shouldKeep(q(['looks', 'one', 'u1', 'l1']))).toBe(false);
    expect(shouldKeep(q(['planner', 'collections', 'u1'], 'error'))).toBe(false);
  });

  it('keeps only the first page of a long list', () => {
    const client = {
      clientState: {
        queries: [
          { state: { data: { pages: [1, 2, 3], pageParams: [undefined, 'a', 'b'] } } },
          { state: { data: [1, 2, 3] } },
        ],
      },
    };
    trimPages(client);
    expect(client.clientState.queries[0].state.data).toEqual({
      pages: [1],
      pageParams: [undefined],
    });
    expect(client.clientState.queries[1].state.data).toEqual([1, 2, 3]);
  });
});
