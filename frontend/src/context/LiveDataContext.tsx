import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
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
import {
  initialSites,
  initialSlots,
  initialSessions,
  initialRates,
  initialRateHistory,
  initialDeactivationEvents,
  initialOperators,
  initialAlerts,
} from '../data/mockData';

interface LiveDataContextType {
  sites: Site[];
  currentSiteId: string;
  currentSite: Site;
  setCurrentSiteId: (siteId: string) => void;
  addSite: (site: Omit<Site, 'id'>) => Site;
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
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

// The live parking data (slots/sessions/facility-full state) previously lived
// only in this provider's React state. Since the Kiosk Display (/display) is
// meant to be opened as its own dedicated screen/tab (see the sidebar's
// "Open Kiosk Display" link, which opens it with target="_blank"), that tab
// got a completely independent copy of the state and ran its own
// independent random simulation loop below - so it drifted away from the
// operator Dashboard's numbers within seconds. These helpers persist the
// live state to localStorage and rely on the browser's cross-tab "storage"
// event so every open tab (Dashboard, Kiosk, or both) reflects the same data.
const LIVE_STATE_STORAGE_KEY = 'aeropark_live_state_v1';

interface PersistedLiveState {
  allSlots: ParkingSlot[];
  allSessions: ParkingSession[];
  isFacilityFull: boolean;
}

const loadPersistedLiveState = (): PersistedLiveState | null => {
  try {
    const raw = window.localStorage.getItem(LIVE_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.allSlots) || !Array.isArray(parsed.allSessions)) return null;
    return parsed as PersistedLiveState;
  } catch {
    return null;
  }
};

