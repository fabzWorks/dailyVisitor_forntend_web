'use client';

import React from 'react';
import { DesktopFrame } from '@/components/templates';
import { LandingScreen } from '@/features/auth/LandingScreen';
import { UnifiedLogin } from '@/features/auth/UnifiedLogin';
import { UnifiedSignup } from '@/features/auth/UnifiedSignup';
import { VisitorApp } from '@/features/visitor/VisitorApp';
import { ResidentApp } from '@/features/resident/ResidentApp';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';

// ============================================================
// App.tsx  -  decides which screen is open
//
//   not logged in  -> Landing / Login / Signup   (authStore.guestScreen says which)
//   provider       -> VisitorApp
//   resident       -> ResidentApp
//
// The logged-in user lives in store/authStore.ts
// ============================================================
export default function App() {
  const user = useAuthStore((s) => s.user);
  const guestScreen = useAuthStore((s) => s.guestScreen);
  const showGuestScreen = useAuthStore((s) => s.showGuestScreen);
  const signIn = useAuthStore((s) => s.signIn);   // login or signup worked -> the right dashboard opens
  const logout = useLogout();

  return (
    <DesktopFrame>
      {!user && guestScreen === 'landing' && (
        <LandingScreen onLogin={() => showGuestScreen('login')} onSignup={() => showGuestScreen('signup')} />
      )}
      {!user && guestScreen === 'login' && (
        <UnifiedLogin
          onBack={() => showGuestScreen('landing')}
          onGoSignup={() => showGuestScreen('signup')}
          onLoginSuccess={signIn}
        />
      )}
      {!user && guestScreen === 'signup' && (
        <UnifiedSignup
          onBack={() => showGuestScreen('landing')}
          onGoLogin={() => showGuestScreen('login')}
          onSignupSuccess={signIn}
        />
      )}
      {user?.role === 'provider' && <VisitorApp user={user} onLogout={logout} />}
      {user?.role === 'resident' && <ResidentApp user={user} onLogout={logout} />}
    </DesktopFrame>
  );
}
