import React, { useMemo } from 'react';
import { ArrowLeft, Star, Clock, Phone, MessageSquare, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, X as XIcon } from 'lucide-react';
import type { AttendanceRecord } from '@/types/domain';
import type { LiveSubscription } from '@/lib/mappers';
import { attendanceOf, ratePerVisit } from '@/lib/schedule';
import type { DeliveryMap } from '@/lib/schedule';
import { toast } from 'sonner';
import { motion } from 'motion/react';
interface ResidentRecordDetailProps {
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
export const ResidentRecordDetail: React.FC<ResidentRecordDetailProps> = ({ subscription, deliveries, onBack }) => {
  const today = new Date();
  const [calYear, setCalYear] = React.useState(today.getFullYear());
  const [calMonth, setCalMonth] = React.useState(today.getMonth()); // 0-indexed, Jan = 0
  // attendance + price of one visit are worked out from the real deliveries (see lib/schedule.ts)
  const activityRecords = useMemo(() => attendanceOf(subscription, deliveries), [subscription, deliveries]);
  const DAILY_RATE = ratePerVisit(subscription);
  // Build a lookup map: date string → status
  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord['status']> = {};
    activityRecords.forEach(r => { map[r.date] = r.status; });
    return map;
  }, [activityRecords]);
  // Stats (treat Late as Present)
  const presentCount = activityRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const absentCount = activityRecords.filter(a => a.status === 'Absent').length;
  const oosCount = activityRecords.filter(a => a.status === 'OutOfStation').length;
  const totalPayment = presentCount * DAILY_RATE;
  // Calendar grid
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calendarCells: { day: number | null; status: DayStatus; dateStr: string }[] = [];
  // Leading empty cells
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
      status = 'future'; // no record = treat as untracked
    }
    calendarCells.push({ day: d, status, dateStr });
  }
  const handleCall = () => toast.info(`Calling ${subscription.residentName}...`);
  const handleMessage = () => toast.info(`Opening chat with ${subscription.residentName}...`);
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const getDayCell = (cell: typeof calendarCells[0]) => {
    if (!cell.day) return <div key={cell.dateStr} />;
    const isToday = cell.status === 'today';
    const isPresent = cell.status === 'present';
    const isAbsent = cell.status === 'absent';
    const isOos = cell.status === 'outofstation';
    const isFuture = cell.status === 'future';
    let bgClass = '';
    let textClass = 'text-slate-700';
    let ringClass = '';
    let icon: React.ReactNode = null;
    if (isToday) {
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
      textClass = 'text-slate-300';
    }
    return (
      <div
        key={cell.dateStr}
        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all ${bgClass} ${textClass} ${ringClass}`}
      >
        <span>{cell.day}</span>
        {icon}
        {isOos && <div className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-1" />}
      </div>
    );
  };
  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Resident Record</h1>
            <p className="text-indigo-100 text-sm">{subscription.serviceType}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMessage}
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
        {/* Resident Info Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white shadow-lg flex-shrink-0">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg">{subscription.residentName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-indigo-200 flex-shrink-0" />
                <span className="text-sm text-indigo-100">{subscription.visitTime}</span>
              </div>
              <p className="text-xs text-indigo-200 mt-1 truncate">{subscription.residentAddress}</p>
              <p className="text-xs text-indigo-300 mt-0.5">
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
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-xs text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-xs text-slate-600">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-xs text-slate-600">Out of Station</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex-shrink-0" />
              <span className="text-xs text-slate-600">Today</span>
            </div>
          </div>
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
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5">
                    {presentCount} × Rs. {DAILY_RATE}
                  </p>
                  <p className="text-sm font-bold text-slate-700">Total Payment</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-700">
                    Rs. {totalPayment.toLocaleString('en-PK')}
                  </span>
                </div>
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
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
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
      </div>
    </div>
  );
};
