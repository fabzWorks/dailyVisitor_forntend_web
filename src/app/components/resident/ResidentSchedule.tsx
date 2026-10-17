import React, { useState } from 'react';
import {
  Calendar as CalendarIcon, ChevronRight, AlertTriangle, ArrowRight, MapPin,
  Clock, ChevronLeft, X, Phone, CheckCircle2, SkipForward, Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { UpcomingSchedule } from '../shared/UpcomingSchedule';
import { occurrencesFrom, deliveryKey } from '../../lib/schedule';
import type { DeliveryMap } from '../../lib/schedule';
import type { LiveSubscription } from '../../lib/api';
import type { Neighbour } from '../../data/shared/types';
import { Badge, Button } from '../ui/common';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export interface ServiceDecision {
  subscriptionId: string;
  serviceType: string;
  visitorName: string;
  visitorImage: string;
  action: 'skip' | 'alternate';
  neighbourId: string | null;
  neighbourName: string | null;
  neighbourPhone: string | null;
}
export interface OutOfStationState {
  active: boolean;
  selectedDates: string[];
  serviceDecisions: ServiceDecision[];
}

interface ResidentScheduleProps {
  onViewSubscription?: (subscription: LiveSubscription) => void;
  outOfStation?: OutOfStationState;
  onOutOfStationChange?: (oos: OutOfStationState) => void;
  neighbours?: Neighbour[];
  onAddAlternate?: () => void;
  liveSubscriptions?: LiveSubscription[];
  deliveries?: DeliveryMap;
  residentId?: number;                          // logged-in resident (needed to save a skip)
  onRefresh?: () => void | Promise<void>;       // reloads data from the backend after saving
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatOosDates(dates: string[]): string {
  if (dates.length === 0) return 'No dates selected';
  const sorted = [...dates].sort();
  const formatted = sorted.map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  });
  if (formatted.length <= 4) return formatted.join(', ');
  return `${formatted.slice(0, 3).join(', ')} + ${formatted.length - 3} more`;
}

type OosStep = 'idle' | 'calendar' | 'pick-alternate' | 'confirm-skip' | 'oos-success';
const EMPTY_SUBS: LiveSubscription[] = [];

