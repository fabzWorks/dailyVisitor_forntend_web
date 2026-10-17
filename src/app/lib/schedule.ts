// ============================================================
// schedule.ts  -  works out WHICH services happen on WHICH date
//
// A subscription says: "Mon, Wed  07:00-08:00, starts 5 Oct".
// We turn it into real visits:  Mon 5 Oct 07:00, Wed 7 Oct 07:00, Mon 12 Oct 07:00 ...
//
//   todaysOccurrences()  -> used by the DASHBOARDS (only today)
//   occurrencesFrom()    -> used by the SCHEDULE tabs (many days, sorted)
// ============================================================
import type { LiveSubscription, Delivery } from './api';
import type { AttendanceRecord } from '../data/shared/types';


export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // JavaScript: 0 = Sunday

// One visit = one subscription on one date
export interface Occurrence {
  key: string;          // unique id for React lists
  date: string;         // "2026-10-05"
  dayName: string;      // "Mon"
  from: string;         // "07:00"  (24 hour)
  to: string;           // "08:00"
  sub: LiveSubscription;
}

// FUNCTION: dateKey
// Turns a JavaScript Date into plain text.   Date(5 Oct 2026) -> "2026-10-05"
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// FUNCTION: toMinutes
// Turns a time into minutes since midnight, so two times are easy to compare.   "07:30" -> 450
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// FUNCTION: occurrencesFrom
// Makes the list of real visits for the next `numberOfDays` days (starting from `start`).
// It checks every day and every subscription, keeps only the services that really happen on that day,
// and sorts the list by date and then by time.
export function occurrencesFrom(subs: LiveSubscription[], start: Date, numberOfDays: number): Occurrence[] {
  const visits: Occurrence[] = [];

  for (let i = 0; i < numberOfDays; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateText = dateKey(date);
    const dayName = DAY_NAMES[date.getDay()];

    for (const sub of subs) {
      if (sub.status !== 'Active') continue;                  // paused / completed
      if (dateText < sub.startDate) continue;                 // service has not started yet
      if (!sub.days.includes(dayName)) continue;              // not a service day

      visits.push({ key: `${sub.id}-${dateText}`, date: dateText, dayName, from: sub.from, to: sub.to, sub });
    }
  }

  // sort: earlier date first, then earlier start time, then earlier end time
  visits.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.from !== b.from) return toMinutes(a.from) - toMinutes(b.from);
    if (a.to !== b.to) return toMinutes(a.to) - toMinutes(b.to);
    return a.sub.slotIndex - b.sub.slotIndex;        // same hour -> the resident who joined first is visited first
  });
  return visits;
}

// FUNCTION: todaysOccurrences
// Gives only today's visits. The dashboards (home screens) use this.
export function todaysOccurrences(subs: LiveSubscription[], now: Date = new Date()): Occurrence[] {
  return occurrencesFrom(subs, now, 1);
}

// Is a visit still coming, happening right now, or already over?
export type Phase = 'upcoming' | 'now' | 'passed';
// FUNCTION: phaseOf
// Tells if a visit of today has not started yet ('upcoming'), is running now ('now') or is over ('passed').
export function phaseOf(visit: Occurrence, now: Date = new Date()): Phase {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes >= toMinutes(visit.to)) return 'passed';
  if (nowMinutes >= toMinutes(visit.from)) return 'now';
  return 'upcoming';
}

// FUNCTION: groupByDate
// Puts the visits under their date, so the screen can show one heading per day.
// Result looks like: [{ date: "2026-10-05", items: [...] }, { date: "2026-10-06", items: [...] }]
export function groupByDate(visits: Occurrence[]): { date: string; items: Occurrence[] }[] {
  const groups: { date: string; items: Occurrence[] }[] = [];
  for (const visit of visits) {
    const last = groups[groups.length - 1];
    if (last && last.date === visit.date) last.items.push(visit);   // visits are already sorted by date
    else groups.push({ date: visit.date, items: [visit] });
  }
  return groups;
}

// FUNCTION: prettyDate
// Makes a date easy to read.  "Today · Monday, 5 Oct"  /  "Tomorrow · ..."  /  "Wednesday, 7 Oct"
export function prettyDate(dateText: string, now: Date = new Date()): string {
  const date = new Date(dateText + 'T00:00:00');
  const label = date.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (dateText === dateKey(now)) return `Today · ${label}`;
  if (dateText === dateKey(tomorrow)) return `Tomorrow · ${label}`;
  return label;
}

// ─── Delivery status (pending / completed / missed) ──────────────────────────
// deliveries come from the backend: one row per service per date once the provider
// has tapped "I am arrived" or "Service done".
export type DeliveryMap = Record<string, Delivery>;           // key = "<subscription db id>|<date>"

