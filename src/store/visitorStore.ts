// ============================================================
// visitorStore.ts  -  everything the VISITOR (provider) app remembers while it is open
//   (which tab, notification screen, map focus, out-of-station choices, alternates)
//
// Used by: features/visitor/VisitorApp.tsx
// Backend data (subscriptions, notifications ...) is NOT here - that is TanStack Query (src/hooks).
// ============================================================
import { create } from 'zustand';
import type { VisitorAlternate } from '@/types/domain';
import type { VisitorOosState } from '@/types/outOfStation';

export type VisitorTab = 'home' | 'schedule' | 'services' | 'map' | 'profile';

const emptyOos: VisitorOosState = { active: false, decisions: [] };

interface VisitorUiState {
  activeTab: VisitorTab;
  showNotifications: boolean;
  mapFocusSubId: number | null;                // "Navigate" on the dashboard -> Map tab focused on that resident
  outOfStation: VisitorOosState;
  alternates: VisitorAlternate[];
  openProfileAlternates: boolean;              // Profile tab should open its "add alternate" form

  setActiveTab: (tab: VisitorTab) => void;
  goToSchedule: () => void;
  goToMap: (subscriptionDbId: number) => void;
  addAlternate: () => void;
  clearOpenProfileAlternates: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  setOutOfStation: (oos: VisitorOosState) => void;
  cancelOutOfStation: () => void;
  setAlternates: (alternates: VisitorAlternate[]) => void;
  reset: () => void;                           // called on logout
}

const initial = {
  activeTab: 'home' as VisitorTab,
  showNotifications: false,
  mapFocusSubId: null,
  outOfStation: emptyOos,
  alternates: [] as VisitorAlternate[],
  openProfileAlternates: false,
};

export const useVisitorStore = create<VisitorUiState>((set) => ({
  ...initial,

  setActiveTab: (activeTab) => set({ activeTab }),
  goToSchedule: () => set({ activeTab: 'schedule' }),
  goToMap: (mapFocusSubId) => set({ mapFocusSubId, activeTab: 'map' }),
  addAlternate: () => set({ openProfileAlternates: true, activeTab: 'profile' }),
  clearOpenProfileAlternates: () => set({ openProfileAlternates: false }),
  openNotifications: () => set({ showNotifications: true }),
  closeNotifications: () => set({ showNotifications: false }),
  setOutOfStation: (outOfStation) => set({ outOfStation }),
  cancelOutOfStation: () => set({ outOfStation: emptyOos }),
  setAlternates: (alternates) => set({ alternates }),
  reset: () => set(initial),
}));
