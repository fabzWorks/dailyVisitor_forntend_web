// notifications.api.ts  -  the notification bar (backend builds it live, items vanish after 24 hours)
import { http } from './client';
import { ENDPOINTS } from './endpoints';
import type { NotificationsResponse } from './types';

export const notificationsApi = {
  list: (userId: number) =>
    http<NotificationsResponse>(ENDPOINTS.notifications.list(userId)),
};
