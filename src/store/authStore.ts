// ============================================================
// authStore.ts  -  WHO is logged in, and which screen a logged-out person sees
//
// Used by:  App.tsx (decides what to show)  +  hooks/useAuth.ts (login / signup / logout)
//
// The user is kept in memory only (a page refresh = log in again), same as before.
// ============================================================
import { create } from 'zustand';
import type { SessionUser } from '@/api/types';

export type GuestScreen = 'landing' | 'login' | 'signup';

interface AuthState {
  user: SessionUser | null;
  guestScreen: GuestScreen;                  // only matters while user is null
  showGuestScreen: (screen: GuestScreen) => void;
  signIn: (user: SessionUser) => void;       // login or signup worked
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  guestScreen: 'landing',
  showGuestScreen: (guestScreen) => set({ guestScreen }),
  signIn: (user) => set({ user }),
  signOut: () => set({ user: null, guestScreen: 'landing' }),
}));
