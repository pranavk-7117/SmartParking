import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  Bike,
  Power,
  ShieldAlert,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  History,
  FileText,
  User,
  MapPin,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Table, Column } from '../components/common/Table';
import { EmptyState } from '../components/common/EmptyState';
import { ParkingSession, DeactivationEvent } from '../types';

type HistoryRow = {
  id: string;
  type: 'session' | 'deactivation';
  timestamp: string;
  vehicleNumber?: string;
  category?: string;
  inTime?: string;
  outTime?: string;
  durationMinutes?: number;
  amount?: number;
  reason?: string;
  actionedBy?: string;
  action?: 'deactivate' | 'reactivate';
};

export const SlotDetail: React.FC = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const {
    slots,
    currentSite,
    sessions,
    deactivationEvents,
    updateSlotStatus,
  } = useLiveData();
  const { showToast } = useToast();

  const slot = slots.find((s) => s.id === slotId);

  // Deactivation Modal State
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivationReasonInput, setDeactivationReasonInput] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  // Reactivate Confirmation Modal State
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);

  // Find active session on this slot if occupied
  const activeSession = useMemo(() => {
    if (!slot || slot.status !== 'Occupied') return null;
    return sessions.find(
      (s) => s.slotId === slot.id && s.status === 'Active'
    );
  }, [slot, sessions]);

  // Unified Chronological Slot History (Sessions + Deactivation Events) per §3.4.1
  const combinedHistory = useMemo((): HistoryRow[] => {
    if (!slot) return [];

    const sessionRows: HistoryRow[] = sessions
      .filter((s) => s.slotId === slot.id)
      .map((s) => ({
        id: s.id,
        type: 'session',
        timestamp: s.inTime,
        vehicleNumber: s.vehicleNumber,
        category: s.category,
        inTime: s.inTime,
        outTime: s.outTime || '— Active —',
        durationMinutes: s.durationMinutes || undefined,
        amount: s.amount || undefined,
      }));

    const eventRows: HistoryRow[] = deactivationEvents
      .filter((e) => e.slotId === slot.id)
      .map((e) => ({
        id: e.id,
        type: 'deactivation',
        timestamp: e.actionedAt,
        reason: e.reason,
        actionedBy: e.actionedBy,
        action: e.action,
      }));

    return [...sessionRows, ...eventRows].sort((a, b) => b.id.localeCompare(a.id));
  }, [slot, sessions, deactivationEvents]);

  if (!slot) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Previous Screen</span>
        </button>
        <EmptyState
          title="Slot Not Found"
          description={`No slot record found matching ID "${slotId}" in ${currentSite.name}.`}
          actionText="Return to Slot Management"
          onAction={() => navigate('/slots')}
        />
      </div>
    );
  }

  const handleDeactivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivationReasonInput.trim()) {
      setReasonError('A clear deactivation reason is required before taking bay out of service.');
      return;
    }

    updateSlotStatus(slot.id, 'Deactivated', deactivationReasonInput.trim());
    showToast(`Slot ${slot.id} has been deactivated.`, 'warning');
    setIsDeactivateModalOpen(false);
    setDeactivationReasonInput('');
    setReasonError(null);
  };

  const handleReactivate = () => {
    updateSlotStatus(slot.id, 'Vacant');
    showToast(`Slot ${slot.id} has been reactivated and is now Vacant.`, 'success');
    setIsReactivateModalOpen(false);
  };

  const historyColumns: Column<HistoryRow>[] = [
    {
      key: 'event',
      header: 'Event / Vehicle No.',
      render: (item) => {
        if (item.type === 'deactivation') {
          return (
            <div className="flex items-center gap-2">
              <span
                className={`p-1 rounded text-xs font-bold uppercase tracking-wider ${
                  item.action === 'deactivate'
                    ? 'bg-red-100 text-danger'
                    : 'bg-emerald-100 text-success'
                }`}
              >
                {item.action === 'deactivate' ? 'Deactivated' : 'Reactivated'}
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                item.category === 'Car' ? 'bg-blue-50 text-primary' : 'bg-amber-50 text-accent'
              }`}
            >
              {item.category === 'Car' ? (
                <Car className="w-3.5 h-3.5" />
              ) : (
                <Bike className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="font-mono font-bold text-neutral-900">{item.vehicleNumber}</span>
          </div>
        );
      },
    },
    {
      key: 'details',
      header: 'Activity Details / Reason',
      render: (item) => {
        if (item.type === 'deactivation') {
          return (
            <div className="space-y-0.5">
              <p className="text-xs text-neutral-800 font-medium">{item.reason}</p>
              <p className="text-[10px] text-neutral-400">
                Actioned by {item.actionedBy} on {item.timestamp}
              </p>
            </div>
          );
        }
        return (
          <div className="text-xs text-neutral-600 space-y-0.5">
            <div>
              <span>In: {item.inTime}</span> • <span>Out: {item.outTime}</span>
            </div>
            {item.durationMinutes && (
              <span className="text-[11px] text-neutral-400 font-mono">
                Duration: {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}m
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (item) => {
        if (item.type === 'deactivation') return <span className="text-neutral-300">—</span>;
        return (
          <span className="font-mono font-bold text-xs text-neutral-900">
            {item.amount ? `₹${item.amount.toFixed(2)}` : 'Active'}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (item) => {
        if (item.type === 'session') {
          return (
            <Link
              to={`/sessions/${item.id}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View →
            </Link>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar with Router Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight font-mono">
              Bay {slot.id}
            </h1>
            <Badge variant={slot.status} size="md" />
            {slot.status === 'Deactivated' && slot.deactivationReason && (
              <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-pill font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
                <span>Reason: {slot.deactivationReason}</span>
              </span>
            )}
          </div>
        </div>

        {/* Administrative Actions */}
        <div className="flex items-center gap-2">
          {slot.status === 'Deactivated' ? (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Power className="w-4 h-4" />}
              onClick={() => setIsReactivateModalOpen(true)}
            >
              Reactivate Slot
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="md"
              leftIcon={<Power className="w-4 h-4" />}
              disabled={slot.status === 'Occupied'}
              onClick={() => setIsDeactivateModalOpen(true)}
              title={
                slot.status === 'Occupied'
                  ? 'Cannot deactivate an occupied bay. Wait until vehicle exits.'
                  : 'Deactivate slot for maintenance'
              }
            >
              Deactivate Slot
            </Button>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout per §3.4 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration, Telemetry & Active Vehicle */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-2">
              Slot Configuration
            </h2>

            <div className="divide-y divide-neutral-100 text-sm">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500">Site Location:</span>
                <span className="font-semibold text-neutral-900">{currentSite.name}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500">Vehicle Category:</span>
                <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                  {slot.category === 'Car' ? (
                    <Car className="w-4 h-4 text-primary" />
                  ) : (
                    <Bike className="w-4 h-4 text-accent" />
                  )}
                  <span>{slot.category} Bay</span>
                </div>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500">Location Code:</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-xs">
                  {slot.locationCode}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-neutral-500">Current State:</span>
                <span
                  className={`text-xs font-bold ${
                    slot.status === 'Vacant'
                      ? 'text-success'
                      : slot.status === 'Occupied'
                      ? 'text-danger'
                      : 'text-neutral-500'
                  }`}
                >
                  {slot.status}
                </span>
              </div>
            </div>
          </Card>

          {/* Active Session Card if bay is Occupied */}
          {slot.status === 'Occupied' && (
            <Card className="p-5 space-y-3 bg-red-50/40 border-red-200">
              <div className="flex items-center justify-between border-b border-red-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
                  </span>
                  Active Parked Vehicle
                </span>
                {activeSession && (
                  <Link
                    to={`/sessions/${activeSession.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View Session</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600">Vehicle No:</span>
                  <span className="font-mono font-black text-sm text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    {slot.currentVehicleNumber || 'MH12AB1002'}
                  </span>
                </div>
                {activeSession && (
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>Entry Time:</span>
                    <span className="font-medium text-neutral-900">{activeSession.inTime}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Deactivation Banner if deactivated */}
          {slot.status === 'Deactivated' && (
            <Card className="p-5 space-y-3 bg-amber-50/50 border-amber-200">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Out of Service</h3>
              </div>
              <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                {slot.deactivationReason || 'Slot has been temporarily taken offline for maintenance.'}
              </p>
              {slot.deactivatedAt && (
                <div className="text-[11px] text-neutral-500 pt-2 border-t border-amber-200/60">
                  Deactivated by {slot.deactivatedBy || 'Admin'} on {slot.deactivatedAt}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Full Slot History Table per §3.4.1 */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-neutral-900">
                Slot History & Maintenance Log
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              {combinedHistory.length} total events recorded
            </span>
          </div>

          <Table
            columns={historyColumns}
            data={combinedHistory}
            keyExtractor={(row) => row.id}
            emptyTitle="No Activity History"
            emptyDescription={`No vehicle sessions or deactivation events have been logged for Bay ${slot.id}.`}
          />
        </div>
      </div>

      {/* Required Free-Text Deactivation Reason Modal per §3.4 */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setReasonError(null);
        }}
        title={`Deactivate Parking Bay ${slot.id}`}
        description="Taking this bay offline prevents ANPR check-ins and updates the live digital board."
      >
        <form onSubmit={handleDeactivate} className="space-y-4">
          <div className="p-3 bg-red-50 rounded-control border border-red-200 text-xs text-red-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <span>
              Bay <strong>{slot.id}</strong> ({slot.category}) will be marked as unavailable immediately across kiosk displays and operator consoles.
            </span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="deact-reason" className="block text-xs font-bold text-neutral-700">
              Reason for Deactivation <span className="text-danger">*</span>
            </label>
            <textarea
              id="deact-reason"
              rows={3}
              value={deactivationReasonInput}
              onChange={(e) => {
                setDeactivationReasonInput(e.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="e.g. Surface oil spill cleanup, repainting bay markings, overhead sensor wire repair..."
              className={`w-full p-2.5 rounded-control border text-sm focus:ring-2 focus:ring-accent focus:outline-none ${
                reasonError ? 'border-danger' : 'border-neutral-300'
              }`}
              autoFocus
              required
            />
            {reasonError && (
              <p className="text-xs text-danger font-medium mt-1">{reasonError}</p>
            )}
            <p className="text-[11px] text-neutral-400">
              A typed reason is mandatory. This description will be visible on the slot inspection card.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsDeactivateModalOpen(false);
                setReasonError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Confirm Deactivation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reactivate Confirmation Modal */}
      <Modal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        title={`Reactivate Parking Bay ${slot.id}`}
        description="Verify maintenance is complete and return this bay to public service."
      >
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-control border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>
              Bay <strong>{slot.id}</strong> will be marked as <strong>Vacant</strong> and will immediately become eligible for new vehicle allocations.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReactivateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleReactivate}>
              Reactivate Bay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
