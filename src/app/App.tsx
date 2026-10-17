'use client';

import React, { useState } from 'react';
import { DesktopFrame } from './components/layout/DesktopFrame';
import { VisitorApp } from './components/visitor/VisitorApp';
import { ResidentApp } from './components/resident/ResidentApp';
import { LandingScreen } from './components/auth/LandingScreen';
import { UnifiedLogin } from './components/auth/UnifiedLogin';
import { UnifiedSignup } from './components/auth/UnifiedSignup';
import { Toaster } from './components/ui/sonner';
import type { SessionUser } from './lib/api';

// Which screen is open right now
type View = 'landing' | 'login' | 'signup' | 'visitor-home' | 'resident-home';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [user, setUser] = useState<SessionUser | null>(null);   // the logged-in person

  // login or signup worked -> remember the user and open his dashboard
  const handleAuthSuccess = (loggedInUser: SessionUser) => {
    setUser(loggedInUser);
    setView(loggedInUser.role === 'provider' ? 'visitor-home' : 'resident-home');
  };

  const logout = () => {
    setUser(null);
    setView('landing');
  };

  return (
    <>
      <DesktopFrame>
        {view === 'landing' && (
          <LandingScreen onLogin={() => setView('login')} onSignup={() => setView('signup')} />
        )}
        {view === 'login' && (
          <UnifiedLogin
            onBack={() => setView('landing')}
            onGoSignup={() => setView('signup')}
            onLoginSuccess={handleAuthSuccess}
          />
        )}
        {view === 'signup' && (
          <UnifiedSignup
            onBack={() => setView('landing')}
            onGoLogin={() => setView('login')}
            onSignupSuccess={handleAuthSuccess}
          />
        )}
        {view === 'visitor-home' && user && <VisitorApp user={user} onLogout={logout} />}
        {view === 'resident-home' && user && <ResidentApp user={user} onLogout={logout} />}
      </DesktopFrame>
      <Toaster position="top-center" richColors />
    </>
  );
}