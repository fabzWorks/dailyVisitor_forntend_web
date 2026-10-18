import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

// ============================================================
// LandingScreen.tsx  -  the first screen (logo + two buttons)
//
//   onLogin   -> open the Login screen
//   onSignup  -> open the Signup screen
// ============================================================
interface LandingScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onLogin, onSignup }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 pb-8">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-5 shadow-2xl ring-1 ring-white/30">
          <ShieldCheck className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">SmartEntry</h1>
        <p className="text-blue-100 text-sm mt-2">Smart Visitor & Service Management</p>
      </motion.div>
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }} className="mt-14 space-y-3 w-full max-w-xs">
        <button onClick={() => onLogin()}
          className="w-full py-4 bg-white text-blue-700 font-bold rounded-2xl shadow-xl hover:bg-blue-50 active:scale-95 transition-all text-base">
          Log In
        </button>
        <button onClick={() => onSignup()}
          className="w-full py-4 bg-white/15 backdrop-blur-sm text-white font-bold rounded-2xl border border-white/30 hover:bg-white/25 active:scale-95 transition-all text-base">
          Create Account
        </button>
      </motion.div>
    </div>
  );

};