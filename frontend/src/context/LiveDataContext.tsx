import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  Site,
  AvailabilityData,
  ParkingSlot,
  ParkingSession,
  DeactivationEvent,
  RateItem,
  RateHistoryItem,
  OperatorAccount,
  QuickAlert,
  VehicleCategory,
  SlotStatus,
} from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// ─── API response shapes ─────────────────────────────────────────────────────

interface ApiSite {
  id: string;
  name: string;
  address: string;
  gateInfo: string;
  totalCarSlots: number;
  totalScooterSlots: number;
  defaultCarRate: number;
  defaultScooterRate: number;
  status: string;
  code: string;
}

interface ApiSlot {
  id: string;
  siteId: string;
  category: string;
  locationCode: string;
  status: string;
  currentVehicleNumber?: string;
  currentSessionId?: string;
  deactivationReason?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
}

interface ApiSession {
  id: string;
  siteId: string;
  siteName: string;
  vehicleNumber: string;
  category: string;
  slotId: string;
  inTime: string;
  outTime?: string | null;
  durationMinutes?: number | null;
  amount?: number | null;
  rateApplied?: number;
  status: string;
}

interface ApiRate {
  id: string;
  siteId: string;
  category: string;
  hourlyRate: number;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
}

interface ApiRateHistory {
  id: string;
  siteId: string;
  date: string;
  category: string;
  oldRate: number;
  newRate: number;
  changedBy: string;
}

