import React, { useState } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Phone, Camera, ChevronLeft, Clock, Home, Briefcase, Plus, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import type { SessionUser, SignupBaseBody } from '@/api/types';
import { useSignupProvider, useSignupResident } from '@/hooks';
import { getErrorMessage } from '@/lib/errors';
import { LocationPicker } from '@/features/auth/LocationPicker';
import type { PickedLocation } from '@/features/auth/LocationPicker';


interface UnifiedSignupProps {
  onBack: () => void;
  onGoLogin: () => void;
  onSignupSuccess: (user: SessionUser) => void;
}

const SERVICES = [
  { id: 'milkman',   label: 'Milkman',          icon: '🥛' },
  { id: 'garbage',   label: 'Garbage Collector', icon: '🗑️' },
  { id: 'newspaper', label: 'Newspaper',          icon: '📰' },
];
const MILK_PRODUCTS = [
  { id: 'cow',    label: 'Cow Milk',   icon: '🐄', unit: 'per Liter' },
  { id: 'goat',   label: 'Goat Milk',  icon: '🐐', unit: 'per Liter' },
  { id: 'camel',  label: 'Camel Milk', icon: '🐪', unit: 'per Liter' },
  { id: 'cheese', label: 'Cheese',     icon: '🧀', unit: 'per Kg' },
  { id: 'butter', label: 'Butter/Ghee', icon: '🧈', unit: 'per Kg' },
];
const NEWSPAPER_TYPES = [
  { id: 'dawn',    label: 'Dawn',     lang: 'EN' },
  { id: 'thenews', label: 'The News', lang: 'EN' },
  { id: 'jang',    label: 'Jang',     lang: 'UR' },
  { id: 'express', label: 'Express',  lang: 'UR' },
  { id: 'tribune', label: 'Tribune',  lang: 'EN' },
  { id: 'geo',     label: 'Geo',      lang: 'UR' },
];
const GENDERS = ['Male', 'Female', 'Other'];
interface TimeSlot { id: number; from: string; to: string; }
interface FormData {
  name: string; email: string; password: string; confirmPassword: string;
  gender: string; contact: string; imagePreview: string | null;
  lat: string; lng: string; country: string; province: string;
  city: string; area: string; address: string;
  mapTapped: boolean;
  role: 'resident' | 'visitor' | '';
  service: string;
  milkProducts: string[];
  productPrices: Record<string, string>;
  newspaperTypes: string[];
  newspaperPrice: string;
  garbagePrice: string;
  garbageWeight: string;   // max kg the collector takes per pickup
  days: string[];
  timeSlots: TimeSlot[];
}
const emptyForm = (): FormData => ({
  name: '', email: '', password: '', confirmPassword: '',
  gender: '', contact: '', imagePreview: null,
  lat: '', lng: '', country: '', province: '', city: '', area: '', address: '',
  mapTapped: false,
  role: '', service: '',
  milkProducts: [],
  productPrices: {},
  newspaperTypes: [],
  newspaperPrice: '',
  garbagePrice: '',
  garbageWeight: '',
  days: [],
  timeSlots: [{ id: Date.now(), from: '06:00', to: '07:00' }],
});
const inputCls = 'w-full py-3 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 placeholder:text-slate-300 transition-all';
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 bg-blue-500 rounded-full" />
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{children}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const UnifiedSignup: React.FC<UnifiedSignupProps> = ({ onBack, onGoLogin, onSignupSuccess }) => {
 // show password
  const [showPw, setShowPw] = useState(false);
  // confirm paasword firld dikhana or chupana
  const [showCPw, setShowCPw] = useState(false);
  // TanStack Query mutations: POST /api/auth/signup/provider  and  /api/auth/signup/resident
  const signupProvider = useSignupProvider();
  const signupResident = useSignupResident();
  const busy = signupProvider.isPending || signupResident.isPending;   // true while the backend is answering
 // emptyForm() se initial object lekar React state mein rakha jata hai.
  const [form, setForm] = useState<FormData>(emptyForm());
  //patch=>Purane form object ko preserve karke sirf di hui fields update karta hai.
  const patch = (p: Partial<FormData>) => setForm(prev => ({ ...prev, ...p }));
  const isVisitor = form.role === 'visitor';
  const isResident = form.role === 'resident';

  // Real map: pin placed / moved / searched -> fill the address fields
  const handlePick = (loc: PickedLocation) => {
    patch({
      mapTapped: true,
      lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6),
      country: loc.country, province: loc.province, city: loc.city, area: loc.area, address: loc.address,
    });
  };
  // Service days (one common set of days; the time slots below apply to ALL selected days)
  const toggleDay = (d: string) =>
    //filter(x => x !== d) — selected day ko list se remove karta hai. mtlb days select & deselect
    patch({ days: form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d] });
  // Time slots
  const addSlot = () =>
    patch({ timeSlots: [...form.timeSlots, { id: Date.now(), from: '07:00', to: '08:00' }] });
  const removeSlot = (id: number) =>
    patch({ timeSlots: form.timeSlots.filter(s => s.id !== id) });
  //Ye specific slot ka start ya end time update karta hai.
  const patchSlot = (id: number, field: 'from' | 'to', val: string) =>
    patch({ timeSlots: form.timeSlots.map(s => s.id === id ? { ...s, [field]: val } : s) });

  // Signup button
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1) check the form
    if (!form.name || !form.email || !form.password) { toast.error('Fill in all required fields'); return; }
    // email: anything before the @, but it must end with @gmail.com (e.g. this_@gmail.com)
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim())) { toast.error('Email must look like name@gmail.com'); return; }
    if (!/^\d{11}$/.test(form.contact)) { toast.error('Mobile number must be exactly 11 digits (e.g. 03001234567)'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (!form.mapTapped) { toast.error('Select your address on the map'); return; }
    if (!form.role) { toast.error('Please select your role'); return; }
    if (isVisitor) {
      if (!form.service) { toast.error('Please select a service'); return; }
      if (form.service === 'milkman' && !form.milkProducts.length) {
        toast.error('Select at least one milk product'); return;
      }
      if (form.service === 'garbage' && !(Number(form.garbageWeight) > 0)) {
        toast.error('Enter the maximum garbage weight (kg) you take per pickup'); return;
      }
      if (!form.days.length) { toast.error('Select the days on which you provide service'); return; }
      if (!form.timeSlots.length) { toast.error('Add at least one time slot'); return; }
      if (form.timeSlots.some(t => !t.from || !t.to || t.from >= t.to)) {
        toast.error('Each time slot must end after it starts'); return;
      }
    }

    // 2) data that both resident and visitor send
    const base: SignupBaseBody = {
      name: form.name, email: form.email, password: form.password, confirmPassword: form.confirmPassword,
      gender: form.gender, contact: form.contact,
      latitude: parseFloat(form.lat), longitude: parseFloat(form.lng),
      country: form.country, province: form.province, city: form.city, area: form.area, address: form.address,
    };

    // 3) send to the backend
    try {
      let user: SessionUser;
      if (isVisitor) {
        const r = await signupProvider.mutateAsync({
          ...base,
          service: form.service,
          servicePrice: form.service === 'newspaper' ? Number(form.newspaperPrice) || 0
                      : form.service === 'garbage' ? Number(form.garbagePrice) || 0 : undefined,
          products: form.service === 'milkman'
            ? form.milkProducts.map(id => ({ name: id, price: Number(form.productPrices[id]) || 0 })) : undefined,
          newspapers: form.service === 'newspaper' ? form.newspaperTypes : undefined,
          weight: form.service === 'garbage' ? Number(form.garbageWeight) : undefined,
          days: form.days,
          timeSlots: form.timeSlots.map(t => ({ from: t.from, to: t.to })),
        });
        user = r.user;
      } else {
        const r = await signupResident.mutateAsync(base);
        user = r.user;
      }
      toast.success('Account created!', { description: 'Welcome to SmartEntry' });
      setTimeout(() => onSignupSuccess(user), 500);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // ── SIGNUP ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 pt-10 pb-5 px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => onBack()}
            className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Create Account</h1>
            <p className="text-blue-100 text-xs">Fill in your details to get started</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSignup} className="p-5 space-y-4">
        {/* ── Personal Info ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <SectionLabel>Personal Information</SectionLabel>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={form.name} onChange={e => patch({ name: e.target.value })}
                placeholder="Your full name" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" value={form.email} onChange={e => patch({ email: e.target.value.trim() })}
                placeholder="you@email.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => patch({ password: e.target.value })}
                placeholder="Min. 8 characters" className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showCPw ? 'text' : 'password'} value={form.confirmPassword}
                onChange={e => patch({ confirmPassword: e.target.value })}
                placeholder="Repeat password" className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowCPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Gender</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button key={g} type="button" onClick={() => patch({ gender: g })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${form.gender === g ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Contact Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {/* digits only, exactly 11 (e.g. 03001234567) */}
              <input type="tel" inputMode="numeric" maxLength={11} value={form.contact}
                onChange={e => patch({ contact: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                placeholder="03001234567" className={inputCls} />
            </div>
            <p className={`text-[10px] mt-1 ${form.contact.length === 0 || form.contact.length === 11 ? 'text-slate-400' : 'text-red-500'}`}>
              {form.contact.length}/11 digits
            </p>
          </div>
        </div>
        {/* ── Address ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <SectionLabel>Address</SectionLabel>
          <p className="text-xs text-slate-400 mb-3">Search, tap the map or drag the pin to set your exact location</p>
          <LocationPicker
            lat={form.mapTapped ? parseFloat(form.lat) : null}
            lng={form.mapTapped ? parseFloat(form.lng) : null}
            onPick={handlePick}
          />
          <AnimatePresence>
            {form.mapTapped && (
              <motion.div key="addr" initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[['Latitude', 'lat', true], ['Longitude', 'lng', true]].map(([label, key, ro]) => (
                    <div key={key as string}>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">{label as string}</label>
                      <input value={(form as any)[key as string]} readOnly={!!ro}
                        className="w-full py-2 px-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['country', 'province', 'city', 'area'] as const).map(key => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 capitalize">{key}</label>
                      <input value={form[key]} onChange={e => patch({ [key]: e.target.value } as any)}
                        className="w-full py-2 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Full Address</label>
                  <input value={form.address} onChange={e => patch({ address: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* ── Role Selector ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <SectionLabel>Select Role *</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {/* Resident */}
            <button type="button" onClick={() => patch({ role: 'resident' })}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${isResident ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 bg-slate-50'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isResident ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                <Home className={`w-6 h-6 ${isResident ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <p className={`text-sm font-bold ${isResident ? 'text-indigo-700' : 'text-slate-700'}`}>Resident</p>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isResident ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                {isResident && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
            {/* Visitor */}
            <button type="button" onClick={() => patch({ role: 'visitor' })}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${isVisitor ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-200 bg-slate-50'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isVisitor ? 'bg-teal-500' : 'bg-slate-200'}`}>
                <Briefcase className={`w-6 h-6 ${isVisitor ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <p className={`text-sm font-bold ${isVisitor ? 'text-teal-700' : 'text-slate-700'}`}>Visitor</p>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isVisitor ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`}>
                {isVisitor && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          </div>
        </div>
        {/* ── Visitor-only extra fields ── */}
        <AnimatePresence>
          {isVisitor && (
            <motion.div key="visitor-extras"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }}
              className="space-y-4">
              {/* Service */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                <SectionLabel>Service *</SectionLabel>
                <div className="space-y-2">
                  {SERVICES.map(s => (
                    <div key={s.id}>
                      <button type="button" onClick={() => patch({ service: s.id, milkProducts: [], productPrices: {} })}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${form.service === s.id ? 'border-teal-500 bg-teal-50' : 'border-slate-100 bg-slate-50 hover:border-teal-200'}`}>
                        <span className="text-xl">{s.icon}</span>
                        <span className={`text-sm font-bold flex-1 ${form.service === s.id ? 'text-teal-800' : 'text-slate-700'}`}>{s.label}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${form.service === s.id ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`}>
                          {form.service === s.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                      {/* ── Milkman sub-options ── */}
                      <AnimatePresence>
                        {form.service === 'milkman' && s.id === 'milkman' && (
                          <motion.div key="milk-opts"
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden">
                            <div className="mt-3 pl-2 space-y-3">
                              <p className="text-xs font-bold text-slate-500">Select Products (multi-select) *</p>
                              <div className="flex flex-wrap gap-2">
                                {MILK_PRODUCTS.map(mp => {
                                  const on = form.milkProducts.includes(mp.id);
                                  return (
                                    <button key={mp.id} type="button"
                                      onClick={() => {
                                        const next = on
                                          ? form.milkProducts.filter(x => x !== mp.id)
                                          : [...form.milkProducts, mp.id];
                                        const prices = { ...form.productPrices };
                                        if (!on) prices[mp.id] = prices[mp.id] ?? '';
                                        else delete prices[mp.id];
                                        patch({ milkProducts: next, productPrices: prices });
                                      }}
                                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${on ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-slate-50'}`}>
                                      <span>{mp.icon}</span> {mp.label}
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Price fields for each selected product */}
                              <AnimatePresence>
                                {form.milkProducts.length > 0 && (
                                  <motion.div key="milk-prices"
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                                    <p className="text-xs font-bold text-slate-500 pt-1">Set Your Prices (Rs.)</p>
                                    {MILK_PRODUCTS.filter(mp => form.milkProducts.includes(mp.id)).map(mp => (
                                      <div key={mp.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                        <span className="text-base flex-shrink-0">{mp.icon}</span>
                                        <span className="text-xs font-semibold text-slate-700 flex-1">{mp.label}</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs text-slate-400">Rs.</span>
                                          <input
                                            type="number" min="0" inputMode="numeric"
                                            value={form.productPrices[mp.id] ?? ''}
                                            onChange={e => patch({ productPrices: { ...form.productPrices, [mp.id]: e.target.value } })}
                                            placeholder="0"
                                            className="w-20 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right focus:outline-none focus:ring-2 focus:ring-teal-300"
                                          />
                                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{mp.unit}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* ── Newspaper sub-options ── */}
                      <AnimatePresence>
                        {form.service === 'newspaper' && s.id === 'newspaper' && (
                          <motion.div key="np-opts"
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden">
                            <div className="mt-3 pl-2 space-y-3">
                              <p className="text-xs font-bold text-slate-500">Newspapers You Sell (multi-select) *</p>
                              <div className="flex flex-wrap gap-2">
                                {NEWSPAPER_TYPES.map(n => {
                                  const on = form.newspaperTypes.includes(n.id);
                                  return (
                                    <button key={n.id} type="button"
                                      onClick={() => patch({ newspaperTypes: on ? form.newspaperTypes.filter(x => x !== n.id) : [...form.newspaperTypes, n.id] })}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${on ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-slate-50'}`}>
                                      📰 {n.label}
                                      <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${on ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{n.lang}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Price */}
                              <p className="text-xs font-bold text-slate-500 pt-1">Pricing</p>
                              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                <span className="text-base">📰</span>
                                <span className="text-xs font-semibold text-slate-700 flex-1">Charge per Newspaper</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400">Rs.</span>
                                  <input type="number" min="0" inputMode="numeric"
                                    value={form.newspaperPrice}
                                    onChange={e => patch({ newspaperPrice: e.target.value })}
                                    placeholder="0"
                                    className="w-20 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right focus:outline-none focus:ring-2 focus:ring-teal-300"
                                  />
                                  <span className="text-[10px] text-slate-400">/ piece</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* ── Garbage price ── */}
                      <AnimatePresence>
                        {form.service === 'garbage' && s.id === 'garbage' && (
                          <motion.div key="gc-price"
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden">
                            <div className="mt-3 pl-2">
                              <p className="text-xs font-bold text-slate-500 mb-2">Pricing</p>
                              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                <span className="text-base">🗑️</span>
                                <span className="text-xs font-semibold text-slate-700 flex-1">Charge per Kg</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400">Rs.</span>
                                  <input type="number" min="0" inputMode="numeric"
                                    value={form.garbagePrice}
                                    onChange={e => patch({ garbagePrice: e.target.value })}
                                    placeholder="0"
                                    className="w-20 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right focus:outline-none focus:ring-2 focus:ring-teal-300"
                                  />
                                  <span className="text-[10px] text-slate-400">/ kg</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-2">
                                <span className="text-base">⚖️</span>
                                <span className="text-xs font-semibold text-slate-700 flex-1">Max weight per pickup</span>
                                <div className="flex items-center gap-1.5">
                                  <input type="number" min="0" step="0.5" inputMode="decimal"
                                    value={form.garbageWeight}
                                    onChange={e => patch({ garbageWeight: e.target.value })}
                                    placeholder="0"
                                    className="w-20 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right focus:outline-none focus:ring-2 focus:ring-teal-300"
                                  />
                                  <span className="text-[10px] text-slate-400">kg</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
              {/* Service Days */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <SectionLabel>Service Days *</SectionLabel>
                <p className="text-xs text-slate-400 mb-3">Select the days you provide service. The same time slots (below) apply to every selected day.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                    const on = form.days.includes(d);
                    return (
                      <button key={d} type="button" onClick={() => toggleDay(d)}
                        className={`w-11 h-11 rounded-xl text-xs font-bold border-2 transition-all active:scale-90 ${on ? 'bg-teal-600 border-teal-600 text-white shadow' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 text-[11px] font-semibold">
                  <button type="button" onClick={() => patch({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">Mon–Fri</button>
                  <button type="button" onClick={() => patch({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] })} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">Mon–Sat</button>
                  <button type="button" onClick={() => patch({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">Every day</button>
                  <button type="button" onClick={() => patch({ days: [] })} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Clear</button>
                </div>
              </div>
              {/* Time Slots */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <SectionLabel>Service Time Slots *</SectionLabel>
                <p className="text-xs text-slate-400 mb-3">
                  {form.days.length > 0
                    ? `These time slots apply to: ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter(d => form.days.includes(d)).join(', ')}`
                    : 'Select your service days above, then set the time windows'}
                </p>
                <div className="space-y-2.5">
                  {form.timeSlots.map((slot, idx) => (
                    <motion.div key={slot.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2">
                      {/* Slot number badge */}
                      <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-teal-600">{idx + 1}</span>
                      </div>
                      {/* From */}
                      <div className="flex-1 relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500 pointer-events-none" />
                        <input type="time" value={slot.from}
                          onChange={e => patchSlot(slot.id, 'from', e.target.value)}
                          className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400" />
                      </div>
                      <span className="text-slate-400 text-xs font-bold flex-shrink-0">to</span>
                      {/* To */}
                      <div className="flex-1 relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500 pointer-events-none" />
                        <input type="time" value={slot.to}
                          onChange={e => patchSlot(slot.id, 'to', e.target.value)}
                          className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400" />
                      </div>
                      {/* Remove (only if more than 1) */}
                      {form.timeSlots.length > 1 && (
                        <button type="button" onClick={() => removeSlot(slot.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 hover:bg-red-100 active:scale-90 transition-all">
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
                {/* Add slot button */}
                <button type="button" onClick={addSlot}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-teal-300 rounded-xl text-teal-600 text-sm font-semibold hover:bg-teal-50 active:scale-95 transition-all">
                  <Plus className="w-4 h-4" />
                  Add Time Slot
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ── Create Account ── */}
        <button type="submit" disabled={busy}
          className={`w-full py-4 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-lg text-base disabled:opacity-60 ${isVisitor ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {busy ? 'Please wait…' : 'Create Account'}
        </button>
        <p className="text-center text-sm text-slate-500 pb-2">
          Already have an account?{' '}
          <button type="button" onClick={() => onGoLogin()} className="text-blue-600 font-bold hover:underline">
            Log In
          </button>
        </p>
      </form>
    </div>
  );
};