// subscriptions.api.ts  -  the schedule (accepted requests) + the provider's "arrived" / "done" buttons
import { http } from './client';
import { ENDPOINTS, type Role } from './endpoints';
import type { DeliveryDayBody, SimpleResponse, SubscriptionsResponse } from './types';

export const subscriptionsApi = {
  list: (role: Role, userId: number) =>
    http<SubscriptionsResponse>(ENDPOINTS.subscriptions.list(role, userId)),

  arrive: (subscriptionId: number, body: DeliveryDayBody) =>
    http<SimpleResponse>(ENDPOINTS.subscriptions.arrive(subscriptionId), { method: 'POST', body }),

  complete: (subscriptionId: number, body: DeliveryDayBody) =>
    http<SimpleResponse>(ENDPOINTS.subscriptions.complete(subscriptionId), { method: 'POST', body }),
};
