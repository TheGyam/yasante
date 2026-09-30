import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ApiError } from '@/shared/lib/api/client';
import { staffRoutes } from './routes';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import '@/shared/theme/global.css';

const client = new QueryClient({
  defaultOptions: {
    mutations: { gcTime: 0 },
    queries: {
      gcTime: 0,
      staleTime: 15000,
      refetchOnWindowFocus: 'always',
      retry: (attempt, error) => !(error instanceof ApiError && error.status < 500) && attempt < 1,
    },
  },
});
const router = createBrowserRouter(staffRoutes);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
