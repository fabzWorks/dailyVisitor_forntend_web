import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, toSubscription } from './api';
import type { AppNotification, ApiSubscription, Delivery, LiveSubscription, SessionUser } from './api';
import { toDeliveryMap } from './schedule';

// FUNCTION: useLiveData
// Gets the REAL data of the logged-in user from the backend: notifications + schedule (subscriptions) + deliveries.
// It asks the backend again every 5 seconds, so a request, an "I am arrived" or a note shows up
// on the other phone without refreshing.
//
// Notifications are NOT stored in the database - the backend builds the list live and every
// item disappears after 24 hours. Which ones were already opened is remembered only on this phone.
export function useLiveData(user: SessionUser) {
  const [rawNotifications, setRawNotifications] = useState<Omit<AppNotification, 'isRead'>[]>([]);
  const [subscriptions, setSubscriptions] = useState<LiveSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const seenKey = `seen_notifications_${user.id}`;
  const [seen, setSeen] = useState<string[]>([]);

  // When the screen opens: read from this phone which notifications were already opened
  useEffect(() => {
    try { setSeen(JSON.parse(localStorage.getItem(seenKey) || '[]')); } catch { setSeen([]); }
  }, [seenKey]);

  // FUNCTION: refresh
  // Asks the backend for the newest notifications, subscriptions and deliveries and saves them.
  // If the backend is not reachable, it keeps showing the old data instead of showing an error.
  const refresh = useCallback(async () => {
    try {
      const [n, s, d] = await Promise.all([
        api<{ notifications: Omit<AppNotification, 'isRead'>[] }>(`/api/notifications/${user.id}`),
        api<{ subscriptions: ApiSubscription[] }>(`/api/subscriptions/${user.role}/${user.id}`),
        api<{ deliveries: Delivery[] }>(`/api/deliveries/${user.role}/${user.id}`),
      ]);
      setRawNotifications(n.notifications);
      setSubscriptions(s.subscriptions.map(toSubscription));
      setDeliveries(d.deliveries);
    } catch {
      /* backend temporarily unreachable – keep showing the last data */
    }
  }, [user.id, user.role]);

  // Load the data once now, then again every 5 seconds (5000 = 5 seconds)
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  // Adds isRead (true / false) to every notification, using the list of opened ones from this phone
  const notifications: AppNotification[] = useMemo(
    () => rawNotifications.map(n => ({ ...n, isRead: seen.includes(n.id) })),
    [rawNotifications, seen]
  );
  // Deliveries as a dictionary, so any delivery can be found quickly by its key
  const deliveryMap = useMemo(() => toDeliveryMap(deliveries), [deliveries]);

  // FUNCTION: markAllRead
  // Called when the notification screen is opened: marks every notification as seen,
  // so the blue dots / counters disappear (a provider's still-pending request keeps its own badge)
  const markAllRead = useCallback(() => {
    const ids = rawNotifications.map(n => n.id);
    const next = Array.from(new Set([...seen, ...ids])).slice(-300);
    setSeen(next);
    try { localStorage.setItem(seenKey, JSON.stringify(next)); } catch { /* ignore */ }
  }, [rawNotifications, seen, seenKey]);

  return { notifications, subscriptions, deliveries: deliveryMap, refresh, markAllRead };
}
