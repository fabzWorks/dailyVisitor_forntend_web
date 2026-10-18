// ============================================================
// residentStore.ts  -  everything the RESIDENT app remembers while it is open
//   (which tab, which overlay screen, out-of-station choices, neighbours)
//
// Used by: features/resident/ResidentApp.tsx
// Backend data (subscriptions, notifications ...) is NOT here - that is TanStack Query (src/hooks).
// ============================================================
import { create } from 'zustand';
import type { LiveSubscription } from '@/lib/mappers';
import type { Neighbour } from '@/types/domain';
import type { OutOfStationState } from '@/types/outOfStation';

export type ResidentTab = 'home' | 'services' | 'schedule' | 'profile';

const emptyOos: OutOfStationState = { active: false, selectedDates: [], serviceDecisions: [] };

interface ResidentUiState {
  activeTab: ResidentTab;
  showRequestFlow: boolean;                    // the "Request a service" screens
  showNotifications: boolean;
  selectedServiceType: string | null;          // service chosen before opening the request flow
  selectedSubscription: LiveSubscription | null; // service whose attendance/payment screen is open
  outOfStation: OutOfStationState;
  neighbours: Neighbour[];
  openProfileAlternates: boolean;              // Profile tab should open its "add alternate" form

  setActiveTab: (tab: ResidentTab) => void;
  openServicesTab: () => void;                 // bottom-nav "Services": tab + close any detail screen
  startRequest: (serviceType?: string) => void;
  closeRequestFlow: () => void;
  viewSubscription: (subscription: LiveSubscription) => void;  // tap a service anywhere -> its detail screen
  selectSubscription: (subscription: LiveSubscription | null) => void;
  goToSchedule: () => void;
  addAlternate: () => void;
  clearOpenProfileAlternates: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  setOutOfStation: (oos: OutOfStationState) => void;
  setNeighbours: (neighbours: Neighbour[]) => void;
  reset: () => void;                           // called on logout
}

const initial = {
  activeTab: 'home' as ResidentTab,
  showRequestFlow: false,
  showNotifications: false,
  selectedServiceType: null,
  selectedSubscription: null,
  outOfStation: emptyOos,
  neighbours: [] as Neighbour[],
  openProfileAlternates: false,
};

export const useResidentStore = create<ResidentUiState>((set) => ({
  ...initial,

  setActiveTab: (activeTab) => set({ activeTab }),
  openServicesTab: () => set({ selectedSubscription: null, activeTab: 'services' }),
  startRequest: (serviceType) =>
    set((s) => ({ selectedServiceType: serviceType || s.selectedServiceType, showRequestFlow: true })),
  closeRequestFlow: () => set({ showRequestFlow: false, selectedServiceType: null }),
  viewSubscription: (selectedSubscription) => set({ selectedSubscription, activeTab: 'services' }),
  selectSubscription: (selectedSubscription) => set({ selectedSubscription }),
  goToSchedule: () => set({ activeTab: 'schedule' }),
  addAlternate: () => set({ openProfileAlternates: true, activeTab: 'profile' }),
  clearOpenProfileAlternates: () => set({ openProfileAlternates: false }),
  openNotifications: () => set({ showNotifications: true }),
  closeNotifications: () => set({ showNotifications: false }),
  setOutOfStation: (outOfStation) => set({ outOfStation }),
  setNeighbours: (neighbours) => set({ neighbours }),
  reset: () => set(initial),
}));
