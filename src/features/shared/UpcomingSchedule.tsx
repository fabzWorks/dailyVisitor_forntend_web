'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import type { LiveSubscription } from '@/lib/mappers';
import { to12h } from '@/lib/format';
import {
  occurrencesFrom, groupByDate, prettyDate, phaseOf, dateKey, statusOf, STATUS_STYLE,
} from '@/lib/schedule';
import type { Occurrence, DeliveryMap } from '@/lib/schedule';

interface Props {
  subs: LiveSubscription[];
  deliveries?: DeliveryMap;
  perspective: 'resident' | 'provider';
  onSelect?: (sub: LiveSubscription) => void;
  // optional badge (e.g. out-of-station) for a subscription
  badgeFor?: (sub: LiveSubscription) => { text: string; cls: string } | undefined;
}

type View = 'daily' | 'weekly' | 'monthly' | 'hourly';
const VIEWS: { id: View; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'hourly', label: 'Hourly' },
];
const EMPTY: DeliveryMap = {};
const WEEKDAY_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));           // Monday
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;

export const UpcomingSchedule: React.FC<Props> = ({ subs, deliveries = EMPTY, perspective, onSelect, badgeFor }) => {
  const [view, setView] = useState<View>('daily');
  const [anchor, setAnchor] = useState(() => new Date());            // the day / week / month being looked at
  const [picked, setPicked] = useState<string | null>(null);         // monthly: tapped day
  const now = new Date();
  const todayText = dateKey(now);

  // ── which dates does the current view cover? ────────────────────────────────
  const range = useMemo(() => {
    if (view === 'weekly') return { start: startOfWeek(anchor), days: 7 };
    if (view === 'monthly') {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      return { start: first, days: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() };
    }
    return { start: new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()), days: 1 };
  }, [view, anchor]);

  const visits = useMemo(
    () => occurrencesFrom(subs, range.start, range.days),
    [subs, range]
  );

  // ── move back / forward ─────────────────────────────────────────────────────
  const step = (dir: 1 | -1) => {
    setPicked(null);
    if (view === 'weekly') setAnchor(addDays(anchor, 7 * dir));
    else if (view === 'monthly') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    else setAnchor(addDays(anchor, dir));
  };
  const goToday = () => { setAnchor(new Date()); setPicked(null); };

  const title =
    view === 'monthly'
      ? anchor.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
      : view === 'weekly'
        ? `${range.start.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} – ${addDays(range.start, 6).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
        : prettyDate(dateKey(anchor), now);

  // ── one visit row ───────────────────────────────────────────────────────────
  const VisitRow = ({ o, i }: { o: Occurrence; i: number }) => {
    const s = o.sub;
    const badge = badgeFor?.(s);
    const status = statusOf(o, deliveries, now);
    const live = o.date === todayText && status === 'pending' && phaseOf(o, now) === 'now';
    const st = STATUS_STYLE[status];
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.03 }}
        onClick={() => onSelect?.(s)}
     className={`flex gap-3 p-3 bg-white rounded-xl border shadow-sm ${onSelect ? 'cursor-pointer hover:shadow-md' : ''} ${live ? 'border-green-300' : 'border-slate-100'} ${status === 'skipped' ? 'opacity-60' : ''}`}
      >
        <div className="w-[74px] flex-shrink-0 text-center bg-blue-50 rounded-lg py-1.5 self-start">
          <p className="text-[11px] font-bold text-blue-700 leading-tight">{to12h(o.from)}</p>
          <p className="text-[9px] text-blue-400">to</p>
          <p className="text-[11px] font-bold text-blue-700 leading-tight">{to12h(o.to)}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{s.serviceType}</p>
              <p className="text-xs text-slate-600 truncate">
                {perspective === 'resident' ? s.visitorName : s.residentName}
                <span className="text-slate-400"> · {o.dayName}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
              {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>}
            </div>
          </div>
          {s.details && <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-300" />{s.details}</p>}
          {perspective === 'provider' && s.residentAddress && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-slate-300 flex-shrink-0" />{s.residentAddress}</p>
          )}
        </div>
        {onSelect && <ChevronRight className="w-4 h-4 text-slate-300 self-center flex-shrink-0" />}
      </motion.div>
    );
  };

  const Empty = ({ text }: { text: string }) => (
    <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center">
      <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="font-bold text-slate-900">Nothing scheduled</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
  const emptyText = subs.length === 0
    ? perspective === 'resident' ? 'Request a service and it will appear here once accepted.' : 'Accepted requests will appear here.'
    : 'No services in this period.';

  // ── the 4 views ─────────────────────────────────────────────────────────────
  const renderDaily = () =>
    visits.length === 0 ? <Empty text={emptyText} /> : <div className="space-y-2">{visits.map((o, i) => <VisitRow key={o.key} o={o} i={i} />)}</div>;

  const renderWeekly = () => {
    const byDate = new Map(groupByDate(visits).map(g => [g.date, g.items]));
    return (
      <div className="space-y-4">
        {Array.from({ length: 7 }, (_, i) => dateKey(addDays(range.start, i))).map(d => {
          const items = byDate.get(d) ?? [];
          return (
            <div key={d}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${d === todayText ? 'bg-green-500' : 'bg-blue-400'}`} />
                <h3 className="text-sm font-bold text-slate-700">{prettyDate(d, now)}</h3>
                <span className="text-[11px] text-slate-400">{items.length} {items.length === 1 ? 'service' : 'services'}</span>
              </div>
              {items.length > 0 && (
                <div className="space-y-2 border-l-2 border-slate-100 pl-3 ml-1">
                  {items.map((o, i) => <VisitRow key={o.key} o={o} i={i} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthly = () => {
    const byDate = new Map(groupByDate(visits).map(g => [g.date, g.items]));
    const lead = (range.start.getDay() + 6) % 7;                      // empty cells before the 1st (Monday first)
    const cells: (string | null)[] = [
      ...Array(lead).fill(null),
      ...Array.from({ length: range.days }, (_, i) => dateKey(addDays(range.start, i))),
    ];
    const shown = picked ?? todayText;
    const list = byDate.get(shown) ?? [];
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_HEAD.map(d => <span key={d} className="text-[10px] font-bold text-slate-400 text-center">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const items = byDate.get(d) ?? [];
              const sts = items.map(o => statusOf(o, deliveries, now));
              const isSel = d === shown;
              return (
                <button key={d} onClick={() => setPicked(d)}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center text-xs transition-all ${isSel ? 'bg-blue-600 text-white' : d === todayText ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span className="leading-none">{Number(d.slice(8))}</span>
                  <span className="flex gap-0.5 mt-1 h-1">
                    {sts.includes('completed') && <span className="w-1 h-1 rounded-full bg-green-500" />}
                    {sts.includes('pending') && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                    {sts.includes('missed') && <span className="w-1 h-1 rounded-full bg-red-500" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 justify-center pt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Pending</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Completed</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Missed</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">{prettyDate(shown, now)}</h3>
          {list.length === 0 ? <p className="text-xs text-slate-400">No services on this day.</p>
            : <div className="space-y-2">{list.map((o, i) => <VisitRow key={o.key} o={o} i={i} />)}</div>}
        </div>
      </div>
    );
  };

  const renderHourly = () => {
    const hourOf = (o: Occurrence) => Number(o.from.slice(0, 2));
    const hours = visits.map(hourOf);
    const first = Math.min(6, ...(hours.length ? hours : [6]));
    const last = Math.max(20, ...(hours.length ? hours : [20]));
    return (
      <div className="space-y-1">
        {Array.from({ length: last - first + 1 }, (_, i) => first + i).map(h => {
          const items = visits.filter(o => hourOf(o) === h);
          const isNow = anchor.toDateString() === now.toDateString() && now.getHours() === h;
          return (
            <div key={h} className="flex gap-3">
              <div className="w-12 flex-shrink-0 pt-2 text-right">
                <span className={`text-[11px] font-bold ${isNow ? 'text-green-600' : 'text-slate-400'}`}>{hourLabel(h)}</span>
              </div>
              <div className={`flex-1 min-w-0 border-l-2 pl-3 pb-1 ${isNow ? 'border-green-400' : 'border-slate-100'}`}>
                {items.length === 0
                  ? <div className="h-7" />
                  : <div className="space-y-2 py-1">{items.map((o, i) => <VisitRow key={o.key} o={o} i={i} />)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900">Schedule</h2>
        <p className="text-xs text-slate-400">Pending, completed and missed services</p>
      </div>

      {/* Daily / Weekly / Monthly / Hourly */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-3">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => { setView(v.id); setPicked(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === v.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* previous / label / next */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => step(-1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <button onClick={goToday} className="text-sm font-bold text-slate-800 px-2" title="Back to today">{title}</button>
        <button onClick={() => step(1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {view === 'daily' && renderDaily()}
      {view === 'weekly' && renderWeekly()}
      {view === 'monthly' && renderMonthly()}
      {view === 'hourly' && renderHourly()}
    </div>
  );
};
