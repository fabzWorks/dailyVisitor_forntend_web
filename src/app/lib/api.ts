import type { Subscription } from '../data/shared/types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Logged-in user ───────────────────────────────────────────────────────────
export interface SessionUser {
  id: number;
  role: 'resident' | 'provider';
  name: string;
  email: string;
  contact?: string | null;
  address?: string;
  service?: string; // provider only
}

// ─── Small fetch helper ───────────────────────────────────────────────────────
// Talks to the backend. Give it a path like '/api/auth/login' (and a body if you want to send data).
// It sends the request, reads the answer and returns it.
// If the backend says something went wrong, it throws an error with the backend's message,
// so the screens can simply show err.message in a toast.
export async function api<T = any>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err: any = new Error(data.message || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// ─── Types returned by the backend ────────────────────────────────────────────
export interface RequestGroup {
  days: string[];
  from: string;
  to: string;
  details?: string;
}

export interface MatchedProvider {
  id: number;
  name: string;
  email: string;
  contact: string | null;
  gender: string | null;
  service: string;
  serviceLabel: string;
  address: string;
  area: string | null;
  city: string | null;
  distanceKm: number | null;
  products: { id: string; label: string; unit: string; price: number }[];
  newspapers: { id: string; label: string }[];
  servicePrice: number | null;
  days: string[];
  timeSlots: { from: string; to: string }[];
  breakdown: Breakdown;
  total: number;
}

// Exact price calculation (first 30 days from the start date) – computed by the backend
export interface BreakdownLine {
  label: string; qty: number; unit: string; rate: number; perDelivery: number; total: number;
}
export interface BreakdownGroup {
  days: string[]; from: string; to: string;
  perDay: { day: string; count: number }[];
  deliveries: number;
  lines: BreakdownLine[];
  perDelivery: number;
  total: number;
}
export interface Breakdown {
  startDate: string; endDate: string; cycleDays: number;
  groups: BreakdownGroup[];
  totalDeliveries: number;
  total: number;
}

// arrived / completed state of one service on one date (from the backend)
export interface Delivery {
  id: number;
  subscriptionId: number;
  date: string;               // "2026-10-12"
  arrivedAt: string | null;
  completedAt: string | null;
  note: string | null;
  skippedAt: string | null;
}

export interface AppNotification {
  id: string;
  type: 'new_request' | 'request_accepted' | 'request_rejected' | 'provider_arrived' | 'service_done' | 'resident_note' | string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  deliveryId: number | null;       // provider_arrived / service_done / resident_note: which delivery
  note: string | null;             // the resident's extra note (provider_arrived + resident_note)
  request: {
    id: number;
    status: 'pending' | 'accepted' | 'rejected';
    service: string;
    serviceLabel: string;
    startDate: string;
    groups: RequestGroup[];
    total: number;
    notes: string | null;
    resident: { id: number; name: string; contact: string | null; address: string };
    provider: { id: number; name: string; contact: string | null };
  } | null;
}

export interface ApiSubscription {
  id: number;
  requestId: number;
  service: string;
  serviceLabel: string;
  days: string[];
  from: string;
  to: string;
  details: string;
  startDate: string;
  monthlyRate: number;
  status: 'Active' | 'Paused' | 'Completed';
  slotIndex?: number;   // internal 10-minute place inside the hour (0-5) - never shown, only used for order
  resident: { id: number; name: string; contact: string | null; address: string; lat?: number | null; lng?: number | null };
  provider: { id: number; name: string; contact: string | null; lat?: number | null; lng?: number | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Changes a 24 hour time into a 12 hour time.   "14:30" -> "02:30 PM"
export function to12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// The database has no photo column yet, so this makes a small blue picture with the
// person's initials.   "Ali Khan" -> a blue circle with "MA"
export function avatarFor(name: string): string {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='#2563eb'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='46' font-weight='700' fill='white'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// A subscription that came from the database (it has the normal fields + some extra ones)
export type LiveSubscription = Subscription & {
  source: 'db'; details?: string; days: string[]; from: string; to: string;
  dbId: number;                                   // real subscription id in the database
  slotIndex: number;                              // internal 10-minute place (order only, never shown)
  residentLat: number | null; residentLng: number | null;
  providerLat: number | null; providerLng: number | null;
};

// Changes one subscription from the backend into the shape that our screens use.
// (Screens never read the raw backend data directly, they always get it from here.)
export function toSubscription(s: ApiSubscription): LiveSubscription {
  return {
    id: `db-${s.id}`,
    residentId: `db-${s.resident.id}`,
    residentName: s.resident.name,
    residentAddress: s.resident.address,
    serviceType: s.serviceLabel,
    startDate: s.startDate,
    schedule: s.days.join(', '),
    status: s.status,
    monthlyRate: s.monthlyRate,
    visitorId: `db-${s.provider.id}`,
    visitorName: s.provider.name,
    visitorImage: avatarFor(s.provider.name),
    visitorRating: 0,
    visitTime: to12h(s.from),
    visitEndTime: to12h(s.to),
    source: 'db',
    dbId: s.id,
    slotIndex: s.slotIndex ?? 0,
    residentLat: s.resident.lat ?? null,
    residentLng: s.resident.lng ?? null,
    providerLat: s.provider.lat ?? null,
    providerLng: s.provider.lng ?? null,
    details: s.details,
    days: s.days,
    from: s.from,
    to: s.to,
  };
}

// Shows an amount as money.   1540 -> "Rs. 1,540"
export function money(n: number): string {
  return `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

// Shows how long ago something happened.   "Just now", "5m ago", "3h ago", "2d ago"
export function timeAgoFrom(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
