// ============================================================
// outOfStation.ts  -  "I am out of station" state (kept in the resident / visitor stores)
// ============================================================

// ── Resident side ──
export interface ServiceDecision {
  subscriptionId: string;
  serviceType: string;
  visitorName: string;
  visitorImage: string;
  action: 'skip' | 'alternate';
  neighbourId: string | null;
  neighbourName: string | null;
  neighbourPhone: string | null;
}
export interface OutOfStationState {
  active: boolean;
  selectedDates: string[];
  serviceDecisions: ServiceDecision[];
}

// ── Visitor (provider) side ──
export interface VisitorServiceDecision {
  subscriptionId: string;
  serviceType: string;
  residentName: string;
  date: string;
  action: 'skip' | 'alternate';
  alternateId?: string;
  alternateName?: string;
}
export interface VisitorOosState {
  active: boolean;
  decisions: VisitorServiceDecision[];
}
