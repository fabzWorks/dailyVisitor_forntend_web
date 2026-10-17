import React, { useState, useEffect } from 'react';
import { Bell, Clock, MapPin, CheckCircle2, Circle, ArrowRight, Navigation, LogOut, AlertTriangle, X, CalendarDays, ChevronRight, Package, Loader2 } from 'lucide-react';
import { Card, Badge, Button } from '../ui/common';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { VisitorOosState } from './ScheduleTab';
import type { LiveSubscription } from '../../lib/api';
import { todaysOccurrences, dashboardGroupOf, deliveryKey } from '../../lib/schedule';
import type { DeliveryMap } from '../../lib/schedule';
interface VisitorHomeProps {
  onOpenNotifications: () => void;
  onLogout: () => void;
  outOfStation: VisitorOosState;
  onCancelOos: () => void;
  notifCount?: number;
  onGoToSchedule?: () => void;
  subscriptions?: LiveSubscription[];
  deliveries?: DeliveryMap;
  onArrive?: (subDbId: number, date: string, residentName: string) => Promise<void>;     // "I am arrived"
  onComplete?: (subDbId: number, date: string, residentName: string) => Promise<void>;   // "Service done"
  onNavigate?: (subDbId: number) => void;                                                // opens the Map tab
  userName?: string;
  serviceLabel?: string;
}
const NONE: LiveSubscription[] = [];
const NO_DELIVERIES: DeliveryMap = {};
export const VisitorHome: React.FC<VisitorHomeProps> = ({ onOpenNotifications, onLogout, outOfStation, onCancelOos, notifCount = 0, onGoToSchedule, subscriptions = NONE, deliveries = NO_DELIVERIES, onArrive, onComplete, onNavigate, userName = '', serviceLabel = '' }) => {
  const [busy, setBusy] = useState(false);
  // "now" refreshes every 30 s so services move Upcoming -> Pending -> Delayed
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  // Dashboard = today's services by default (everything else is in the Schedule tab)
  const today = todaysOccurrences(subscriptions, now);
  const isDone = (o: typeof today[number]) => !!deliveries[deliveryKey(o.sub.dbId, o.date)]?.completedAt;
  const open = today.filter(o => !isDone(o));
  const countOf = (g: 'pending' | 'delayed' | 'upcoming') => open.filter(o => dashboardGroupOf(o, now) === g).length;
  // the task to work on: the one running now, else a delayed one, else the next one
  const focus =
    open.find(o => dashboardGroupOf(o, now) === 'pending') ??
    open.find(o => dashboardGroupOf(o, now) === 'delayed') ??
    open.find(o => dashboardGroupOf(o, now) === 'upcoming');
  const focusGroup = focus ? dashboardGroupOf(focus, now) : null;
  const hasArrived = !!(focus && deliveries[deliveryKey(focus.sub.dbId, focus.date)]?.arrivedAt);
  const handleMarkArrived = async () => {
    if (!focus || !onArrive) return;
    setBusy(true);
    await onArrive(focus.sub.dbId, focus.date, focus.sub.residentName);
    setBusy(false);
  };
  const handleCompleteService = async () => {
    if (!focus || !onComplete) return;
    setBusy(true);
    await onComplete(focus.sub.dbId, focus.date, focus.sub.residentName);
    setBusy(false);
  };
  const getOosDecision = (subscriptionId: string) =>
    outOfStation.active ? outOfStation.decisions.find(d => d.subscriptionId === subscriptionId) : undefined;
  const currentDecision = focus ? getOosDecision(focus.sub.id) : undefined;
  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hello, {userName.split(' ')[0] || 'there'} 👋</h1>
          <p className="text-sm text-slate-500 mt-1">{serviceLabel}</p>
        </div>
        <button onClick={onOpenNotifications} className="relative p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {notifCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          ) : (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
          )}
        </button>
      </div>
      {/* OOS Banner (read-only — managed from Schedule tab) */}
      {outOfStation.active && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-red-700 text-sm">Out of Station</span>
            </div>
            <button onClick={onCancelOos} className="text-xs text-red-500 underline">Cancel</button>
          </div>
          <div className="space-y-1.5">
            {outOfStation.decisions.map(d => (
              <div key={d.subscriptionId} className="flex items-center gap-2.5">
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
      )}
      {/* OOS quick-action — only when not active */}
      {!outOfStation.active && onGoToSchedule && (
        <button
          onClick={onGoToSchedule}
          className="w-full flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
        >
          <span className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-red-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Out of Station</p>
            <p className="text-xs text-slate-500">Plan ahead — skip or redirect services</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}
      {/* Today's counts: Pending / Delayed / Upcoming (small boxes) */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: 'pending', label: 'Pending', cls: 'bg-amber-50 border-amber-100 text-amber-700' },
          { id: 'delayed', label: 'Delayed', cls: 'bg-red-50 border-red-100 text-red-700' },
          { id: 'upcoming', label: 'Upcoming', cls: 'bg-blue-50 border-blue-100 text-blue-700' },
        ] as const).map(b => (
          <div key={b.id} className={`px-2 py-2 rounded-xl border text-center ${b.cls}`}>
            <div className="text-lg font-bold leading-tight">{countOf(b.id)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{b.label}</div>
          </div>
        ))}
      </div>
      {/* Current Task */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-slate-900">{focusGroup === 'pending' ? 'Current Task' : focusGroup === 'delayed' ? 'Delayed Task' : 'Next Task'}</h2>
          {focusGroup === 'pending' && !currentDecision && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
          )}
          {focusGroup === 'delayed' && !currentDecision && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Delayed</Badge>
          )}
        </div>
        {focus && currentDecision ? (
          <Card className={`p-5 border flex items-start gap-3 shadow-none ${currentDecision.action === 'skip' ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentDecision.action === 'skip' ? 'bg-red-100' : 'bg-teal-100'}`}>
              {currentDecision.action === 'skip' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <ArrowRight className="w-5 h-5 text-teal-600" />}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{currentDecision.serviceType} — {currentDecision.residentName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentDecision.action === 'skip' ? 'Service paused — you are out of station' : `Assigned to ${currentDecision.alternateName}`}
              </p>
            </div>
          </Card>
        ) : focus ? (
          <Card className={`p-0 overflow-hidden border-0 shadow-lg text-white relative ${focusGroup === 'pending' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-900/5' : focusGroup === 'delayed' ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/5' : 'bg-gradient-to-br from-green-600 to-emerald-700 shadow-green-900/5'}`}>
            <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="p-5 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-blue-100 text-sm font-medium mb-1">{focus.sub.serviceType}</div>
                  <h3 className="text-xl font-bold">{focus.sub.residentName}</h3>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-blue-50">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span className="text-sm font-medium">{focus.sub.visitTime} – {focus.sub.visitEndTime}</span>
                </div>
                <div className="flex items-center gap-3 text-blue-50">
                  <MapPin className="w-4 h-4 opacity-70" />
                  <span className="text-sm font-medium truncate">{focus.sub.residentAddress}</span>
                </div>
                {focus.sub.details && (
                  <div className="flex items-center gap-3 text-blue-50">
                    <Package className="w-4 h-4 opacity-70" />
                    <span className="text-sm font-medium">{focus.sub.details}</span>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                {!hasArrived ? (
                  <div className="flex gap-3">
                    <Button size="sm" variant="outline" className="w-full border-white/30 text-white hover:bg-white/10" onClick={() => onNavigate?.(focus.sub.dbId)}>
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigate
                    </Button>
                    <Button size="sm" disabled={busy} className="w-full bg-white text-blue-600 hover:bg-blue-50" onClick={handleMarkArrived}>
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      I am Arrived
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" disabled={busy} className="w-full bg-green-500 text-white hover:bg-green-600" onClick={handleCompleteService}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Service Done
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-slate-100 border-dashed border-2 border-slate-200 shadow-none flex flex-col items-center justify-center text-center py-10">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-slate-600 font-medium">{today.length === 0 ? 'No services today' : 'All of today’s services are done ✓'}</p>
            <p className="text-slate-400 text-xs mt-1">
              {subscriptions.length === 0 ? 'Accepted requests will show up here' : 'Check the Schedule tab for upcoming days'}
            </p>
            {subscriptions.length > 0 && onGoToSchedule && (
              <Button size="sm" variant="outline" className="mt-3" onClick={onGoToSchedule}>Open Schedule</Button>
            )}
          </Card>
        )}
      </motion.div>
      {/* Today's Timeline — only today's services, sorted by time */}
      <div className="space-y-6">
        <div>
          <h2 className="font-semibold text-slate-900">{"Today's Services"} <span className="text-xs font-normal text-slate-400">· {today.length}</span></h2>
          <p className="text-xs text-slate-400">{now.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {today.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing scheduled for today.</p>
        ) : (
          <div className="relative pl-4 space-y-8 before:content-[''] before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-[2px] before:bg-slate-100">
            {today.map((o, idx) => {
              const done = isDone(o);
              const grp = dashboardGroupOf(o, now);
              const decision = getOosDecision(o.sub.id);
              const badge = done
                ? { text: 'Completed', cls: 'bg-green-100 text-green-700' }
                : grp === 'delayed'
                  ? { text: 'Delayed', cls: 'bg-red-100 text-red-700' }
                  : grp === 'pending'
                    ? { text: 'Pending', cls: 'bg-amber-100 text-amber-700' }
                    : { text: 'Upcoming', cls: 'bg-blue-50 text-blue-600' };
              return (
                <motion.div key={o.key} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + idx * 0.1 }} className="relative pl-6">
                  <div className={`absolute left-[-4px] top-1 w-3 h-3 rounded-full border-2 ${done ? 'bg-green-500 border-green-500' : grp === 'pending' ? 'bg-amber-400 border-amber-400 animate-pulse' : grp === 'delayed' ? 'bg-red-500 border-red-500' : decision ? (decision.action === 'skip' ? 'bg-red-400 border-red-400' : 'bg-teal-400 border-teal-400') : 'bg-white border-slate-300'}`} />
                  <div className={`flex flex-col gap-1 ${done ? 'opacity-70' : ''}`}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-slate-500">{o.sub.visitTime} – {o.sub.visitEndTime}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                    </div>
                    <Card className="p-3 mt-1">
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800 text-sm">{o.sub.residentName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{o.sub.serviceType} · {o.sub.residentAddress}</p>
                          {o.sub.details && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{o.sub.details}</p>}
                        </div>
                        {decision && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${decision.action === 'skip' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                            {decision.action === 'skip' ? 'Paused' : `→ ${decision.alternateName || 'Alt.'}`}
                          </span>
                        )}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      {/* Logout */}
      <div className="mt-8">
        <Button size="sm" variant="outline" className="w-full bg-red-50 text-red-600 hover:bg-red-100" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};
