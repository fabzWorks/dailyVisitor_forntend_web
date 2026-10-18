// ============================================================
// notificationStore.ts  -  which notifications this person already opened
//
// Notifications themselves are NOT stored (the backend builds them live and they vanish
// after 24 hours). Only the ids of the opened ones are remembered, on this device,
// so the blue "unread" dots disappear. Saved in localStorage by zustand's persist.
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const KEEP_LAST = 300;   // never remember more than 300 ids per person

interface NotificationState {
  seenByUser: Record<number, string[]>;                   // { userId: [notificationId, ...] }
  markSeen: (userId: number, ids: string[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      seenByUser: {},
      markSeen: (userId, ids) =>
        set((state) => {
          const before = state.seenByUser[userId] ?? [];
          const merged = Array.from(new Set([...before, ...ids])).slice(-KEEP_LAST);
          return { seenByUser: { ...state.seenByUser, [userId]: merged } };
        }),
    }),
    { name: 'seen_notifications' }
  )
);
