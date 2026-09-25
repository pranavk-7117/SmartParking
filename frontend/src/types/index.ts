export type VehicleCategory = 'Car' | 'Scooter';

export type SlotStatus = 'Vacant' | 'Occupied' | 'Deactivated';

export type SessionStatus = 'Active' | 'Completed';

export type UserRole = 'admin';

export interface Site {
  id: string;
  name: string;
  address: string;
  gateInfo: string;
  totalCarSlots: number;
  totalScooterSlots: number;
  defaultCarRate: number;
  defaultScooterRate: number;
  status: 'Active' | 'Coming Soon';
}

export interface AvailabilityData {
  carAvailable: number;
  carTotal: number;
  scooterAvailable: number;
  scooterTotal: number;
  totalAvailable: number;
  totalSlots: number;
  updatedAt: string;
}

export interface ParkingSession {
  id: string;
  siteId: string;
  vehicleNumber: string;
  category: VehicleCategory;
  slotId: string;
  inTime: string;
  outTime?: string | null;
  durationMinutes?: number | null;
  amount?: number | null;
  status: SessionStatus;
  rateApplied?: number;
}

export interface DeactivationEvent {
  id: string;
  slotId: string;
  siteId: string;
  action: 'deactivate' | 'reactivate';
  reason: string;
  actionedBy: string;
  actionedAt: string;
}

export interface ParkingSlot {
  id: string;
  siteId: string;
  category: VehicleCategory;
  locationCode: string;
  status: SlotStatus;
  currentVehicleNumber?: string;
  currentSessionId?: string;
  deactivationReason?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
}

export interface RateItem {
  id: string;
  siteId: string;
  category: VehicleCategory;
  hourlyRate: number;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
}

export interface RateHistoryItem {
  id: string;
  siteId: string;
  date: string;
  category: VehicleCategory;
  oldRate: number;
  newRate: number;
  changedBy: string;
}

export interface ReportDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  count?: number;
}

export interface ReportData {
  type: 'Revenue' | 'Occupancy' | 'Duration' | 'Transactions';
  dataPoints: ReportDataPoint[];
  summary: {
    totalRevenue: number;
    peakOccupancyPct: number;
    avgDurationMinutes: number;
    totalTransactions?: number;
  };
}

export interface SiteReassignmentEvent {
  id: string;
  operatorId: string;
  fromSiteId: string;
  fromSiteName: string;
  toSiteId: string;
  toSiteName: string;
  reassignedBy: string;
  reassignedAt: string;
  reason?: string;
}

export interface OperatorAccount {
  id: string;
  name: string;
  username: string;
  contact: string;
  assignedSiteId: string;
  status: 'Active' | 'Terminated';
  dateAdded: string;
  authMethod: 'Google Account Linked';
  sessionsProcessedCount: number;
  reassignmentHistory: SiteReassignmentEvent[];
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: 'admin';
  status: 'Active' | 'Locked';
  lastLogin: string;
}

export interface QuickAlert {
  id: string;
  siteId?: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  timestamp: string;
  resolved?: boolean;
}