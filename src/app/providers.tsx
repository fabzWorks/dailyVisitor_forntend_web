'use client';

import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/organisms';
import { Toaster } from '@/components/molecules';

// ============================================================
// providers.tsx  -  things the WHOLE app needs, set up once
//
//   QueryClientProvider  -> lets every screen use TanStack Query (src/hooks)
//   ErrorBoundary        -> friendly page if a screen crashes
//   Toaster              -> the small popup messages (toast.success / toast.error)
//
// (Zustand stores need no provider - they work anywhere.)
// ============================================================
export function Providers({ children }: { children: React.ReactNode }) {
  // useState makes sure ONE query client lives as long as the page is open
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
