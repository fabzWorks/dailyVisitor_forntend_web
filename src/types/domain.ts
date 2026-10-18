export type UserRole = 'visitor' | 'resident';
export type JobStatus = 'completed' | 'current' | 'upcoming' | 'pending' | 'paused' | 'missed';
export type VisitorStatus = 'Available' | 'On Duty' | 'Busy';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Pending' | 'OutOfStation';

export interface Subscription {
  id: string;
  residentId: string;
  residentName: string;
  residentAddress: string;
  serviceType: string;
  startDate: string;
  schedule: string;
  status: 'Active' | 'Paused' | 'Completed';
  lastPaymentDate?: string;
  nextPaymentDue?: string;
  monthlyRate: number;
  visitorId: string;
  visitorName: string;
  visitorImage: string;
  visitorRating: number;
  visitTime: string;
  visitEndTime: string;
}

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  subscriptionId: string;
}

export interface Job {
  id: string;
  subscriptionId: string;
  title: string;
  residentName: string;
  address: string;
  startTime: string;
  endTime: string;
  status: JobStatus;
  date: string;
  coordinates?: { lat: number; lng: number };
  attendance?: AttendanceStatus;
  type?: string;
  feedback?: { rating: number; comment: string; tags: string[] };
}

export interface VisitorProfile {
  id: string;
  name: string;
  email: string;
  address?: string;
  profession: string;
  status: VisitorStatus;
  rating: number;
  totalJobs: number;
  imageUrl: string;
  geofence: { lat: number; lng: number }[];
  activeSubscriptionId?: string;
}

export interface ResidentProfile {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  outOfStation: { enabled: boolean; startDate?: string; endDate?: string };
}

export interface Neighbour {
  id: string;
  name: string;
  phone: string;
  address: string;
  location: string;
}

export interface VisitorAlternate {
  id: string;
  name: string;
  phone: string;
  profession: string;
  relationship: string;
}

export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  visitorName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  method: 'Cash' | 'Online';
  confirmedByVisitor: boolean;
}

export interface ServiceRequest {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'completed';
  visitorName?: string;
  residentName?: string;
}

export interface VisitorRates {
  milkPerLiter?: number;
  cheesePerKg?: number;
  gheePerKg?: number;
  newspaperPerCopy?: number;
  garbagePerKg?: number;
}

export interface Visitor {
  id: string;
  name: string;
  profession: string;
  rating: number;
  distance: string;
  available: boolean;
  imageUrl: string;
  rates?: VisitorRates;
}

export interface ServiceRequestNotif {
  id: string;
  residentName: string;
  residentAddress: string;
  serviceLabel: string;
  providerName: string;
  providerImage: string;
  startDate: string;
  scheduleGroups: Array<{ days: string[]; from: string; to: string; details?: string }>;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected';

}
