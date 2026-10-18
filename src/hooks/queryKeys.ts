// ============================================================
// queryKeys.ts  -  the "name tag" TanStack Query uses to remember each piece of server data
//
// All live data of the logged-in person starts with 'live', so after ANY button that
// changes something (arrived, accept, skip ...) one call refreshes everything:
//     queryClient.invalidateQueries({ queryKey: queryKeys.live })
// ============================================================
import type { Role } from '@/api/endpoints';

export const queryKeys = {
  live: ['live'] as const,
  notifications: (userId: number) => ['live', 'notifications', userId] as const,
  subscriptions: (role: Role, userId: number) => ['live', 'subscriptions', role, userId] as const,
  deliveries: (role: Role, userId: number) => ['live', 'deliveries', role, userId] as const,
};
