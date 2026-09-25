import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * What the server already knew when it sent the page. Django inlines the page's own
 * API responses (the same JSON the API would send) under the query keys the features
 * read them with, so a shared link opens on its content, not a spinner.
 *
 *   <script id="page-data" type="application/json">[{"key": [...], "data": {...}}]</script>
 *
 * The keys are part of the contract with backend/apps/web/views.py.
 */
interface Seed {
  key: QueryKey;
  data: unknown;
}

export function seedFromPage(client: QueryClient, doc: Document = document) {
  const node = doc.getElementById('page-data');
  if (!node?.textContent) return;
  try {
    for (const seed of JSON.parse(node.textContent) as Seed[]) {
      client.setQueryData(seed.key, seed.data);
    }
  } catch {
    // A page without its data still works: it loads it like any other.
  }
  node.remove();
}
