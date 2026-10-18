import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AppShellProps {
  pageKey: string;                         // changes when the screen changes -> plays the slide animation
  slide?: 'vertical' | 'horizontal';       // visitor app slides up/down, resident app slides left/right
  bottomNav?: React.ReactNode;             // <BottomNavBar> ... </BottomNavBar>  (hide it by passing nothing)
  children: React.ReactNode;               // the current screen
}

// TEMPLATE: the page layout shared by the resident app and the visitor app:
// a scrolling area with the current screen (animated) + the bottom navigation bar.
export const AppShell: React.FC<AppShellProps> = ({ pageKey, slide = 'vertical', bottomNav, children }) => {
  const from = slide === 'vertical' ? { y: 10 } : { x: 20 };
  const to = slide === 'vertical' ? { y: 0 } : { x: 0 };
  const out = slide === 'vertical' ? { y: -10 } : { x: -20 };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, ...from }}
            animate={{ opacity: 1, ...to }}
            exit={{ opacity: 0, ...out }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      {bottomNav}
    </div>
  );
};
