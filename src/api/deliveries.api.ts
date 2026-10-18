// deliveries.api.ts  -  per-day state of a service (arrived / completed / skipped) + the resident's note + skipping
import { http } from './client';
import { ENDPOINTS, type Role } from './endpoints';
import type { DeliveriesResponse, DeliveryNoteBody, SimpleResponse, SkipServicesBody } from './types';

export const deliveriesApi = {
  list: (role: Role, userId: number) =>
    http<DeliveriesResponse>(ENDPOINTS.deliveries.list(role, userId)),

  saveNote: (deliveryId: number, body: DeliveryNoteBody) =>
    http<SimpleResponse>(ENDPOINTS.deliveries.note(deliveryId), { method: 'POST', body }),

  skip: (body: SkipServicesBody) =>
    http<SimpleResponse>(ENDPOINTS.skips.create, { method: 'POST', body }),
};