export const ResidentSchedule: React.FC<ResidentScheduleProps> = ({
  onViewSubscription,
  outOfStation,
  onOutOfStationChange,
  neighbours = [],
  onAddAlternate,
  liveSubscriptions = EMPTY_SUBS,
  deliveries,
  residentId,
  onRefresh,
}) => {
  // Real subscriptions (accepted requests) come from the database
  const mySubscriptions = liveSubscriptions;

  const [oosStep, setOosStep] = useState<OosStep>('idle');
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [oosPickedDates, setOosPickedDates] = useState<string[]>([]);

  // Per-service action: 'skip' | 'alternate' | undefined
  const [serviceActions, setServiceActions] = useState<Record<string, 'skip' | 'alternate' | undefined>>({});
  // Per-service selected neighbour (for alternate services)
  const [serviceNeighbours, setServiceNeighbours] = useState<Record<string, string>>({});

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const toggleDate = (dateStr: string) => {
    if (dateStr < todayStr) return;
    setOosPickedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const prevCalMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextCalMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const buildCalendarCells = () => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: { day: number | null; dateStr: string }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: '' });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  };

  const setAction = (subId: string, action: 'skip' | 'alternate') => {
    setServiceActions(prev => ({
      ...prev,
      [subId]: prev[subId] === action ? undefined : action,
    }));
    // Clear neighbour if switching away from alternate
    if (action !== 'alternate') {
      setServiceNeighbours(prev => { const n = { ...prev }; delete n[subId]; return n; });
    }
  };

  const alternateServices = mySubscriptions.filter(s => serviceActions[s.id] === 'alternate');

  // ─── SKIP LOGIC ──────────────────────────────────────────────────────────
  // Visits that REALLY happen on the picked dates (only these can be skipped)
  const visitsOnPicked = oosPickedDates.flatMap(d =>
    occurrencesFrom(mySubscriptions, new Date(d + 'T00:00:00'), 1)
  );
  // Services that have at least one visit on the picked dates (these are the table rows)
  const servicesOnPicked = mySubscriptions.filter(s => visitsOnPicked.some(v => v.sub.id === s.id));
  // Visits the resident ticked "Skip" for (visits that are already skipped are ignored)
  const skipVisits = visitsOnPicked.filter(
    v => serviceActions[v.sub.id] === 'skip' && !deliveries?.[deliveryKey(v.sub.dbId, v.date)]?.skippedAt
  );

  // Submit -> go to the confirm screen
  const handleSubmit = () => {
    if (skipVisits.length === 0) {
      toast.info('Tick Skip for at least one service');
      return;
    }
    setOosStep('confirm-skip');
  };

  // Confirm -> save in the database, reload data, show success
  const confirmSkip = async () => {
    if (!residentId) { toast.error('Please log in again'); return; }
    setSaving(true);
    try {
      await api('/api/skips', {
        body: {
          residentId,
          items: skipVisits.map(v => ({ subscriptionId: v.sub.dbId, date: v.date })),
        },
      });
      await onRefresh?.();            // reload deliveries so "Skipped" shows everywhere
      setOosStep('oos-success');
    } catch (err: any) {
      toast.error(err.message || 'Could not skip. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // (used by the Alternate flow - not part of Skip)
  const confirmOos = () => {
    const decisions: ServiceDecision[] = mySubscriptions
      .filter(s => serviceActions[s.id] === 'skip' || serviceActions[s.id] === 'alternate')
      .map(s => {
        const action = serviceActions[s.id]!;
        const nbId = action === 'alternate' ? (serviceNeighbours[s.id] ?? null) : null;
        const nb = nbId ? neighbours.find(n => n.id === nbId) : null;
        return {
          subscriptionId: s.id,
          serviceType: s.serviceType,
          visitorName: s.visitorName,
          visitorImage: s.visitorImage,
          action,
          neighbourId: nbId,
          neighbourName: nb?.name ?? null,
          neighbourPhone: nb?.phone ?? null,
        };
      });
    onOutOfStationChange?.({
      active: true,
      selectedDates: oosPickedDates,
      serviceDecisions: decisions,
    });
    setOosStep('oos-success');
  };

  const handleDone = () => {
    setOosStep('idle');
    setOosPickedDates([]);
    setServiceActions({});
    setServiceNeighbours({});
  };

  const handleCancelOos = () => {
    onOutOfStationChange?.({ active: false, selectedDates: [], serviceDecisions: [] });
    toast.success('Out of Station cancelled. Services resumed.');
  };

  // ─── CALENDAR SCREEN ─────────────────────────────────────────────────────
  if (oosStep === 'calendar') {
    const calendarCells = buildCalendarCells();
    const anyActionSet = servicesOnPicked.some(s => serviceActions[s.id]);
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button
            onClick={() => { setOosStep('idle'); setOosPickedDates([]); setServiceActions({}); setServiceNeighbours({}); }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Out of Station</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Calendar card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 max-w-[290px] mx-auto w-full">
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevCalMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="font-bold text-sm text-slate-900">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextCalMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DAY_LABELS.map((l, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-0.5">{l}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarCells.map((cell, i) => {
                if (!cell.day) return <div key={`e-${i}`} />;
                const isPast = cell.dateStr < todayStr;
                const isToday = cell.dateStr === todayStr;
                const isSelected = oosPickedDates.includes(cell.dateStr);
                let cls = 'h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all select-none ';
                if (isPast) cls += 'text-slate-300 cursor-default';
                else if (isSelected) cls += 'bg-red-500 text-white font-bold shadow-sm cursor-pointer';
                else if (isToday) cls += 'bg-blue-50 text-blue-700 ring-1 ring-blue-400 font-bold cursor-pointer';
                else cls += 'text-slate-700 hover:bg-red-50 hover:text-red-700 cursor-pointer';
                return (
                  <div key={cell.dateStr} className={cls} onClick={() => !isPast && toggleDate(cell.dateStr)}>
                    {cell.day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
              <span className="text-xs text-slate-500">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-100 ring-2 ring-blue-400" />
              <span className="text-xs text-slate-500">Today</span>
            </div>
          </div>

          {/* Selected date chips — animate in */}
          {oosPickedDates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 rounded-2xl border border-red-200 p-3.5"
            >
              <p className="text-xs font-bold text-red-700 mb-2">
                Selected: {oosPickedDates.length} {oosPickedDates.length === 1 ? 'day' : 'days'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...oosPickedDates].sort().map(d => (
                  <span
                    key={d}
                    onClick={() => toggleDate(d)}
                    className="px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 select-none"
                  >
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    <X className="w-3 h-3 opacity-80" />
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* No services on the picked dates */}
          {oosPickedDates.length > 0 && servicesOnPicked.length === 0 && (
            <p className="text-xs text-slate-500 px-1">No services on the selected dates.</p>
          )}

          {/* Services table — only the services that happen on the picked dates */}
          {servicesOnPicked.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Table header */}
              <div className="grid grid-cols-[1fr_56px_80px] gap-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Service</span>
                <span className="text-xs font-bold text-slate-500 text-center">Skip</span>
                <span className="text-xs font-bold text-blue-600 text-center">Alternate</span>
              </div>

              {/* Service rows */}
              <div className="divide-y divide-slate-100">
                {servicesOnPicked.map(sub => {
                  const action = serviceActions[sub.id];
                  const myVisits = visitsOnPicked.filter(v => v.sub.id === sub.id);
                  const allSkipped = myVisits.every(v => deliveries?.[deliveryKey(v.sub.dbId, v.date)]?.skippedAt);
                  return (
                    <div key={sub.id} className="grid grid-cols-[1fr_56px_80px] gap-0 px-4 py-3 items-center">
                      {/* Service info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={sub.visitorImage}
                          alt={sub.visitorName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 leading-tight truncate">{sub.serviceType}</p>
                          <p className="text-[11px] text-slate-500 truncate">{sub.visitorName}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {myVisits.map(v => `${v.dayName} ${Number(v.date.slice(8))}`).join(', ')}
                            {allSkipped ? ' · already skipped' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Skip checkbox */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          disabled={allSkipped}
                          onClick={() => setAction(sub.id, 'skip')}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            action === 'skip'
                              ? 'bg-red-500 border-red-500'
                              : 'border-slate-300 hover:border-red-400 bg-white'
                          } ${allSkipped ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          {action === 'skip' && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </button>
                      </div>

                      {/* Alternate checkbox (disabled for now - we only work on Skip) */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          className="w-6 h-6 rounded-md border-2 border-slate-300 bg-white flex items-center justify-center opacity-40 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend for columns */}
              <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-red-500 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 leading-tight">Skip — the visitor will not come on these days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-blue-300 flex-shrink-0" />
                  <span className="text-[11px] text-slate-400 leading-tight">Alternate — coming soon</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Submit button — only when dates are selected */}
        {oosPickedDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0 space-y-2"
          >
            {anyActionSet && (
              <p className="text-xs text-center text-slate-500">
                {skipVisits.length} {skipVisits.length === 1 ? 'visit' : 'visits'} will be skipped
              </p>
            )}
            <Button
              onClick={handleSubmit}
              className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
            >
              Submit
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  // ─── CONFIRM SKIP SCREEN ──────────────────────────────────────────────────
  if (oosStep === 'confirm-skip') {
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button
            onClick={() => setOosStep('calendar')}
            disabled={saving}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Confirm Skip</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-red-50 rounded-2xl border border-red-200 p-3.5">
            <p className="text-xs font-bold text-red-700 mb-1">These services will be skipped</p>
            <p className="text-xs text-red-600">The visitor will be notified and will not come on these days.</p>
          </div>

          {skipVisits.map(v => (
            <div key={v.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
              <img src={v.sub.visitorImage} alt="" className="w-9 h-9 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{v.sub.serviceType}</p>
                <p className="text-xs text-slate-500">
                  {v.sub.visitorName} · {v.dayName}, {formatOosDates([v.date])}
                </p>
              </div>
              <Badge className="bg-red-50 text-red-600 border-0 text-xs">Skip</Badge>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0 space-y-2">
          <Button
            onClick={confirmSkip}
            disabled={saving}
            className="w-full h-12 text-base bg-red-600 hover:bg-red-700"
          >
            {saving ? 'Saving...' : 'Confirm Skip'}
          </Button>
          <Button
            onClick={() => setOosStep('calendar')}
            disabled={saving}
            className="w-full h-11 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  // ─── PICK ALTERNATE SCREEN ────────────────────────────────────────────────
  if (oosStep === 'pick-alternate') {
    const canConfirm = alternateServices.every(s => serviceNeighbours[s.id]);
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button onClick={() => setOosStep('calendar')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Select Alternate</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2">
          {/* Dates summary */}
          <div className="bg-red-50 rounded-2xl border border-red-200 p-3.5">
            <p className="text-xs font-bold text-red-700 mb-1">Out of Station Days</p>
            <p className="text-sm font-semibold text-red-900">{formatOosDates(oosPickedDates)}</p>
          </div>

          {neighbours.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-blue-300" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">No Saved Alternates</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Go to Profile → Neighbours to add neighbours first.
              </p>
            </div>
          ) : (
            alternateServices.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Service header */}
                <div className="flex items-center gap-3 p-4 bg-blue-50 border-b border-blue-100">
                  <img src={sub.visitorImage} alt={sub.visitorName} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{sub.serviceType}</p>
                    <p className="text-xs text-slate-500">{sub.visitorName}</p>
                  </div>
                  <Badge className="ml-auto bg-blue-100 text-blue-700 border-0 text-xs">Select Alternate</Badge>
                </div>

                {/* Neighbour options */}
                <div className="divide-y divide-slate-100">
                  {neighbours.map(nb => {
                    const isSelected = serviceNeighbours[sub.id] === nb.id;
                    return (
                      <button
                        key={nb.id}
                        type="button"
                        onClick={() => setServiceNeighbours(prev => ({ ...prev, [sub.id]: nb.id }))}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Radio dot */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-600">
                            {nb.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{nb.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">{nb.phone}</span>
                          </div>
                          {nb.location && nb.location !== nb.address && (
                            <span className="text-[10px] text-blue-600 font-semibold">{nb.location}</span>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0">
          <Button
            onClick={confirmOos}
            disabled={!canConfirm && neighbours.length > 0}
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (oosStep === 'oos-success') {
    const skipList = mySubscriptions.filter(s => serviceActions[s.id] === 'skip');
    const altList = mySubscriptions.filter(s => serviceActions[s.id] === 'alternate');
    return (
      <div className="h-full bg-slate-50 flex flex-col">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm flex-shrink-0">
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Out of Station Set</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center pt-6 pb-4"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">All Done!</h2>
            <p className="text-sm text-slate-500 text-center max-w-xs">Your selected services are now marked as skipped.</p>
          </motion.div>

          {/* Dates */}
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
            <p className="text-xs font-bold text-red-700 mb-1">Skipped Days</p>
            <p className="text-sm font-semibold text-red-900">{formatOosDates(oosPickedDates)}</p>
          </div>

          {/* Skipped services */}
          {skipList.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Skipped Services</p>
              </div>
              <div className="divide-y divide-slate-100">
                {skipList.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <img src={s.visitorImage} alt={s.visitorName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{s.serviceType}</p>
                      <p className="text-xs text-slate-500">{s.visitorName}</p>
                    </div>
                    <Badge className="ml-auto bg-slate-100 text-slate-600 border-0 text-xs">Skipped</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternate services */}
          {altList.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Redirected to Alternate</p>
              </div>
              <div className="divide-y divide-slate-100">
                {altList.map(s => {
                  const nbId = serviceNeighbours[s.id];
                  const nb = nbId ? neighbours.find(n => n.id === nbId) : null;
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <img src={s.visitorImage} alt={s.visitorName} className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{s.serviceType}</p>
                        <p className="text-xs text-slate-500">{s.visitorName}</p>
                        {nb && (
                          <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                            <ArrowRight className="w-3 h-3" />
                            {nb.name} · {nb.phone}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-blue-50 text-blue-600 border-0 text-xs flex-shrink-0">Alternate</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {skipList.length === 0 && altList.length === 0 && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">No services were skipped — all services will run as normal.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0 space-y-2">
          {onAddAlternate && (
            <Button
              onClick={onAddAlternate}
              className="w-full h-11 text-sm bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Add Alternate
            </Button>
          )}
          <Button onClick={handleDone} className="w-full h-12 text-base bg-green-600 hover:bg-green-700">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ─── NORMAL SCHEDULE VIEW ─────────────────────────────────────────────────
  // visits that are not skipped (used by the two counters)
  const notSkipped = (v: { sub: LiveSubscription; date: string }) =>
    !deliveries?.[deliveryKey(v.sub.dbId, v.date)]?.skippedAt;

  return (
    <div className="p-6 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-slate-500 text-sm">All upcoming services by date and time</p>
      </div>

      {/* OOS banner or button */}
      {outOfStation?.active ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-red-700 text-sm">Out of Station Active</span>
            </div>
            <button onClick={handleCancelOos} className="text-xs text-red-500 underline font-medium">Cancel</button>
          </div>
          <p className="text-xs text-red-600 mb-3">{formatOosDates(outOfStation.selectedDates)}</p>

          {outOfStation.serviceDecisions.length === 0 ? (
            <div className="p-2.5 bg-white rounded-xl border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">All services running normally — no actions set.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {outOfStation.serviceDecisions.map(d => (
                <div key={d.subscriptionId} className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-red-100">
                  <img src={d.visitorImage} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{d.serviceType}</p>
                    {d.action === 'alternate' && d.neighbourName ? (
                      <p className="text-[11px] text-blue-600 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />{d.neighbourName}
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-600">Paused</p>
                    )}
                  </div>
                  <Badge className={`text-[10px] border-0 flex-shrink-0 ${
                    d.action === 'alternate' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {d.action === 'alternate' ? 'Neighbour' : 'Paused'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <button
          onClick={() => setOosStep('calendar')}
          className="w-full flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-red-300 hover:bg-red-50/30 transition-all text-left"
        >
          <span className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-4 h-4 text-red-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Out of Station</p>
            <p className="text-xs text-slate-500">Select days and manage your services</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-700">{mySubscriptions.length}</div>
          <div className="text-xs text-blue-600">Subscriptions</div>
        </div>
        <div className="p-3 bg-green-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-700">{occurrencesFrom(mySubscriptions, new Date(), 1).filter(notSkipped).length}</div>
          <div className="text-xs text-green-600">Today</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-700">{occurrencesFrom(mySubscriptions, new Date(), 7).filter(notSkipped).length}</div>
          <div className="text-xs text-purple-600">Next 7 days</div>
        </div>
      </div>

      {/* Upcoming visits sorted by date, day and time */}
      <UpcomingSchedule
        subs={mySubscriptions}
        deliveries={deliveries}
        perspective="resident"
        onSelect={(sub) => onViewSubscription?.(sub)}
        badgeFor={(sub) => {
          const d = outOfStation?.active ? outOfStation.serviceDecisions.find(x => x.subscriptionId === sub.id) : undefined;
          if (!d) return undefined;
          return d.action === 'alternate'
            ? { text: 'Neighbour', cls: 'bg-blue-50 text-blue-600' }
            : { text: 'Paused', cls: 'bg-red-50 text-red-600' };
        }}
      />
    </div>
  );
};