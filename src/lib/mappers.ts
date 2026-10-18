// ============================================================
// mappers.ts  -  changes backend data into the shape our screens use
//
// Screens never read the raw backend data directly, they always get it from here.
// ============================================================
import type { ApiSubscription } from '@/api/types';
import type { Subscription } from '@/types/domain';
import { avatarFor, to12h } from './format';

// A subscription that came from the database (it has the normal fields + some extra ones)
export type LiveSubscription = Subscription & {
  source: 'db'; details?: string; days: string[]; from: string; to: string;
  dbId: number;                                   // real subscription id in the database
  slotIndex: number;                              // internal 10-minute place (order only, never shown)
  residentLat: number | null; residentLng: number | null;
  providerLat: number | null; providerLng: number | null;
};

// Changes one subscription from the backend into the shape that our screens use.
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
