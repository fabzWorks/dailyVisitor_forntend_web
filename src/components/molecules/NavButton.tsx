import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

// MOLECULE: one button of the bottom navigation bar (icon + small label).
export const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : 'bg-transparent'}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);