interface ApiOperator {
  id: string;
  name: string;
  username: string;
  contact: string;
  assignedSiteId: string;
  assignedSiteName: string;
  status: string;
  dateAdded: string;
  authMethod: string;
  sessionsProcessedCount: number;
  reassignmentHistory: {
    id: string;
    operatorId: string;
    fromSiteId: string;
    fromSiteName: string;
    toSiteId: string;
    toSiteName: string;
    reassignedBy: string;
    reassignedAt: string;
    reason?: string;
  }[];
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapSite(a: ApiSite): Site {
  return {
    id: a.id,
    name: a.name,
    address: a.address,
    gateInfo: a.gateInfo,
    totalCarSlots: a.totalCarSlots,
    totalScooterSlots: a.totalScooterSlots,
    defaultCarRate: a.defaultCarRate,
    defaultScooterRate: a.defaultScooterRate,
    status: a.status === 'Active' ? 'Active' : 'Coming Soon',
  };
}

function mapSlot(a: ApiSlot): ParkingSlot {
  return {
    id: a.id,
    siteId: a.siteId,
    category: (a.category === 'CAR' || a.category === 'Car') ? 'Car' : 'Scooter',
    locationCode: a.locationCode,
    status: (a.status === 'VACANT' || a.status === 'Vacant')
      ? 'Vacant'
      : (a.status === 'OCCUPIED' || a.status === 'Occupied')
      ? 'Occupied'
      : 'Deactivated',
    currentVehicleNumber: a.currentVehicleNumber,
    currentSessionId: a.currentSessionId,
    deactivationReason: a.deactivationReason,
    deactivatedAt: a.deactivatedAt,
    deactivatedBy: a.deactivatedBy,
  };
}

function mapSession(a: ApiSession): ParkingSession {
  return {
    id: a.id,
    siteId: a.siteId,
    vehicleNumber: a.vehicleNumber,
    category: (a.category === 'Car' || a.category === 'CAR') ? 'Car' : 'Scooter',
    slotId: a.slotId,
    inTime: a.inTime,
    outTime: a.outTime,
    durationMinutes: a.durationMinutes,
    amount: a.amount,
    status: a.status === 'Active' || a.status === 'ACTIVE' ? 'Active' : 'Completed',
    rateApplied: a.rateApplied,
  };
}

function mapRate(a: ApiRate): RateItem {
  return {
    id: a.id,
    siteId: a.siteId,
    category: (a.category === 'CAR' || a.category === 'Car') ? 'Car' : 'Scooter',
    hourlyRate: a.hourlyRate,
    lastUpdatedAt: a.lastUpdatedAt,
    lastUpdatedBy: a.lastUpdatedBy,
  };
}

function mapRateHistory(a: ApiRateHistory): RateHistoryItem {
  return {
    id: a.id,
    siteId: a.siteId,
    date: a.date,
    category: (a.category === 'CAR' || a.category === 'Car') ? 'Car' : 'Scooter',
    oldRate: a.oldRate,
    newRate: a.newRate,
    changedBy: a.changedBy,
  };
}

function mapOperator(a: ApiOperator): OperatorAccount {
  return {
    id: a.id,
    name: a.name,
    username: a.username,
    contact: a.contact,
    assignedSiteId: a.assignedSiteId,
    status: a.status === 'Active' ? 'Active' : 'Terminated',
    dateAdded: a.dateAdded,
    authMethod: 'Google Account Linked',
    sessionsProcessedCount: a.sessionsProcessedCount,
    reassignmentHistory: (a.reassignmentHistory ?? []).map((r) => ({
      id: r.id,
      operatorId: r.operatorId,
      fromSiteId: r.fromSiteId,
      fromSiteName: r.fromSiteName,
      toSiteId: r.toSiteId,
      toSiteName: r.toSiteName,
      reassignedBy: r.reassignedBy,
      reassignedAt: r.reassignedAt,
      reason: r.reason,
    })),
  };
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface LiveDataContextType {
  sites: Site[];
  currentSiteId: string;
  currentSite: Site;
  setCurrentSiteId: (siteId: string) => void;
  addSite: (site: Omit<Site, 'id'>) => Promise<Site>;
  availability: AvailabilityData;
  allSlots: ParkingSlot[];
  slots: ParkingSlot[];
  allSessions: ParkingSession[];
  sessions: ParkingSession[];
  rates: RateItem[];
  rateHistory: RateHistoryItem[];
  deactivationEvents: DeactivationEvent[];
  operators: OperatorAccount[];
  alerts: QuickAlert[];
  isFacilityFull: boolean;
  hasRecentUpdate: boolean;
  isLoading: boolean;
  // Kept for compatibility — simulation removed, these are no-ops
  simulationActive: boolean;
  setSimulationActive: (active: boolean) => void;
  toggleFacilityFullSimulation: () => void;
  simulateEntry: (category?: VehicleCategory) => void;
  simulateExit: (category?: VehicleCategory) => void;
  updateSlotStatus: (slotId: string, status: SlotStatus, deactivationReason?: string) => void;
  reassignSlotCategory: (slotId: string, newCategory: VehicleCategory) => void;
  addSlot: (slot: Omit<ParkingSlot, 'currentVehicleNumber' | 'currentSessionId'>) => boolean;
  updateRate: (category: VehicleCategory, newRate: number, adminName: string) => void;
  addOperator: (operatorData: { name: string; username: string; contact: string; assignedSiteId: string }) => void;
  reassignOperatorSite: (operatorId: string, newSiteId: string, reason?: string) => void;
  terminateOperator: (operatorId: string) => void;
  dismissAlert: (alertId: string) => void;
  refresh: () => void;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

const FALLBACK_SITE: Site = {
  id: '',
  name: 'Loading...',
  address: '',
  gateInfo: '',
  totalCarSlots: 0,
  totalScooterSlots: 0,
  defaultCarRate: 0,
  defaultScooterRate: 0,
  status: 'Active',
};

export const LiveDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isKioskRoute = location.pathname.startsWith('/display');

  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteIdState] = useState<string>(() => {
    return localStorage.getItem('sp_selected_site') || 'site-hadapsar';
  });

  const setCurrentSiteId = useCallback((id: string) => {
    localStorage.setItem('sp_selected_site', id);
    setCurrentSiteIdState(id);
  }, []);

  const [allSlots, setAllSlots] = useState<ParkingSlot[]>([]);
  const [allSessions, setAllSessions] = useState<ParkingSession[]>([]);
  const [allRates, setAllRates] = useState<RateItem[]>([]);
  const [allRateHistory, setAllRateHistory] = useState<RateHistoryItem[]>([]);
  const [deactivationEvents, setDeactivationEvents] = useState<DeactivationEvent[]>([]);
  const [operators, setOperators] = useState<OperatorAccount[]>([]);
  const [alerts, setAlerts] = useState<QuickAlert[]>([]);
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false);
  const [isFacilityFull] = useState(false);
  const [simulationActive] = useState(false);
  const refreshRef = useRef(0);

  const triggerFlash = useCallback(() => {
    setHasRecentUpdate(true);
    const t = setTimeout(() => setHasRecentUpdate(false), 800);
    return () => clearTimeout(t);
  }, []);

