import React from 'react';

export const DesktopFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className="h-[100dvh] min-h-screen w-full bg-slate-100 font-sans text-slate-900">
      <div className={`h-full min-h-screen w-full bg-white overflow-hidden relative flex flex-col ${className ?? ''}`}>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide relative bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  );
};
