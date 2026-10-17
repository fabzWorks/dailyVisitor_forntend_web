import { UpcomingSchedule } from '../shared/UpcomingSchedule';
import type { LiveSubscription } from '../../lib/api';
import type { DeliveryMap } from '../../lib/schedule';
import React, { useState } from 'react';
import {
  Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, ArrowRight, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Subscription, VisitorAlternate } from '../../data/shared/types';
import { Badge } from '../ui/common';
import { toast } from 'sonner';
// ─── Exported types (consumed by VisitorApp + HomeTab) ───────────────────────
export interface VisitorServiceDecision {
  subscriptionId: string;
  serviceType: string;
  residentName: string;
  date: string;
  action: 'skip' | 'alternate';
  alternateId?: string;
  alternateName?: string;
}
export interface VisitorOosState {
  active: boolean;
  decisions: VisitorServiceDecision[];
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
function getScheduleDays(schedule: string) {
  if (schedule === 'Daily') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (schedule === 'Mon-Fri') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  if (schedule === 'Mon-Sat') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (schedule === 'Weekends') return ['Sat', 'Sun'];
  return schedule.split(',').map(d => d.trim());
}
function getServicesForDate(dateStr: string, subs: Subscription[]) {
  const dayName = DAY_LABELS[new Date(dateStr).getDay()];
  return subs.filter(s => s.status === 'Active' && getScheduleDays(s.schedule).includes(dayName));
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}
// ─── Component ────────────────────────────────────────────────────────────────
interface VisitorScheduleProps {
  alternates: VisitorAlternate[];
  outOfStation: VisitorOosState;
  onOosChange: (oos: VisitorOosState) => void;
  onViewClient?: (sub: Subscription) => void;
  subscriptions?: Subscription[];
  deliveries?: DeliveryMap;
  onAddAlternate?: () => void;
}
type OosStep = 'idle' | 'calendar' | 'pick-alternate' | 'success';
export const VisitorSchedule: React.FC<VisitorScheduleProps> = ({
  alternates, outOfStation, onOosChange, onViewClient, subscriptions, deliveries, onAddAlternate,
}) => {
  // `subscriptions` = this provider's accepted requests from the database
  const allSubs = subscriptions ?? [];
  const myClients = allSubs.filter(s => s.status === 'Active');
  const today = todayStr();
  const [oosStep, setOosStep] = useState<OosStep>('idle');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [serviceActions, setServiceActions] = useState<Record<string, 'skip' | 'alternate' | undefined>>({});
  const [serviceAlternateIds, setServiceAlternateIds] = useState<Record<string, string>>({});
  // Mutually-exclusive toggle
  const setAction = (subId: string, action: 'skip' | 'alternate') => {
    setServiceActions(prev => ({ ...prev, [subId]: prev[subId] === action ? undefined : action }));
    if (action === 'skip') {
      setServiceAlternateIds(prev => { const n = { ...prev }; delete n[subId]; return n; });
    }
  };
  const servicesForDay = selectedDate ? getServicesForDate(selectedDate, myClients) : [];
  const alternateServices = servicesForDay.filter(s => serviceActions[s.id] === 'alternate');
  const hasAnyAction = servicesForDay.some(s => serviceActions[s.id]);
  const handleSubmit = () => {
    alternateServices.length > 0 ? setOosStep('pick-alternate') : confirmOos();
  };
  const confirmOos = () => {
    if (!selectedDate) return;
    const decisions: VisitorServiceDecision[] = servicesForDay
      .filter(s => serviceActions[s.id])
      .map(s => {
        const action = serviceActions[s.id]!;
        const alt = alternates.find(a => a.id === serviceAlternateIds[s.id]);
        return { subscriptionId: s.id, serviceType: s.serviceType, residentName: s.residentName, date: selectedDate, action, alternateId: alt?.id, alternateName: alt?.name };
      });
    onOosChange({ active: true, decisions });
    setOosStep('success');
    toast.success('Out of Station confirmed!');
  };
  const handleCancelOos = () => {
    onOosChange({ active: false, decisions: [] });
    setOosStep('idle');
    setSelectedDate(null);
    setServiceActions({});
    setServiceAlternateIds({});
    toast.success('Out of Station cancelled. All services resumed.');
  };
  // Calendar grid cells
  const calendarCells = (() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();
  // ── CALENDAR SCREEN ──────────────────────────────────────────────────────
  if (oosStep === 'calendar') {
    return (
      <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 pt-10 pb-5 px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setOosStep('idle'); setSelectedDate(null); setServiceActions({}); }}
              className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Out of Station</h1>
              <p className="text-red-100 text-xs">Select a day to manage your services</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Calendar card */}
          <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button
                onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="font-bold text-slate-900 text-sm">
                {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <button
                onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 px-2 py-1.5 bg-slate-50">
              {DAY_LABELS.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
              {calendarCells.map((day, i) => {
                if (!day) return <div key={i} />;
                const ds = toDateStr(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                const isToday = ds === today;
                const isSelected = selectedDate === ds;
                const isPast = ds < today;
                return (
                  <button
                    key={i}
                    disabled={isPast}
                    onClick={() => { setSelectedDate(isSelected ? null : ds); setServiceActions({}); setServiceAlternateIds({}); }}
                    className={`mx-auto w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                      isPast ? 'text-slate-200 cursor-not-allowed' :
                      isSelected ? 'bg-red-500 text-white shadow-md' :
                      isToday ? 'bg-red-50 text-red-600 ring-2 ring-red-200' :
                      'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Services table for selected date */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-slate-700">
                    Services on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                {servicesForDay.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No services scheduled for this day</p>
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_56px_80px] border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="text-xs font-bold text-slate-600 uppercase">Service</span>
                      <span className="text-xs font-bold text-red-500 text-center">Skip</span>
                      <span className="text-xs font-bold text-teal-600 text-center">Alternate</span>
                    </div>
                    {servicesForDay.map(sub => (
                      <div key={sub.id} className="grid grid-cols-[1fr_56px_80px] items-center border-b border-slate-50 last:border-0 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{sub.serviceType}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{sub.residentName}</p>
                          <p className="text-[10px] text-slate-400">{sub.visitTime}</p>
                        </div>
                        {/* Skip checkbox */}
                        <div className="flex justify-center">
                          <button
                            onClick={() => setAction(sub.id, 'skip')}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                              serviceActions[sub.id] === 'skip'
                                ? 'bg-red-500 border-red-500'
                                : 'border-slate-200 hover:border-red-300'
                            }`}
                          >
                            {serviceActions[sub.id] === 'skip' && <X className="w-3.5 h-3.5 text-white" />}
                          </button>
                        </div>
                        {/* Alternate checkbox */}
                        <div className="flex justify-center">
                          <button
                            onClick={() => setAction(sub.id, 'alternate')}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                              serviceActions[sub.id] === 'alternate'
                                ? 'bg-teal-500 border-teal-500'
                                : 'border-slate-200 hover:border-teal-300'
                            }`}
                          >
                            {serviceActions[sub.id] === 'alternate' && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Submit */}
          {selectedDate && servicesForDay.length > 0 && (
            <div className="px-4 mt-4">
              <button
                disabled={!hasAnyAction}
                onClick={handleSubmit}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
                  hasAnyAction ? 'bg-red-500 text-white shadow-lg hover:bg-red-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirm Changes
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  // ── PICK-ALTERNATE SCREEN ────────────────────────────────────────────────
  if (oosStep === 'pick-alternate') {
    const allAssigned = alternateServices.every(s => serviceAlternateIds[s.id]);
    return (
      <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 pt-10 pb-5 px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setOosStep('calendar')} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Choose Alternatives</h1>
              <p className="text-teal-100 text-xs">Assign a saved alternative for each service</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alternateServices.map(sub => (
            <div key={sub.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-teal-50 border-b border-teal-100">
                <p className="text-sm font-bold text-teal-900">{sub.serviceType}</p>
                <p className="text-xs text-teal-700">{sub.residentName} · {sub.visitTime}</p>
              </div>
              {alternates.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-500">No saved alternatives. Add one in your Profile tab.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {alternates.map(alt => {
                    const selected = serviceAlternateIds[sub.id] === alt.id;
                    return (
                      <button
                        key={alt.id}
                        onClick={() => setServiceAlternateIds(prev => ({ ...prev, [sub.id]: alt.id }))}
                        className={`w-full flex items-center gap-3 p-3.5 text-left transition-all ${selected ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-teal-200' : 'bg-teal-100'}`}>
                          <span className="text-sm font-bold text-teal-700">
                            {alt.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{alt.name}</p>
                          <p className="text-xs text-slate-500">{alt.phone} · {alt.relationship}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-teal-500 border-teal-500' : 'border-slate-200'}`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 pb-8 flex-shrink-0">
          <button
            onClick={confirmOos}
            disabled={!allAssigned && alternates.length > 0}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
              allAssigned || alternates.length === 0
                ? 'bg-teal-600 text-white shadow-lg hover:bg-teal-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Confirm Assignments
          </button>
        </div>
      </div>
    );
  }
  // ── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (oosStep === 'success') {
    const skipped = outOfStation.decisions.filter(d => d.action === 'skip');
    const redirected = outOfStation.decisions.filter(d => d.action === 'alternate');
    return (
      <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-6 pb-24">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Out of Station Set</h2>
          {selectedDate && (
            <p className="text-sm text-slate-500 mb-6">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
          {skipped.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-3 text-left w-full">
              <p className="text-xs font-bold text-red-700 mb-2 uppercase tracking-wide">Paused</p>
              {skipped.map(d => (
                <p key={d.subscriptionId} className="text-sm text-slate-700">• {d.serviceType} — {d.residentName}</p>
              ))}
            </div>
          )}
          {redirected.length > 0 && (
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-left w-full">
              <p className="text-xs font-bold text-teal-700 mb-2 uppercase tracking-wide">Redirected</p>
              {redirected.map(d => (
                <p key={d.subscriptionId} className="text-sm text-slate-700">• {d.serviceType} → <span className="font-semibold">{d.alternateName}</span></p>
              ))}
            </div>
          )}
          <div className="mt-6 space-y-3 w-full">
            {onAddAlternate && (
              <button
                onClick={onAddAlternate}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Add Alternate
              </button>
            )}
            <button
              onClick={() => setOosStep('idle')}
              className="w-full py-3.5 bg-teal-600 text-white rounded-2xl font-bold text-sm hover:bg-teal-700"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
  // ── MAIN SCHEDULE VIEW ───────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Service Management</h1>
        <p className="text-slate-500 text-sm">Manage your active services</p>
      </div>
      {/* OOS Banner or Button */}
      {outOfStation.active ? (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-red-700 text-sm">Out of Station Active</span>
            </div>
            <button onClick={handleCancelOos} className="text-xs text-red-500 underline">Cancel</button>
          </div>
          <div className="space-y-1">
            {outOfStation.decisions.map(d => (
              <div key={d.subscriptionId} className="flex items-center gap-2.5 py-1.5 border-b border-red-100 last:border-0">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${d.action === 'skip' ? 'bg-red-100' : 'bg-teal-100'}`}>
                  {d.action === 'skip' ? <X className="w-3.5 h-3.5 text-red-600" /> : <ArrowRight className="w-3.5 h-3.5 text-teal-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{d.serviceType} · {d.residentName}</p>
                  {d.action === 'alternate' && d.alternateName && (
                    <p className="text-[10px] text-teal-600">→ {d.alternateName}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${d.action === 'skip' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                  {d.action === 'skip' ? 'Paused' : 'Redirected'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setOosStep('calendar')}
          className="w-full flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
        >
          <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Set Out of Station</p>
            <p className="text-xs text-slate-500">Select a day and manage your services</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}
      {/* Upcoming visits sorted by date, day and time */}
      <UpcomingSchedule
        subs={(subscriptions ?? []) as LiveSubscription[]}
        deliveries={deliveries}
        perspective="provider"
        onSelect={(sub) => onViewClient?.(sub)}
        badgeFor={(sub) => {
          const d = outOfStation.active ? outOfStation.decisions.find(x => x.subscriptionId === sub.id) : undefined;
          if (!d) return undefined;
          return d.action === 'skip'
            ? { text: 'Paused', cls: 'bg-red-100 text-red-700' }
            : { text: `→ ${d.alternateName || 'Alternate'}`, cls: 'bg-teal-100 text-teal-700' };
        }}
      />
    </div>
  );
};
