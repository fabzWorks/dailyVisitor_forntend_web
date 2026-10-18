import React from 'react';

interface BottomNavBarProps {
  className?: string;            // spacing: resident uses 'px-6', visitor uses 'px-4'
  children: React.ReactNode;     // the <NavButton>s (and the round "+" button for residents)
}

// ORGANISM: the white bar fixed at the bottom of both apps. Put <NavButton>s inside it.
export const BottomNavBar: React.FC<BottomNavBarProps> = ({ className = 'px-4', children }) => (
  <div className={`absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 ${className} py-4 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-50`}>
    {children}
  </div>
);
