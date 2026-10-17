import React, { useMemo, useState } from 'react';
import { ArrowLeft, Star, Clock, Trash2, MessageSquare, Phone, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, X as XIcon, Milk, Newspaper, Plus, Minus, Save, AlertTriangle } from 'lucide-react';
import type { AttendanceRecord } from '../../data/shared/types';
import type { LiveSubscription } from '../../lib/api';
import { attendanceOf, ratePerVisit } from '../../lib/schedule';
import type { DeliveryMap } from '../../lib/schedule';
import { Button } from '../ui/common';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
interface ServiceDetailScreenProps {
  subscription: LiveSubscription;
  deliveries: DeliveryMap;      // real arrived / completed data from the backend
  onBack: () => void;
}
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
type DayStatus = 'present' | 'absent' | 'outofstation' | 'today' | 'future' | 'empty';
// ─── Service edit types ───────────────────────────────────────────────────────
interface ServiceEditState {
  quantity: number;
  unit: string;
  variant: string;
  notes: string;
  skip: boolean;
}
const SERVICE_VARIANTS: Record<string, { units: string[]; variants: string[]; defaultQty: number; defaultUnit: string; defaultVariant: string }> = {
  'Milk Delivery': { units: ['L', '½L'], variants: ['Full Cream', 'Low Fat', 'Skimmed'], defaultQty: 1, defaultUnit: 'L', defaultVariant: 'Full Cream' },
  'Newspaper': { units: ['copy'], variants: ['Dawn', 'The News', 'Jang', 'Express', 'Tribune'], defaultQty: 1, defaultUnit: 'copy', defaultVariant: 'Dawn' },
  'Garbage Collection': { units: ['visit'], variants: ['Standard', 'Heavy Load'], defaultQty: 1, defaultUnit: 'visit', defaultVariant: 'Standard' },
};
function getServiceConfig(serviceType: string) {
  return SERVICE_VARIANTS[serviceType] ?? { units: ['unit'], variants: ['Standard'], defaultQty: 1, defaultUnit: 'unit', defaultVariant: 'Standard' };
}
export const ServiceDetailScreen: React.FC<ServiceDetailScreenProps> = ({ subscription, deliveries, onBack }) => {
  const today = new Date();
  const [calYear, setCalYear] = React.useState(today.getFullYear());
  const [calMonth, setCalMonth] = React.useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DayStatus | null>(null);
  const cfg = getServiceConfig(subscription.serviceType);
  const [editState, setEditState] = useState<ServiceEditState>({
    quantity: cfg.defaultQty, unit: cfg.defaultUnit, variant: cfg.defaultVariant, notes: '', skip: false,
  });
  // attendance + price of one visit are worked out from the real deliveries (see lib/schedule.ts)
  const activityRecords = useMemo(() => attendanceOf(subscription, deliveries), [subscription, deliveries]);
  const DAILY_RATE = ratePerVisit(subscription);
  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord['status']> = {};
    activityRecords.forEach(r => { map[r.date] = r.status; });
    return map;
  }, [activityRecords]);
  // Stats — treat Late as Present
  const presentCount = activityRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const absentCount = activityRecords.filter(a => a.status === 'Absent').length;
  const oosCount = activityRecords.filter(a => a.status === 'OutOfStation').length;
  const totalPayment = presentCount * DAILY_RATE;
  // Build calendar cells
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calendarCells: { day: number | null; status: DayStatus; dateStr: string }[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ day: null, status: 'empty', dateStr: '' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const month = String(calMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${calYear}-${month}-${dayStr}`;
    const cellDate = new Date(calYear, calMonth, d);
    const rawStatus = recordMap[dateStr];
    let status: DayStatus;
    if (cellDate > today) {
      status = 'future';
    } else if (cellDate.toDateString() === today.toDateString()) {
      status = 'today';
    } else if (rawStatus === 'Present' || rawStatus === 'Late') {
      status = 'present';
    } else if (rawStatus === 'Absent') {
      status = 'absent';
    } else if (rawStatus === 'OutOfStation') {
      status = 'outofstation';
    } else {
      status = 'future';
    }
    calendarCells.push({ day: d, status, dateStr });
  }
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const handleChat = () => toast.info(`Opening chat with ${subscription.visitorName}...`);
  const handleCall = () => toast.info(`Calling ${subscription.visitorName}...`);
  const handleCancelSubscription = () => {
    toast.error(`Are you sure you want to cancel ${subscription.serviceType}?`, {
      action: {
        label: 'Confirm Cancel',
        onClick: () => toast.success('Subscription cancelled successfully'),
      },
    });
  };
  const handleDayClick = (cell: typeof calendarCells[0]) => {
    if (!cell.day || cell.status === 'empty') return;
    if (selectedDate === cell.dateStr) {
      // deselect
      setSelectedDate(null);
      setSelectedStatus(null);
      return;
    }
    setSelectedDate(cell.dateStr);
    setSelectedStatus(cell.status);
    // Reset edit state for fresh selection
    setEditState({ quantity: cfg.defaultQty, unit: cfg.defaultUnit, variant: cfg.defaultVariant, notes: '', skip: false });
  };
  const getDayCell = (cell: typeof calendarCells[0]) => {
    if (!cell.day) return <div key={`e-${cell.dateStr}`} />;
    const isToday = cell.status === 'today';
    const isPresent = cell.status === 'present';
    const isAbsent = cell.status === 'absent';
    const isOos = cell.status === 'outofstation';
    const isFuture = cell.status === 'future';
    const isSelected = selectedDate === cell.dateStr;
    let bgClass = '';
    let textClass = 'text-slate-700';
    let ringClass = '';
    let icon: React.ReactNode = null;
    if (isSelected) {
      bgClass = 'bg-indigo-600';
      textClass = 'text-white font-bold';
      ringClass = 'ring-2 ring-indigo-300 ring-offset-1';
    } else if (isToday) {
      bgClass = 'bg-blue-600';
      textClass = 'text-white font-bold';
      ringClass = 'ring-2 ring-blue-300 ring-offset-1';
    } else if (isPresent) {
      bgClass = 'bg-green-100';
      textClass = 'text-green-800 font-semibold';
      icon = <CheckCircle2 className="w-2.5 h-2.5 text-green-600 absolute bottom-0.5 right-0.5" />;
    } else if (isAbsent) {
      bgClass = 'bg-red-100';
      textClass = 'text-red-800 font-semibold';
      icon = <XIcon className="w-2.5 h-2.5 text-red-500 absolute bottom-0.5 right-0.5" />;
    } else if (isOos) {
      bgClass = 'bg-blue-100';
      textClass = 'text-blue-800 font-semibold';
    } else if (isFuture) {
      bgClass = 'bg-slate-50';
      textClass = 'text-slate-400';
    }
    return (
      <button
        key={cell.dateStr}
        type="button"
        onClick={() => handleDayClick(cell)}
        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all cursor-pointer active:scale-95 ${bgClass} ${textClass} ${ringClass} ${!isSelected && !isToday ? 'hover:opacity-80' : ''}`}
      >
        <span>{cell.day}</span>
        {icon}
        {isOos && !isSelected && <div className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-1" />}
      </button>
    );
  };
  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Service Provider Record</h1>
            <p className="text-blue-100 text-sm">{subscription.serviceType}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleChat}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={handleCall}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Visitor / Provider Info Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <img
              src={subscription.visitorImage}
              alt={subscription.visitorName}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg">{subscription.visitorName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-4 h-4 text-amber-300 fill-current flex-shrink-0" />
                <span className="text-sm text-blue-100">{subscription.visitorRating > 0 ? subscription.visitorRating : 'No ratings yet'}</span>
                <span className="text-blue-200 text-xs">•</span>
                <Clock className="w-4 h-4 text-blue-200 flex-shrink-0" />
                <span className="text-sm text-blue-100">{subscription.visitTime} – {subscription.visitEndTime}</span>
              </div>
              <p className="text-xs text-blue-200 mt-1 truncate">{subscription.residentAddress}</p>
              <p className="text-xs text-blue-300 mt-0.5">
                Active since {new Date(subscription.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-5 space-y-5 pb-24">
        {/* Attendance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            Attendance Summary
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 bg-green-50 rounded-xl border border-green-100">
              <span className="text-2xl font-bold text-green-700">{presentCount}</span>
              <span className="text-xs font-semibold text-green-600 mt-0.5">Present</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-red-50 rounded-xl border border-red-100">
              <span className="text-2xl font-bold text-red-600">{absentCount}</span>
              <span className="text-xs font-semibold text-red-500 mt-0.5">Absent</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-2xl font-bold text-blue-600">{oosCount}</span>
              <span className="text-xs font-semibold text-blue-500 mt-0.5">Out of Station</span>
            </div>
          </div>
        </motion.div>
        {/* Attendance Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Attendance</h3>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-sm font-semibold text-slate-700 w-28 text-center">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">
                {label}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) =>
              cell.day === null ? (
                <div key={`empty-${i}`} />
              ) : (
                getDayCell(cell)
              )
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
            {[
              { color: 'bg-green-400', label: 'Present' },
              { color: 'bg-red-400', label: 'Absent' },
              { color: 'bg-blue-400', label: 'Out of Station' },
              { color: 'bg-blue-600', label: 'Today' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full ${color} flex-shrink-0`} />
                <span className="text-xs text-slate-600">{label}</span>
              </div>
            ))}
          </div>
          {/* ── Date detail panel ── */}
          <AnimatePresence>
            {selectedDate && selectedStatus && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedDate(null); setSelectedStatus(null); }}
                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                  >
                    <XIcon className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
                {/* Past done day — show what happened */}
                {(selectedStatus === 'present') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3.5 bg-green-50 rounded-xl border border-green-100">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-900">{subscription.serviceType}</p>
                        <p className="text-xs text-green-600">{subscription.visitorName} · {subscription.visitTime}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Done</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Quantity</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">1 {cfg.defaultUnit}</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-semibold">Type</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{cfg.defaultVariant}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedStatus === 'absent' && (
                  <div className="flex items-center gap-3 p-3.5 bg-red-50 rounded-xl border border-red-100">
                    <XIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-800">{subscription.serviceType} — Absent</p>
                      <p className="text-xs text-red-500 mt-0.5">{subscription.visitorName} did not show up</p>
                    </div>
                  </div>
                )}
                {selectedStatus === 'outofstation' && (
                  <div className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                    <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-800">Out of Station</p>
                      <p className="text-xs text-blue-500 mt-0.5">Service was redirected or paused this day</p>
                    </div>
                  </div>
                )}
                {/* Today / future — edit form */}
                {(selectedStatus === 'today' || selectedStatus === 'future') && (
                  <div className="space-y-4 pt-1">
                    <p className="text-xs text-slate-500">Customise your service for this day:</p>
                    {/* Quantity stepper */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-2">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditState(s => ({ ...s, quantity: Math.max(0.5, s.quantity - (cfg.units.includes('½L') ? 0.5 : 1)) }))}
                          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95"
                        >
                          <Minus className="w-4 h-4 text-slate-600" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-2xl font-bold text-slate-900">{editState.quantity}</span>
                          <span className="text-sm text-slate-400 ml-1">{editState.unit}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditState(s => ({ ...s, quantity: s.quantity + (cfg.units.includes('½L') ? 0.5 : 1) }))}
                          className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center hover:bg-blue-200 active:scale-95"
                        >
                          <Plus className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                      {editState.quantity > cfg.defaultQty && (
                        <p className="text-xs text-blue-500 text-center mt-1">
                          +{(editState.quantity - cfg.defaultQty).toFixed(1).replace('.0', '')} {editState.unit} extra
                        </p>
                      )}
                    </div>
                    {/* Variant chips */}
                    {cfg.variants.length > 1 && (
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-2">
                          {subscription.serviceType === 'Newspaper' ? 'Publication' : 'Type'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {cfg.variants.map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEditState(s => ({ ...s, variant: v }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                editState.variant === v
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Notes */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">Special Instructions</label>
                      <textarea
                        value={editState.notes}
                        onChange={e => setEditState(s => ({ ...s, notes: e.target.value }))}
                        placeholder="e.g. Leave at the door, extra cold..."
                        rows={2}
                        className="w-full text-sm p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-300"
                      />
                    </div>
                    {/* Skip toggle + Save */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditState(s => ({ ...s, skip: !s.skip }))}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${editState.skip ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'}`}
                      >
                        {editState.skip ? 'Skipped' : 'Skip this day'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.success(editState.skip
                            ? `Service skipped for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
                            : `Preferences saved for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
                          );
                          setSelectedDate(null);
                          setSelectedStatus(null);
                        }}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {/* Payment Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
        >
          <h3 className="font-bold text-slate-900 mb-4">Payment</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <span className="text-sm font-medium text-slate-700">Present Days</span>
              <span className="text-lg font-bold text-green-700">{presentCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm font-medium text-slate-700">Rate per Visit</span>
              <span className="text-sm font-bold text-slate-900">Rs. {DAILY_RATE}</span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5">
                    {presentCount} × Rs. {DAILY_RATE}
                  </p>
                  <p className="text-sm font-bold text-slate-700">Total Payment</p>
                </div>
                <span className="text-2xl font-bold text-blue-700">
                  Rs. {totalPayment.toLocaleString('en-PK')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Schedule & Rating */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-slate-600">Schedule</span>
            </div>
            <div className="text-lg font-bold text-slate-900">{subscription.schedule}</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-green-600 fill-current" />
              <span className="text-xs text-slate-600">Rating</span>
            </div>
            <div className="text-lg font-bold text-slate-900">{subscription.visitorRating > 0 ? subscription.visitorRating : 'No ratings yet'}</div>
          </div>
        </motion.div>
        {/* Management */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
        >
          <h3 className="font-bold text-slate-900 mb-4">Manage Subscription</h3>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleCancelSubscription}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel Subscription
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