// FUNCTION: deliveryKey
// Makes the small text that is used to find one delivery.   (subscription 4, "2026-10-05") -> "4|2026-10-05"
export const deliveryKey = (subDbId: number, date: string) => `${subDbId}|${date}`;

export const isSkipped = (visit: Occurrence, deliveries: DeliveryMap) =>
  !!deliveries[deliveryKey(visit.sub.dbId, visit.date)]?.skippedAt;
// FUNCTION: toDeliveryMap
// Changes the list of deliveries from the backend into a "dictionary", so we can find any delivery quickly
// by its key (see deliveryKey above) instead of searching the whole list again and again.
export function toDeliveryMap(list: Delivery[]): DeliveryMap {
  const map: DeliveryMap = {};
  for (const d of list) map[deliveryKey(d.subscriptionId, d.date)] = d;
  return map;
}



export type DeliveryStatus = 'pending' | 'completed' | 'missed' | 'skipped';

// FUNCTION: statusOf
// Tells the status of one visit:
//   completed = provider tapped "Service done"
//   missed    = the day is over and it was never completed
//   pending   = everything else (today not done yet, or in the future)
export function statusOf(visit: Occurrence, deliveries: DeliveryMap, now: Date = new Date()): DeliveryStatus {
  if (deliveries[deliveryKey(visit.sub.dbId, visit.date)]?.skippedAt) return 'skipped';
  if (visit.date < dateKey(now)) return 'missed';
  return 'pending';
}

export const STATUS_STYLE: Record<DeliveryStatus, { text: string; cls: string }> = {
   
  pending:   { text: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
  completed: { text: 'Completed', cls: 'bg-green-100 text-green-700' },
  missed:    { text: 'Missed',    cls: 'bg-red-100 text-red-700' },
  skipped:   { text: 'Skipped',   cls: 'bg-slate-200 text-slate-600' },
};

// Dashboard split of today's NOT-completed services:
//   upcoming = its hour has not started   pending = its hour is running now   delayed = its hour is over
export type DashboardGroup = 'upcoming' | 'pending' | 'delayed';
// FUNCTION: dashboardGroupOf
// Decides in which box of the dashboard a visit of today is shown (upcoming / pending / delayed).
export function dashboardGroupOf(visit: Occurrence, now: Date = new Date()): DashboardGroup {
  const phase = phaseOf(visit, now);
  return phase === 'upcoming' ? 'upcoming' : phase === 'now' ? 'pending' : 'delayed';
}

// ─── Attendance + payment (worked out from the REAL deliveries) ──────────────

// FUNCTION: attendanceOf
// Makes the attendance list of ONE service, using only real data:
//   - provider tapped "Service done" on that day  -> 'Present'
//   - the day is over and he never did it         -> 'Absent'
//   - today (not done yet) and future days        -> not in the list
export function attendanceOf(sub: LiveSubscription, deliveries: DeliveryMap, now: Date = new Date()): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = dateKey(now);
  const start = new Date(sub.startDate + 'T00:00:00');

  for (let i = 0; i < 400; i++) {                       // look at most 400 days back (keeps it fast)
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateText = dateKey(date);
    if (dateText >= today) break;                       // only the days that are already over
    if (!sub.days.includes(DAY_NAMES[date.getDay()])) continue;   // not a service day
    if (deliveries[deliveryKey(sub.dbId, dateText)]?.skippedAt) continue;
    const done = deliveries[deliveryKey(sub.dbId, dateText)]?.completedAt;
    records.push({ date: dateText, status: done ? 'Present' : 'Absent', subscriptionId: sub.id });
  }

  
  // today counts as 'Present' only after the provider tapped "Service done"
  if (today >= sub.startDate && sub.days.includes(DAY_NAMES[now.getDay()])) {
    if (deliveries[deliveryKey(sub.dbId, today)]?.completedAt) {
      records.push({ date: today, status: 'Present', subscriptionId: sub.id });
    }
  }
  return records;
}

// FUNCTION: ratePerVisit
// Price of ONE visit.  The monthly price is shared equally between all the visits of the 30 day period
// (same 30 days that the backend uses for the price).   Rs. 1540 for 14 visits -> Rs. 110 per visit
export function ratePerVisit(sub: LiveSubscription): number {
  const start = new Date(sub.startDate + 'T00:00:00');
  let visits = 0;
  for (let i = 0; i < 30; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (sub.days.includes(DAY_NAMES[date.getDay()])) visits++;
  }
  return visits === 0 ? 0 : Math.round((sub.monthlyRate / visits) * 100) / 100;
}
