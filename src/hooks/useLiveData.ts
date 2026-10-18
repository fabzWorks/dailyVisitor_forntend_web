// ============================================================
// useLiveData  -  the REAL data of the logged-in user: notifications + schedule + deliveries
//
// Three TanStack Query queries that ask the backend again every 5 seconds, so a request,
// an "I am arrived" or a note shows up on the other person's screen without refreshing.
// If the backend is not reachable, the last data we had stays on screen (no error flash).
//
// Which notifications were already opened is remembered on this device (store/notificationStore.ts).
// ============================================================
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi, subscriptionsApi, deliveriesApi } from '@/api';
import type { AppNotification, DeliveriesResponse, NotificationsResponse, SessionUser, SubscriptionsResponse } from '@/api/types';
import { toSubscription, type LiveSubscription } from '@/lib/mappers';
import { toDeliveryMap, type DeliveryMap } from '@/lib/schedule';
import { useNotificationStore } from '@/store/notificationStore';
import { queryKeys } from './queryKeys';

const POLL_EVERY_MS = 5000;

// Defined once (outside the hook) so React gets the same empty value every render
const NO_NOTIFICATIONS: Omit<AppNotification, 'isRead'>[] = [];
const NO_SUBSCRIPTIONS: LiveSubscription[] = [];
const NO_DELIVERIES: DeliveryMap = {};
const NO_SEEN: string[] = [];

// "select" turns the backend answer into the shape our screens use
const pickNotifications = (r: NotificationsResponse) => r.notifications;
const pickSubscriptions = (r: SubscriptionsResponse) => r.subscriptions.map(toSubscription);
const pickDeliveries = (r: DeliveriesResponse) => toDeliveryMap(r.deliveries);

export function useLiveData(user: SessionUser) {
  const { id, role } = user;

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(id),
    queryFn: () => notificationsApi.list(id),
    select: pickNotifications,
    refetchInterval: POLL_EVERY_MS,
  });
  const subscriptionsQuery = useQuery({
    queryKey: queryKeys.subscriptions(role, id),
    queryFn: () => subscriptionsApi.list(role, id),
    select: pickSubscriptions,
    refetchInterval: POLL_EVERY_MS,
  });
  const deliveriesQuery = useQuery({
    queryKey: queryKeys.deliveries(role, id),
    queryFn: () => deliveriesApi.list(role, id),
    select: pickDeliveries,
    refetchInterval: POLL_EVERY_MS,
  });

  const rawNotifications = notificationsQuery.data ?? NO_NOTIFICATIONS;
  const seen = useNotificationStore((s) => s.seenByUser[id]) ?? NO_SEEN;
  const markSeen = useNotificationStore((s) => s.markSeen);

  // Adds isRead (true / false) to every notification, using the list of opened ones from this device
  const notifications: AppNotification[] = useMemo(
    () => rawNotifications.map((n) => ({ ...n, isRead: seen.includes(n.id) })),
    [rawNotifications, seen]
  );

  // Called when the notification screen is opened: marks every notification as seen,
  // so the blue dots / counters disappear (a provider's still-pending request keeps its own badge)
  const markAllRead = useCallback(
    () => markSeen(id, rawNotifications.map((n) => n.id)),
    [markSeen, id, rawNotifications]
  );

  return {
    notifications,
    subscriptions: subscriptionsQuery.data ?? NO_SUBSCRIPTIONS,
    deliveries: deliveriesQuery.data ?? NO_DELIVERIES,
    markAllRead,
  };
}
