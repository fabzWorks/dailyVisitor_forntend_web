// ============================================================
// types.ts  -  the shape of the data going TO and coming FROM the backend
//
// Part 1: data the backend sends us   (SessionUser, MatchedProvider, AppNotification ...)
// Part 2: data we send to the backend (the *Body types)
// Part 3: whole responses             (the *Response types)
// ============================================================

// ───────────────────────── Part 1: data we receive ─────────────────────────

// The logged-in person
export interface SessionUser {
  id: number;
  role: 'resident' | 'provider';
  name: string;
  email: string;
  contact?: string | null;
  address?: string;
  service?: string; // provider only
}

// One group of days + time window the resident asked for
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

// arrived / completed state of one service on one date
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

// ───────────────────────── Part 2: data we send ─────────────────────────

export interface LoginBody {
  email: string;
  password: string;
}

// Fields that resident AND provider signup both send
export interface SignupBaseBody {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  contact: string;
  latitude: number;
  longitude: number;
  country: string;
  province: string;
  city: string;
  area: string;
  address: string;
}

export type ResidentSignupBody = SignupBaseBody;

export interface ProviderSignupBody extends SignupBaseBody {
  service: string;                                   // 'milkman' | 'garbage' | 'newspaper'
  servicePrice?: number;                             // newspaper: per copy, garbage: per kg
  products?: { name: string; price: number }[];      // milkman only
  newspapers?: string[];                             // newspaper only
  weight?: number;                                   // garbage only (max kg per pickup)
  days: string[];
  timeSlots: { from: string; to: string }[];
}

// Used by both "match" and "create request"
// (each group may carry extra fields like milk quantities - the backend reads what it needs)
export interface RequirementBody {
  residentId: number;
  service: string;
  startDate: string;
  radius: number;
  groups: RequestGroup[];
}
export type MatchProvidersBody = RequirementBody;
export interface CreateRequestBody extends RequirementBody {
  providerId: number;
  notes?: string;
}

export interface RespondToRequestBody {
  providerId: number;
  action: 'accept' | 'reject';
}

// "I am arrived" and "Service done" send the same thing
export interface DeliveryDayBody {
  providerId: number;
  date: string;               // "2026-10-12"
}

export interface DeliveryNoteBody {
  residentId: number;
  note: string;
}

export interface SkipServicesBody {
  residentId: number;
  items: { subscriptionId: number; date: string }[];
}

// ───────────────────────── Part 3: whole responses ─────────────────────────

export interface AuthResponse { user: SessionUser }
export interface MatchProvidersResponse { providers: MatchedProvider[] }
export interface CreateRequestResponse { requestId: number }
export interface RespondToRequestResponse { status: 'accepted' | 'rejected' }
export interface NotificationsResponse { notifications: Omit<AppNotification, 'isRead'>[] }
export interface SubscriptionsResponse { subscriptions: ApiSubscription[] }
export interface DeliveriesResponse { deliveries: Delivery[] }
// endpoints that only say "it worked"
export interface SimpleResponse { success: boolean; message?: string }