const savePersistedLiveState = (state: PersistedLiveState) => {
  try {
    window.localStorage.setItem(LIVE_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota/availability errors - sync is a best-effort enhancement
  }
};

export const LiveDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  // The Kiosk Display is a read-only mirror of the operator Dashboard, not a
  // second independent simulator - so it should never run its own
  // entry/exit simulation loop (that's what caused the two screens to show
  // different numbers). Only the authenticated app drives the simulation.
  const isKioskRoute = location.pathname.startsWith('/display');

  const persistedOnMount = useMemo(() => loadPersistedLiveState(), []);

  const [sites, setSites] = useState<Site[]>(initialSites);
  const [currentSiteId, setCurrentSiteId] = useState<string>('site-hadapsar');
  const [allSlots, setAllSlots] = useState<ParkingSlot[]>(persistedOnMount?.allSlots ?? initialSlots);
  const [allSessions, setAllSessions] = useState<ParkingSession[]>(persistedOnMount?.allSessions ?? initialSessions);
  const [allRates, setAllRates] = useState<RateItem[]>(initialRates);
  const [allRateHistory, setAllRateHistory] = useState<RateHistoryItem[]>(initialRateHistory);
  const [deactivationEvents, setDeactivationEvents] = useState<DeactivationEvent[]>(initialDeactivationEvents);
  const [operators, setOperators] = useState<OperatorAccount[]>(initialOperators);
  const [alerts, setAlerts] = useState<QuickAlert[]>(initialAlerts);
  const [hasRecentUpdate, setHasRecentUpdate] = useState<boolean>(false);
  const [simulationActive, setSimulationActive] = useState<boolean>(true);
  const [isFacilityFull, setIsFacilityFull] = useState<boolean>(persistedOnMount?.isFacilityFull ?? false);

  // Guards against re-persisting/re-broadcasting a change that just arrived
  // from another tab (the cross-tab "storage" event only fires in *other*
  // tabs by spec, so this mainly avoids a redundant localStorage write).
  const isApplyingRemoteUpdateRef = useRef(false);

  const currentSite = useMemo(() => {
    return sites.find((s) => s.id === currentSiteId) || sites[0];
  }, [sites, currentSiteId]);

  const slots = useMemo(() => {
    return allSlots.filter((s) => s.siteId === currentSiteId);
  }, [allSlots, currentSiteId]);

  const sessions = useMemo(() => {
    return allSessions.filter((s) => s.siteId === currentSiteId);
  }, [allSessions, currentSiteId]);

  const rates = useMemo(() => {
    return allRates.filter((r) => r.siteId === currentSiteId);
  }, [allRates, currentSiteId]);

  const rateHistory = useMemo(() => {
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

  const triggerFlash = useCallback(() => {
    setHasRecentUpdate(true);
    const timer = setTimeout(() => setHasRecentUpdate(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const addSite = useCallback((newSiteData: Omit<Site, 'id'>): Site => {
    const newId = 'site-' + Date.now();
    const createdSite: Site = { ...newSiteData, id: newId };
    setSites((prev) => [...prev, createdSite]);
    return createdSite;
  }, []);

  const simulateEntry = useCallback((preferredCat?: VehicleCategory) => {
    const category: VehicleCategory =
      preferredCat || (Math.random() > 0.35 ? 'Car' : 'Scooter');
    const vacant = allSlots.filter(
      (s) => s.siteId === currentSiteId && s.category === category && s.status === 'Vacant'
    );
    if (vacant.length === 0) return;
    const targetSlot = vacant[Math.floor(Math.random() * vacant.length)];
    const prefix = category === 'Car' ? 'MH12AB' : 'MH12CD';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const vehicleNumber = prefix + randNum;
    const newSessionId = 'SES-' + Date.now().toString().slice(-6);
    const nowStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const inTimeStr = '04-Sep-2026, ' + nowStr;
    const applicableRate = rates.find((r) => r.category === category)?.hourlyRate || (category === 'Car' ? 30 : 15);
    const newSession: ParkingSession = {
      id: newSessionId,
      siteId: currentSiteId,
      vehicleNumber,
      category,
      slotId: targetSlot.id,
      inTime: inTimeStr,
      outTime: null,
      durationMinutes: 0,
      amount: null,
      status: 'Active',
      rateApplied: applicableRate,
    };
    setAllSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id && s.siteId === currentSiteId
          ? { ...s, status: 'Occupied', currentVehicleNumber: vehicleNumber, currentSessionId: newSessionId }
          : s
      )
    );
    setAllSessions((prev) => [newSession, ...prev]);
    triggerFlash();
  }, [allSlots, currentSiteId, rates, triggerFlash]);

  const simulateExit = useCallback((preferredCat?: VehicleCategory) => {
    const occupied = allSlots.filter(
      (s) =>
        s.siteId === currentSiteId &&
        s.status === 'Occupied' &&
        (!preferredCat || s.category === preferredCat)
    );
    if (occupied.length === 0) return;
    const targetSlot = occupied[Math.floor(Math.random() * occupied.length)];
    const activeSession = allSessions.find(
      (s) => s.slotId === targetSlot.id && s.siteId === currentSiteId && s.status === 'Active'
    );
    const nowStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const outTimeStr = '04-Sep-2026, ' + nowStr;
    const durationMinutes = Math.floor(45 + Math.random() * 180);
    const rate = activeSession?.rateApplied || (targetSlot.category === 'Car' ? 30 : 15);
    const rawAmount = (durationMinutes / 60) * rate;
    const amount = Math.round(rawAmount * 100) / 100;
    setAllSlots((prev) =>
      prev.map((s) =>
        s.id === targetSlot.id && s.siteId === currentSiteId
          ? { ...s, status: 'Vacant', currentVehicleNumber: undefined, currentSessionId: undefined }
          : s
      )
    );
    if (activeSession) {
      setAllSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, status: 'Completed', outTime: outTimeStr, durationMinutes, amount }
            : s
        )
      );
    }
    triggerFlash();
  }, [allSlots, allSessions, currentSiteId, triggerFlash]);

  useEffect(() => {
    if (!simulationActive || isFacilityFull || isKioskRoute) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.45) {
        simulateEntry();
      } else {
        simulateExit();
      }
    }, 9000);
    return () => clearInterval(interval);
  }, [simulationActive, isFacilityFull, isKioskRoute, simulateEntry, simulateExit]);

  // Persist every local change to the shared live state so any other open
  // tab (e.g. the Kiosk Display) can pick it up, either immediately via the
  // "storage" event below or on next load.
  useEffect(() => {
    if (isApplyingRemoteUpdateRef.current) {
      isApplyingRemoteUpdateRef.current = false;
      return;
    }
    savePersistedLiveState({ allSlots, allSessions, isFacilityFull });
  }, [allSlots, allSessions, isFacilityFull]);

  // Pick up changes made in *other* tabs (e.g. the Dashboard tab updating
  // slots while this tab shows the Kiosk Display, or vice versa) so every
  // open screen always reflects the same live occupancy numbers.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LIVE_STATE_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as PersistedLiveState;
        if (!parsed || !Array.isArray(parsed.allSlots) || !Array.isArray(parsed.allSessions)) return;
        isApplyingRemoteUpdateRef.current = true;
        setAllSlots(parsed.allSlots);
        setAllSessions(parsed.allSessions);
        setIsFacilityFull(parsed.isFacilityFull);
        triggerFlash();
      } catch {
        // ignore malformed payloads from other tabs/extensions
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [triggerFlash]);

  const toggleFacilityFullSimulation = useCallback(() => {
    if (!isFacilityFull) {
      setAllSlots((prev) =>
        prev.map((s) =>
          s.siteId === currentSiteId && s.status !== 'Deactivated'
            ? {
                ...s,
                status: 'Occupied',
                currentVehicleNumber: s.currentVehicleNumber || 'MH12FF9999',
              }
            : s
        )
      );
      setIsFacilityFull(true);
    } else {
      setAllSlots(initialSlots);
      setIsFacilityFull(false);
    }
    triggerFlash();
  }, [isFacilityFull, currentSiteId, triggerFlash]);

  const updateSlotStatus = useCallback(
    (slotId: string, status: SlotStatus, deactivationReason?: string) => {
      const nowStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setAllSlots((prev) =>
        prev.map((s) =>
          s.id === slotId && s.siteId === currentSiteId
            ? {
                ...s,
                status,
                deactivationReason: status === 'Deactivated' ? deactivationReason : undefined,
                deactivatedAt: status === 'Deactivated' ? nowStr : undefined,
                deactivatedBy: status === 'Deactivated' ? 'Rajesh Sharma' : undefined,
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
          actionedBy: 'Rajesh Sharma',
          actionedAt: nowStr,
        };
        setDeactivationEvents((prev) => [newEvent, ...prev]);
      } else if (status === 'Vacant') {
        const newEvent: DeactivationEvent = {
          id: 'deact-' + Date.now(),
          slotId,
          siteId: currentSiteId,
          action: 'reactivate',
          reason: 'Slot verified and returned to service',
          actionedBy: 'Rajesh Sharma',
          actionedAt: nowStr,
        };
        setDeactivationEvents((prev) => [newEvent, ...prev]);
      }
      triggerFlash();
    },
    [currentSiteId, triggerFlash]
  );

  const reassignSlotCategory = useCallback(
    (slotId: string, newCategory: VehicleCategory) => {
      setAllSlots((prev) =>
        prev.map((s) =>
          s.id === slotId && s.siteId === currentSiteId ? { ...s, category: newCategory } : s
        )
      );
      triggerFlash();
    },
    [currentSiteId, triggerFlash]
  );

  const addSlot = useCallback(
    (slot: Omit<ParkingSlot, 'currentVehicleNumber' | 'currentSessionId'>): boolean => {
      const exists = allSlots.some(
        (s) => s.id.toLowerCase() === slot.id.toLowerCase() && s.siteId === currentSiteId
      );
      if (exists) return false;
      setAllSlots((prev) => [...prev, { ...slot, siteId: currentSiteId }]);
      triggerFlash();
      return true;
    },
    [allSlots, currentSiteId, triggerFlash]
  );

  const updateRate = useCallback(
    (category: VehicleCategory, newRate: number, adminName: string) => {
      const existing = rates.find((r) => r.category === category);
      const oldRate = existing ? existing.hourlyRate : 0;
      const nowStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
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
    },
    [rates, currentSiteId]
  );

  const addOperator = useCallback(
    (operatorData: { name: string; username: string; contact: string; assignedSiteId: string }) => {
      const newOp: OperatorAccount = {
        id: 'op-' + Date.now(),
        name: operatorData.name,
        username: operatorData.username,
        contact: operatorData.contact,
        assignedSiteId: operatorData.assignedSiteId,
        status: 'Active',
        dateAdded: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        authMethod: 'Google Account Linked',
        sessionsProcessedCount: 0,
        reassignmentHistory: [],
      };
      setOperators((prev) => [newOp, ...prev]);
    },
    []
  );

  const reassignOperatorSite = useCallback(
    (operatorId: string, newSiteId: string, reason?: string) => {
      setOperators((prev) =>
        prev.map((op) => {
          if (op.id !== operatorId) return op;
          const fromSite = sites.find((s) => s.id === op.assignedSiteId);
          const toSite = sites.find((s) => s.id === newSiteId);
          const nowStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          const reassignment = {
            id: 'rh-' + Date.now(),
            operatorId,
            fromSiteId: op.assignedSiteId,
            fromSiteName: fromSite ? fromSite.name : 'Unknown Site',
            toSiteId: newSiteId,
            toSiteName: toSite ? toSite.name : 'Unknown Site',
            reassignedBy: 'Rajesh Sharma',
            reassignedAt: nowStr,
            reason: reason || 'Operational shift allocation',
          };
          return {
            ...op,
            assignedSiteId: newSiteId,
            reassignmentHistory: [reassignment, ...op.reassignmentHistory],
          };
        })
      );
    },
    [sites]
  );

  const terminateOperator = useCallback((operatorId: string) => {
    setOperators((prev) =>
      prev.map((op) => (op.id === operatorId ? { ...op, status: 'Terminated' } : op))
    );
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

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
