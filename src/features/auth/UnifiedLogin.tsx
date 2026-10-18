import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { SessionUser } from '@/api/types';
import { useLogin } from '@/hooks';
import { getErrorMessage, isStatus } from '@/lib/errors';


interface UnifiedLoginProps {
  onBack: () => void;
  onGoSignup: () => void;
  onLoginSuccess: (user: SessionUser) => void;
}

const inputCls = 'w-full py-3 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 placeholder:text-slate-300 transition-all';

//React.FC<UnifiedLoginProps> — TypeScript ko batata hai ke ye React function component hai aur iske props ka type UnifiedLoginProps hai.
export const UnifiedLogin: React.FC<UnifiedLoginProps> = ({ onBack, onGoSignup, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const login = useLogin();            // TanStack Query mutation: calls POST /api/auth/login
  const busy = login.isPending;        // true while the backend is answering

  // Log In button
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter email and password'); return; }

    try {
      const r = await login.mutateAsync({ email, password });
      toast.success('Welcome back!');
      setTimeout(() => onLoginSuccess(r.user), 400);
    } catch (err) {
      toast.error(isStatus(err, 401) ? 'Email or password is incorrect' : getErrorMessage(err));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="flex-shrink-0 px-6 pt-12 pb-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
        <p className="text-blue-100 text-sm mt-1">Sign in to your account</p>
      </div>
      <div className="flex-1 bg-white rounded-t-3xl p-6 shadow-2xl overflow-y-auto pb-10">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg mt-2 disabled:opacity-60">
            {busy ? 'Signing in…' : 'Log In'}
          </button>
        </form>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          No account?{' '}
          <button onClick={() => onGoSignup()} className="text-blue-600 font-bold hover:underline">Sign Up</button>
        </p>
        <button onClick={() => onBack()}
          className="mt-3 w-full flex items-center justify-center gap-1 text-slate-400 text-sm hover:text-slate-600">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>
    </div>
  );

};