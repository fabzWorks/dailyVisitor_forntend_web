// ============================================================
// queryClient.ts  -  default rules for ALL TanStack Query calls in the app
// ============================================================
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,                      // one quick retry, then show the last data we had
        refetchOnWindowFocus: true,    // coming back to the tab = fresh data
      },
      mutations: {
        retry: false,                  // never send a button action twice by accident
      },
    },
  });
}