  // ── Load all data from API ──────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [sitesRaw, slotsRaw, sessionsRaw, ratesRaw, rateHistoryRaw, operatorsRaw] =
        await Promise.all([
          api.get<ApiSite[]>('/sites'),
          api.get<ApiSlot[]>('/slots'),
          api.get<ApiSession[]>('/sessions'),
          api.get<ApiRate[]>('/rates'),
          api.get<ApiRateHistory[]>('/rates/history'),
          api.get<ApiOperator[]>('/operators'),
        ]);

      const mappedSites = sitesRaw.map(mapSite);
      setSites(mappedSites);
      setAllSlots(slotsRaw.map(mapSlot));
      setAllSessions(sessionsRaw.map(mapSession));
      setAllRates(ratesRaw.map(mapRate));
      setAllRateHistory(rateHistoryRaw.map(mapRateHistory));
      setOperators(operatorsRaw.map(mapOperator));

      // Preserve 'all' view or user-selected site; default to AeroPark Hadapsar if available
      setCurrentSiteIdState((prev) => {
        if (prev === 'all') return 'all';
        if (prev && mappedSites.some((s) => s.id === prev)) return prev;
        const saved = localStorage.getItem('sp_selected_site');
        if (saved === 'all') return 'all';
        if (saved && mappedSites.some((s) => s.id === saved)) return saved;
        const hadapsar = mappedSites.find((s) => s.id === 'site-hadapsar');
        return hadapsar?.id ?? mappedSites[0]?.id ?? '';
      });
    } catch (err) {
      console.error('[LiveData] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load + periodic real-time sync every 5s + immediate re-sync on tab focus
  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      loadAll();
      triggerFlash();
    }, 5_000);

    const handleFocus = () => {
      loadAll();
      triggerFlash();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadAll, triggerFlash, refreshRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    refreshRef.current += 1;
    loadAll();
    triggerFlash();
  }, [loadAll, triggerFlash]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const ALL_SITES_META: Site = useMemo(() => {
    const totalCars = sites.reduce((sum, s) => sum + (s.totalCarSlots || 0), 0);
    const totalScooters = sites.reduce((sum, s) => sum + (s.totalScooterSlots || 0), 0);
    return {
      id: 'all',
      name: 'All Parking Sites (Combined)',
      address: `${sites.length} Active Parking Facilities`,
      gateInfo: 'Network-wide Multi-Site Overview',
      totalCarSlots: totalCars,
      totalScooterSlots: totalScooters,
      defaultCarRate: 30,
      defaultScooterRate: 15,
      status: 'Active',
    };
  }, [sites]);

  const currentSite = useMemo(() => {
    if (currentSiteId === 'all') return ALL_SITES_META;
    return sites.find((s) => s.id === currentSiteId) || sites[0] || FALLBACK_SITE;
  }, [sites, currentSiteId, ALL_SITES_META]);

  const slots = useMemo(() => {
    if (currentSiteId === 'all') return allSlots;
    return allSlots.filter((s) => s.siteId === currentSiteId);
  }, [allSlots, currentSiteId]);

  const sessions = useMemo(() => {
    if (currentSiteId === 'all') return allSessions;
    return allSessions.filter((s) => s.siteId === currentSiteId);
  }, [allSessions, currentSiteId]);

  const rates = useMemo(() => {
    if (currentSiteId === 'all') return allRates;
    return allRates.filter((r) => r.siteId === currentSiteId);
  }, [allRates, currentSiteId]);

  const rateHistory = useMemo(() => {
    if (currentSiteId === 'all') return allRateHistory;
    return allRateHistory.filter((rh) => rh.siteId === currentSiteId);
  }, [allRateHistory, currentSiteId]);

  const availability: AvailabilityData = useMemo(() => {
    const carSlots = slots.filter((s) => s.category === 'Car');
    const scooterSlots = slots.filter((s) => s.category === 'Scooter');
    const carAvailable = carSlots.filter((s) => s.status === 'Vacant').length;
    const scooterAvailable = scooterSlots.filter((s) => s.status === 'Vacant').length;
    return {
      carAvailable,
      carTotal: carSlots.length,
      scooterAvailable,
      scooterTotal: scooterSlots.length,
      totalAvailable: carAvailable + scooterAvailable,
      totalSlots: slots.length,
      updatedAt: new Date().toISOString(),
    };
  }, [slots]);

  // ── Mutations (call API then refresh local state) ──────────────────────────

  const addSite = useCallback(
    async (newSiteData: Omit<Site, 'id'>): Promise<Site> => {
      const created = await api.post<ApiSite>('/sites', newSiteData);
      const site = mapSite(created);

      // Re-fetch all sites and newly auto-generated slots so state is 100% in sync
      try {
        const [updatedSites, updatedSlots] = await Promise.all([
          api.get<ApiSite[]>('/sites'),
          api.get<ApiSlot[]>('/slots'),
        ]);
        setSites(updatedSites.map(mapSite));
        setAllSlots(updatedSlots.map(mapSlot));
      } catch (err) {
        console.error('[LiveData] Failed to reload slots after addSite:', err);
        setSites((prev) => [...prev, site]);
      }

      setCurrentSiteId(site.id);
      triggerFlash();
      return site;
    },
    [triggerFlash]
  );

  const updateSlotStatus = useCallback(
    (slotId: string, status: SlotStatus, deactivationReason?: string) => {
      // Optimistic update
      const nowStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      setAllSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status,
                deactivationReason: status === 'Deactivated' ? deactivationReason : undefined,
                deactivatedAt: status === 'Deactivated' ? nowStr : undefined,
                deactivatedBy: status === 'Deactivated' ? 'Admin' : undefined,
                currentVehicleNumber: status === 'Deactivated' ? undefined : s.currentVehicleNumber,
                currentSessionId: status === 'Deactivated' ? undefined : s.currentSessionId,
              }
            : s
        )
      );

      if (status === 'Deactivated') {
        const newEvent: DeactivationEvent = {
          id: 'deact-' + Date.now(),
          slotId,
          siteId: currentSiteId,
          action: 'deactivate',
          reason: deactivationReason || 'Administrative maintenance deactivation',
          actionedBy: 'Admin',
          actionedAt: nowStr,
        };
        setDeactivationEvents((prev) => [newEvent, ...prev]);
      } else if (status === 'Vacant') {
        const newEvent: DeactivationEvent = {
          id: 'react-' + Date.now(),
          slotId,
          siteId: currentSiteId,
          action: 'reactivate',
          reason: 'Slot verified and returned to service',
          actionedBy: 'Admin',
          actionedAt: nowStr,
        };
        setDeactivationEvents((prev) => [newEvent, ...prev]);
      }

      // Sync to backend
      const apiStatus = status === 'Vacant' ? 'VACANT' : status === 'Occupied' ? 'OCCUPIED' : 'DEACTIVATED';
      api
        .patch(`/slots/${slotId}/status`, { status: apiStatus, deactivationReason })
        .catch((err) => console.error('[LiveData] updateSlotStatus failed:', err));

      triggerFlash();
    },
    [currentSiteId, triggerFlash]
  );

  const reassignSlotCategory = useCallback(
    (slotId: string, newCategory: VehicleCategory) => {
      setAllSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, category: newCategory } : s
        )
      );
      const apiCategory = newCategory === 'Car' ? 'CAR' : 'SCOOTER';
      api
        .patch(`/slots/${slotId}/category`, { slotType: apiCategory })
        .catch((err) => console.error('[LiveData] reassignSlotCategory failed:', err));
      triggerFlash();
    },
    [triggerFlash]
  );

  const addSlot = useCallback(
    (slot: Omit<ParkingSlot, 'currentVehicleNumber' | 'currentSessionId'>): boolean => {
      const exists = allSlots.some(
        (s) => s.locationCode.toLowerCase() === slot.locationCode.toLowerCase() && s.siteId === slot.siteId
      );
      if (exists) return false;
      const apiCategory = slot.category === 'Car' ? 'CAR' : 'SCOOTER';
      api
        .post<ApiSlot>('/slots', {
          locationCode: slot.locationCode,
          locationId: slot.siteId,
          slotType: apiCategory,
        })
        .then((created) => {
          setAllSlots((prev) => [...prev, mapSlot(created)]);
          triggerFlash();
        })
        .catch((err) => console.error('[LiveData] addSlot failed:', err));
      return true;
    },
    [allSlots, triggerFlash]
  );

  const updateRate = useCallback(
    (category: VehicleCategory, newRate: number, adminName: string) => {
      const existing = rates.find((r) => r.category === category);
      const oldRate = existing?.hourlyRate ?? 0;
      const nowStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Optimistic update
      setAllRates((prev) =>
        prev.map((r) =>
          r.category === category && r.siteId === currentSiteId
            ? { ...r, hourlyRate: newRate, lastUpdatedAt: nowStr, lastUpdatedBy: adminName }
            : r
        )
      );

      const newHistoryItem: RateHistoryItem = {
        id: 'hist-' + Date.now(),
        siteId: currentSiteId,
        date: nowStr,
        category,
        oldRate,
        newRate,
        changedBy: adminName,
      };
      setAllRateHistory((prev) => [newHistoryItem, ...prev]);

      // Sync to backend
      const apiCategory = category === 'Car' ? 'CAR' : 'SCOOTER';
      api
        .post('/rates', {
          siteId: currentSiteId,
          vehicleType: apiCategory,
          ratePerHour: newRate,
          updatedBy: adminName,
        })
        .catch((err) => console.error('[LiveData] updateRate failed:', err));
    },
    [rates, currentSiteId]
  );

  const addOperator = useCallback(
    (operatorData: { name: string; username: string; contact: string; assignedSiteId: string }) => {
      api
        .post<ApiOperator>('/operators', operatorData)
        .then((created) => {
          setOperators((prev) => [mapOperator(created), ...prev]);
          triggerFlash();
        })
        .catch((err) => console.error('[LiveData] addOperator failed:', err));
    },
    [triggerFlash]
  );

  const reassignOperatorSite = useCallback(
    (operatorId: string, newSiteId: string, reason?: string) => {
      api
        .post(`/operators/${operatorId}/reassign`, { newSiteId, reason })
        .then(() => {
          const toSite = sites.find((s) => s.id === newSiteId);
          const nowStr = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          setOperators((prev) =>
            prev.map((op) => {
              if (op.id !== operatorId) return op;
              const fromSite = sites.find((s) => s.id === op.assignedSiteId);
              const reassignment = {
                id: 'rh-' + Date.now(),
                operatorId,
                fromSiteId: op.assignedSiteId,
                fromSiteName: fromSite?.name ?? 'Previous Site',
                toSiteId: newSiteId,
                toSiteName: toSite?.name ?? newSiteId,
                reassignedBy: 'Admin',
                reassignedAt: nowStr,
                reason: reason ?? 'Operational shift allocation',
              };
              return {
                ...op,
                assignedSiteId: newSiteId,
                reassignmentHistory: [reassignment, ...op.reassignmentHistory],
              };
            })
          );
          triggerFlash();
        })
        .catch((err) => console.error('[LiveData] reassignOperatorSite failed:', err));
    },
    [sites, triggerFlash]
  );

  const terminateOperator = useCallback(
    (operatorId: string) => {
      api
        .patch(`/operators/${operatorId}/terminate`, {})
        .then(() => {
          setOperators((prev) =>
            prev.map((op) => (op.id === operatorId ? { ...op, status: 'Terminated' } : op))
          );
          triggerFlash();
        })
        .catch((err) => console.error('[LiveData] terminateOperator failed:', err));
    },
    [triggerFlash]
  );

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // No-op simulation stubs (removed — data is live from backend)
  const setSimulationActive = useCallback(() => {}, []);
  const toggleFacilityFullSimulation = useCallback(() => {}, []);
  const simulateEntry = useCallback(() => {}, []);
  const simulateExit = useCallback(() => {}, []);

  return (
    <LiveDataContext.Provider
      value={{
        sites,
        currentSiteId,
        currentSite,
        setCurrentSiteId,
        addSite,
        availability,
        allSlots,
        slots,
        allSessions,
        sessions,
        rates,
        rateHistory,
        deactivationEvents,
        operators,
        alerts,
        isFacilityFull,
        hasRecentUpdate,
        isLoading,
        simulationActive,
        setSimulationActive,
        toggleFacilityFullSimulation,
        simulateEntry,
        simulateExit,
        updateSlotStatus,
        reassignSlotCategory,
        addSlot,
        updateRate,
        addOperator,
        reassignOperatorSite,
        terminateOperator,
        dismissAlert,
        refresh,
      }}
    >
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = (): LiveDataContextType => {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveData must be used within a LiveDataProvider');
  }
  return context;
};

// Re-export for convenience
export type { LiveDataContextType };
