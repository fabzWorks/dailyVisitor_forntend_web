import React, { useState } from 'react';
import {
  ArrowLeft, MapPin, Calendar, Clock, Star, CheckCircle2,
  Plus, Minus, X, Package, Banknote, CalendarDays, Phone, Loader2, SearchX, Home,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from '../ui/common';
import { toast } from 'sonner';
import { api, avatarFor, to12h, money } from '../../lib/api';
import type { MatchedProvider, SessionUser } from '../../lib/api';
interface RequestServiceProps {
  initialService: string | null;
  user: SessionUser;
  onClose: () => void;
  onRequestSent?: () => void;
}
type Step = 'details' | 'visitors' | 'summary' | 'confirm';
type ServiceType = 'milkman' | 'newspaper' | 'garbage' | '';
// ─── Data ─────────────────────────────────────────────────────────────────────
const SERVICE_OPTIONS = [
  { id: 'milkman',   label: 'Milkman',          icon: '🥛' },
  { id: 'newspaper', label: 'Newspaper',          icon: '📰' },
  { id: 'garbage',   label: 'Garbage Collector',  icon: '🗑️' },
] as const;
const MILK_PRODUCTS = [
  { id: 'cow',    label: 'Cow Milk',   icon: '🐄', unit: 'L',  step: 0.5,  def: 1    },
  { id: 'goat',   label: 'Goat Milk',  icon: '🐐', unit: 'L',  step: 0.5,  def: 0.5  },
  { id: 'camel',  label: 'Camel Milk', icon: '🐪', unit: 'L',  step: 0.5,  def: 0.5  },
  { id: 'cheese', label: 'Cheese',     icon: '🧀', unit: 'kg', step: 0.25, def: 0.25 },
  { id: 'ghee',   label: 'Ghee',       icon: '🧈', unit: 'kg', step: 0.25, def: 0.25 },
];
const NEWSPAPERS = [
  { id: 'dawn',    label: 'Dawn',      lang: 'EN' },
  { id: 'thenews', label: 'The News',  lang: 'EN' },
  { id: 'jang',    label: 'Jang',      lang: 'UR' },
  { id: 'express', label: 'Express',   lang: 'UR' },
  { id: 'tribune', label: 'Tribune',   lang: 'EN' },
  { id: 'geo',     label: 'Geo',       lang: 'UR' },
];
// Time slots are whole hours only (8:00 AM - 9:00 AM). Minutes can not be edited.
const HOUR_STARTS = Array.from({ length: 19 }, (_, i) => i + 4);                 // 4 AM ... 10 PM
const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
const hourValue = (h: number) => `${String(h).padStart(2, '0')}:00`;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};
// ─── Types ─────────────────────────────────────────────────────────────────────
interface DayGroup {
  id: string;
  days: string[];
  from: string;
  to: string;
  milkProducts: string[];
  productQtys: Record<string, number>;
  papers: string[];
  garbageKg: number;
}
const newGroup = (): DayGroup => ({
  id: `g-${Date.now()}`,
  days: [],
  from: '06:00', to: '07:00',
  milkProducts: [],
  productQtys: {},
  papers: [],
  garbageKg: 1,
});
// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ value, step, min = 0, unit, onChange }: {
  value: number; step: number; min?: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center active:scale-90 transition-all">
        <Minus className="w-3 h-3 text-slate-600" />
      </button>
      <span className="text-sm font-bold text-slate-800 min-w-[44px] text-center">{value}{unit}</span>
      <button type="button" onClick={() => onChange(Math.round((value + step) * 100) / 100)}
        className="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center active:scale-90 transition-all">
        <Plus className="w-3 h-3 text-blue-600" />
      </button>
    </div>
  );
}
// ─── Group card ───────────────────────────────────────────────────────────────
function GroupCard({
  group, index, total, service, onChange, onRemove,
}: {
  group: DayGroup; index: number; total: number;
  service: ServiceType;
  onChange: (patch: Partial<DayGroup>) => void;
  onRemove: () => void;
}) {
  const toggleDay = (d: string) =>
    onChange({ days: group.days.includes(d) ? group.days.filter(x => x !== d) : [...group.days, d] });
  const toggleMilk = (id: string) => {
    const next = group.milkProducts.includes(id)
      ? group.milkProducts.filter(x => x !== id)
      : [...group.milkProducts, id];
    const qtys = { ...group.productQtys };
    if (!group.milkProducts.includes(id)) qtys[id] = MILK_PRODUCTS.find(p => p.id === id)!.def;
    else delete qtys[id];
    onChange({ milkProducts: next, productQtys: qtys });
  };
  const togglePaper = (id: string) =>
    onChange({ papers: group.papers.includes(id) ? group.papers.filter(x => x !== id) : [...group.papers, id] });
  const patchQty = (pid: string, qty: number) =>
    onChange({ productQtys: { ...group.productQtys, [pid]: qty } });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">{index + 1}</span>
          </div>
          <span className="text-sm font-bold text-white">
            {group.days.length > 0 ? group.days.join(', ') : 'Select days below'}
          </span>
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
      <div className="p-4 space-y-4">
        {/* ── Day selector ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Select Days *</p>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS.map(d => {
              const on = group.days.includes(d);
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold border-2 transition-all ${on ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-200 text-slate-500 hover:border-blue-300 bg-slate-50'}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        {/* ── Time slot ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Time Slot
          </p>
          <div className="flex items-center gap-2">
            <select
              value={Number(group.from.slice(0, 2))}
              onChange={e => { const h = Number(e.target.value); onChange({ from: hourValue(h), to: hourValue(h + 1) }); }}
              className="flex-1 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {HOUR_STARTS.map(h => <option key={h} value={h}>{hourText(h)}</option>)}
            </select>
            <span className="text-slate-400 text-xs font-bold px-1">to</span>
            <div className="flex-1 py-2.5 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">
              {hourText(Number(group.from.slice(0, 2)) + 1)}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">Whole hours only. One provider serves up to 6 residents in the same hour.</p>
        </div>
        {/* ── Milkman options ── */}
        {service === 'milkman' && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Milk Products *</p>
              <div className="flex flex-wrap gap-2">
                {MILK_PRODUCTS.map(p => {
                  const on = group.milkProducts.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleMilk(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${on ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-slate-50'}`}>
                      {p.icon} {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Quantity steppers */}
            <AnimatePresence>
              {group.milkProducts.length > 0 && (
                <motion.div key="qtys" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Quantities</p>
                  <div className="space-y-2">
                    {MILK_PRODUCTS.filter(p => group.milkProducts.includes(p.id)).map(p => (
                      <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                        <span className="text-base">{p.icon}</span>
                        <span className="text-xs font-semibold text-slate-700 flex-1">{p.label}</span>
                        <Stepper value={group.productQtys[p.id] ?? p.def} step={p.step} unit={p.unit} min={p.step}
                          onChange={qty => patchQty(p.id, qty)} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* ── Newspaper options ── */}
        {service === 'newspaper' && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Newspapers *</p>
            <div className="flex flex-wrap gap-2">
              {NEWSPAPERS.map(n => {
                const on = group.papers.includes(n.id);
                return (
                  <button key={n.id} type="button" onClick={() => togglePaper(n.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${on ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-200 text-slate-600 hover:border-amber-300 bg-slate-50'}`}>
                    📰 {n.label}
                    <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${on ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{n.lang}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* ── Garbage kg ── */}
        {service === 'garbage' && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Estimated Garbage</p>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <span className="text-base">🗑️</span>
              <span className="text-xs font-semibold text-slate-700 flex-1">Weight (approx.)</span>
              <Stepper value={group.garbageKg} step={0.5} unit="kg" min={0.5}
                onChange={kg => onChange({ garbageKg: kg })} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
// ─── Main ──────────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

export const RequestService: React.FC<RequestServiceProps> = ({ initialService, user, onClose, onRequestSent }) => {
  const [step, setStep] = useState<Step>('details');
  const [selectedVisitor, setSelectedVisitor] = useState<number | null>(null);
  // providers that EXACTLY match the requirement (fetched from the database)
  const [providers, setProviders] = useState<MatchedProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [service, setService] = useState<ServiceType>(
    initialService === 'Milkman' ? 'milkman'
    : initialService === 'Newspaper' ? 'newspaper'
    : initialService === 'Garbage Collector' ? 'garbage' : ''
  );
  const [radius, setRadius] = useState('2');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [groups, setGroups] = useState<DayGroup[]>([newGroup()]);
  const [notes, setNotes] = useState('');
  const [formSnapshot, setFormSnapshot] = useState<any>(null);
  const updateGroup = (id: string, patch: Partial<DayGroup>) =>
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  const removeGroup = (id: string) => setGroups(prev => prev.filter(g => g.id !== id));
  const addGroup = () => setGroups(prev => [...prev, newGroup()]);
  const handleDetailsNext = () => {
    if (!service) { toast.error('Please select a service type'); return; }
    const allDays = groups.flatMap(g => g.days);
    if (allDays.length === 0) { toast.error('Select at least one day in a group'); return; }
    for (const g of groups) {
      if (g.days.length === 0) continue;
      if (service === 'milkman' && g.milkProducts.length === 0) {
        toast.error(`Select at least one milk product in group ${groups.indexOf(g) + 1}`); return;
      }
      if (service === 'newspaper' && g.papers.length === 0) {
        toast.error(`Select at least one newspaper in group ${groups.indexOf(g) + 1}`); return;
      }
    }
    const snapshot = { service, radius, startDate, groups, notes };
    setFormSnapshot(snapshot);
    setSelectedVisitor(null);
    setStep('visitors');
    findProviders(snapshot);
  };
  // Ask the backend for providers that match this requirement exactly
  const findProviders = async (snap: any) => {
    setLoadingProviders(true);
    setProviderError(null);
    setProviders([]);
    try {
      const r = await api<{ providers: MatchedProvider[] }>('/api/requests/match', {
        body: {
          residentId: user.id,
          service: snap.service,
          radius: Number(snap.radius),
          startDate: snap.startDate,
          groups: (snap.groups as DayGroup[]).filter(g => g.days.length > 0),
        },
      });
      setProviders(r.providers);
    } catch (err: any) {
      setProviderError(err.message);
    } finally {
      setLoadingProviders(false);
    }
  };
  // Confirm -> saves request in DB and notifies the provider
  const sendRequest = async () => {
    if (!selectedVisitor || !formSnapshot) return;
    setSending(true);
    try {
      await api('/api/requests', {
        body: {
          residentId: user.id,
          providerId: selectedVisitor,
          service: formSnapshot.service,
          startDate: formSnapshot.startDate,
          radius: Number(formSnapshot.radius),
          notes: formSnapshot.notes,
          groups: (formSnapshot.groups as DayGroup[]).filter(g => g.days.length > 0),
        },
      });
      onRequestSent?.();
      setStep('confirm');
      setTimeout(onClose, 2200);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };
  // ── Confirm ──
  if (step === 'confirm') {
    const vis = providers.find(v => v.id === selectedVisitor);
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          {vis ? `${vis.name} has been notified.` : 'The provider has been notified.'} You will get a notification as soon as they accept or reject.
        </p>
        <Button onClick={onClose} className="w-full max-w-xs">Back to Home</Button>
      </div>
    );
  }
  // ── Summary (details of the chosen provider + the requirement) ──
  if (step === 'summary') {
    const vis = providers.find(v => v.id === selectedVisitor);
    const svcLabel = SERVICE_OPTIONS.find(s => s.id === formSnapshot?.service)?.label ?? '';
    const activeGroups: DayGroup[] = (formSnapshot?.groups ?? []).filter((g: DayGroup) => g.days.length > 0);
    const rateOf = (pid: string) => vis?.products.find(p => p.id === (pid === 'ghee' ? 'butter' : pid))?.price;
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm">
          <button onClick={() => setStep('visitors')} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Booking Summary</h1>
            <p className="text-xs text-slate-400">Review before confirming</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
          {/* Provider card */}
          {vis && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img src={avatarFor(vis.name)} alt={vis.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/40" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base">{vis.name}</p>
                  <p className="text-blue-200 text-xs">{vis.serviceLabel}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-blue-200">Service</p>
                  <p className="text-sm font-bold text-white">{svcLabel}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 space-y-1.5">
                {vis.contact && (
                  <p className="flex items-center gap-2 text-xs text-white"><Phone className="w-3.5 h-3.5 text-blue-200" />{vis.contact}</p>
                )}
                {vis.address && (
                  <p className="flex items-center gap-2 text-xs text-white"><Home className="w-3.5 h-3.5 text-blue-200" />{vis.address}</p>
                )}
                {vis.distanceKm != null && (
                  <p className="flex items-center gap-2 text-xs text-white"><MapPin className="w-3.5 h-3.5 text-blue-200" />{vis.distanceKm} km away</p>
                )}
                <p className="flex items-center gap-2 text-xs text-white">
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  Available: {vis.days.join(', ')} · {vis.timeSlots.map(t => `${to12h(t.from)} – ${to12h(t.to)}`).join(', ')}
                </p>
              </div>
            </div>
          )}
          {/* Start date + radius */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4">
            <div className="flex-1 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Start Date</p>
                <p className="text-sm font-bold text-slate-800">
                  {new Date(formSnapshot?.startDate + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="flex-1 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Radius</p>
                <p className="text-sm font-bold text-slate-800">{formSnapshot?.radius} km</p>
              </div>
            </div>
          </div>
          {/* Exact calculation, group by group */}
          {vis && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Exact Calculation · {vis.breakdown.cycleDays} days
              </p>
              <p className="text-[11px] text-slate-400 px-1 -mt-1">
                From {fmtDate(vis.breakdown.startDate)} to {fmtDate(vis.breakdown.endDate)} · counted from the real calendar
              </p>
              {vis.breakdown.groups.map((g, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-xs font-bold text-blue-800 flex-1">{g.days.map(d => FULL_DAYS[d] ?? d).join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">{to12h(g.from)} – {to12h(g.to)}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* how many of each day */}
                    <div className="flex flex-wrap gap-1.5">
                      {g.perDay.map(pd => (
                        <span key={pd.day} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                          <b>{pd.day}</b> × {pd.count}
                        </span>
                      ))}
                      <span className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold">= {g.deliveries} deliveries</span>
                    </div>
                    {/* item lines */}
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                        <span>Item</span><span>Per delivery → {g.deliveries} deliveries</span>
                      </div>
                      {g.lines.map((l, li) => (
                        <div key={li} className="px-3 py-2 border-t border-slate-100">
                          <div className="flex justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800">{l.label}</span>
                            <span className="text-xs font-bold text-slate-900">{money(l.total)}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {l.qty} {l.unit} × Rs. {l.rate} = {money(l.perDelivery)} per delivery
                            {' '}× {g.deliveries} = {money(l.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Per delivery: <b className="text-slate-700">{money(g.perDelivery)}</b></span>
                      <span className="text-emerald-700 font-bold">Subtotal {money(g.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {formSnapshot?.notes?.trim() && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Your notes</p>
              <p className="text-sm text-slate-700">{formSnapshot.notes}</p>
            </div>
          )}
          {/* Grand total */}
          {vis && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total</p>
              </div>
              <div className="p-4 space-y-2">
                {vis.breakdown.groups.length > 1 && vis.breakdown.groups.map((g, i) => (
                  <div key={i} className="flex justify-between text-xs text-slate-600">
                    <span>Group {i + 1} ({g.days.join(', ')})</span><span className="font-semibold">{money(g.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Total deliveries</span><span className="font-semibold">{vis.breakdown.totalDeliveries}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Amount for {vis.breakdown.cycleDays} days</p>
                    <p className="text-[10px] text-slate-400">{fmtDate(vis.breakdown.startDate)} – {fmtDate(vis.breakdown.endDate)}</p>
                  </div>
                  <p className="text-xl font-black text-emerald-700">{money(vis.breakdown.total)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-white border-t border-slate-100 shadow-lg">
          <Button onClick={sendRequest} disabled={sending || !vis}
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700">
            {sending
              ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending…</>
              : <><CheckCircle2 className="w-5 h-5 mr-2" /> Confirm Booking</>}
          </Button>
        </div>
      </div>
    );
  }
  // ── Visitors: ONLY providers from the database that match the requirement exactly ──
  if (step === 'visitors') {
    const svcLabel = SERVICE_OPTIONS.find(s => s.id === formSnapshot?.service)?.label ?? '';
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm">
          <button onClick={() => setStep('details')} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Select Provider</h1>
            <p className="text-xs text-slate-400">{svcLabel} · within {radius} km · matches your requirement</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {loadingProviders && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Finding matching providers…</p>
            </div>
          )}
          {!loadingProviders && providerError && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-3">
                <SearchX className="w-8 h-8 text-red-400" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Something went wrong</p>
              <p className="text-sm text-slate-400 mb-4">{providerError}</p>
              <Button onClick={() => findProviders(formSnapshot)}>Try again</Button>
            </div>
          )}
          {!loadingProviders && !providerError && providers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <SearchX className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700 mb-1">No matching provider found</p>
              <p className="text-sm text-slate-400 mb-4">
                No registered provider offers exactly what you asked for (service, items and time slot within {radius} km).
                Try changing the time, items or radius.
              </p>
              <Button variant="outline" onClick={() => setStep('details')}>Change requirement</Button>
            </div>
          )}
          {!loadingProviders && providers.map((visitor, i) => (
            <motion.div key={visitor.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}>
              <Card onClick={() => { setSelectedVisitor(visitor.id); setStep('summary'); }}
                className="p-4 cursor-pointer transition-all border-2 border-transparent hover:border-blue-300 active:scale-[0.99]">
                <div className="flex gap-3">
                  <img src={avatarFor(visitor.name)} alt={visitor.name} className="w-14 h-14 rounded-full object-cover bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-slate-900 text-sm">{visitor.name}</p>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        Exact match
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">{visitor.serviceLabel}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {visitor.distanceKm != null && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{visitor.distanceKm} km</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {visitor.timeSlots.map(t => `${to12h(t.from)}–${to12h(t.to)}`).join(', ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{visitor.days.join(', ')}</p>
                    {visitor.total > 0 && (
                      <p className="text-xs font-semibold text-blue-700 mt-1">
                        {money(visitor.total)} for {visitor.breakdown.cycleDays} days
                        <span className="text-slate-400 font-normal"> · {visitor.breakdown.totalDeliveries} deliveries</span>
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
  // ── DETAILS ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 pt-10 pb-5 px-5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">New Subscription</h1>
            <p className="text-blue-100 text-xs">Configure your service schedule</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-24">
        {/* ── Service type ── */}
        <SettingsCard title="Service Type *">
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_OPTIONS.map(s => (
              <button key={s.id} type="button"
                onClick={() => {
                  setService(s.id as ServiceType);
                  setGroups([newGroup()]);
                }}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all ${service === s.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-[11px] font-bold text-center leading-tight ${service === s.id ? 'text-blue-700' : 'text-slate-500'}`}>{s.label}</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${service === s.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                  {service === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </SettingsCard>
        {/* ── Radius ── */}
        <SettingsCard title="Search Radius">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setRadius(r => String(Math.max(1, Number(r) - 1)))}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center active:scale-90 transition-all">
                <Minus className="w-4 h-4 text-slate-600" />
              </button>
              <div className="w-20 h-9 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center">
                <span className="text-base font-bold text-blue-700">{radius}</span>
                <span className="text-xs font-semibold text-blue-400 ml-1">km</span>
              </div>
              <button type="button"
                onClick={() => setRadius(r => String(Math.min(50, Number(r) + 1)))}
                className="w-9 h-9 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center active:scale-90 transition-all">
                <Plus className="w-4 h-4 text-blue-600" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-snug">Providers within this distance will be shown</p>
          </div>
        </SettingsCard>
        {/* ── Start Date ── */}
        <SettingsCard title="Start Date">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </SettingsCard>
        {/* ── Day groups ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Schedule Groups
            </p>
            <span className="ml-auto text-xs text-slate-400">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-xs text-slate-400 px-1">
            Each group = a set of days sharing the same time &amp; service details. Add multiple groups for different day combinations.
          </p>
          <AnimatePresence mode="popLayout">
            {groups.map((group, i) => (
              <GroupCard
                key={group.id}
                group={group}
                index={i}
                total={groups.length}
                service={service}
                onChange={patch => updateGroup(group.id, patch)}
                onRemove={() => removeGroup(group.id)}
              />
            ))}
          </AnimatePresence>
          {/* Add group button */}
          <motion.button
            layout
            type="button"
            onClick={addGroup}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-blue-300 rounded-2xl text-blue-600 text-sm font-bold hover:bg-blue-50 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Another Day Group
          </motion.button>
        </div>
        {/* ── Notes ── */}
        <SettingsCard title="Additional Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any specific requirements…"
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[72px] resize-none" />
        </SettingsCard>
      </div>
      <div className="p-4 bg-white border-t border-slate-100 shadow-lg">
        <Button onClick={handleDetailsNext} className="w-full h-12 text-base">
          Find Providers
        </Button>
      </div>
    </div>
  );
};
// ─── Small helpers ─────────────────────────────────────────────────────────────
function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-blue-500 rounded-full" />
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}
