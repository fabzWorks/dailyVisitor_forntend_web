'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  error: Error | null;
}

// ORGANISM: the safety net of the whole app.
// If a screen crashes while drawing (a bug), the person sees this friendly page
// with a "Try again" button instead of a white screen.
// (Errors from the backend are NOT handled here - those are shown as toasts, see src/lib/errors.ts)
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 px-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">⚠️</div>
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xs">
          This screen could not be shown. Your data is safe. Please try again.
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          Try again
        </button>
      </div>
    );
  }
}
