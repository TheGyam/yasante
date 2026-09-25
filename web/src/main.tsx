import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { makeQueryClient } from '@/shared/lib/queryClient';
import { seedFromPage } from '@/shared/lib/pageData';
import { createRouter } from '@/routes';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import '@/shared/theme/global.css';

const queryClient = makeQueryClient();
// The page's own data came with the HTML: the first paint shows it, no spinner.
seedFromPage(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createRouter()} />
    </QueryClientProvider>
  </StrictMode>
);
