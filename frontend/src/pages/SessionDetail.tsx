import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  Bike,
  Printer,
  Clock,
  ParkingSquare,
  Receipt,
  CheckCircle2,
  MapPin,
  Calendar,
  Ban,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessions, currentSite, sites, voidSession } = useLiveData();
  const { showToast } = useToast();
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('Accidental double-scan at gate');
  const [isVoiding, setIsVoiding] = useState(false);

  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div className="space-y-6">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Session History</span>
        </Link>
        <EmptyState
          title="Session Not Found"
          description={`No record found matching session identifier "${id}".`}
          actionText="Return to Sessions"
          onAction={() => navigate('/sessions')}
        />
      </div>
    );
  }

  const isCompleted = session.status === 'Completed';
  const isVoided = session.status === 'Voided';
  const sessionSite = sites.find((s) => s.id === session.siteId) || currentSite;
  const gateInfo = sessionSite?.gateInfo || 'Main Entrance Gate';

  const handleVoid = async () => {
    if (!session || !voidReason.trim()) return;
    setIsVoiding(true);
    try {
      await voidSession(session.id, voidReason.trim());
      showToast(`Vehicle ${session.vehicleNumber} session voided successfully.`, 'success');
      setIsVoidModalOpen(false);
    } catch {
      showToast('Failed to void session', 'error');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sessions</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight font-mono">
              {session.id}
            </h1>
            <Badge variant={session.status} size="md" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isVoided && (
            <Button
              variant="destructive"
              size="md"
              leftIcon={<Ban className="w-4 h-4" />}
              onClick={() => setIsVoidModalOpen(true)}
            >
              Void Session
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => navigate(`/sessions/${session.id}/receipt`)}
            disabled={isVoided}
          >
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Voided Alert Banner */}
      {isVoided && (
        <div className="p-4 rounded-card bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
          <div className="font-bold text-sm flex items-center gap-2">
            <Ban className="w-4 h-4 text-danger shrink-0" />
            <span>This session was voided / cancelled by an administrator</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            <span className="font-semibold">Reason:</span> {session.voidReason || 'Direct cancellation'}{' '}
            {session.voidedBy && <span>• <span className="font-semibold">By:</span> {session.voidedBy}</span>}{' '}
            {session.voidedAt && (
              <span>• <span className="font-semibold">At:</span> {new Date(session.voidedAt).toLocaleString('en-GB')}</span>
            )}
          </p>
        </div>
      )}

      {/* Timeline Visual: Entry -> Parked -> Exit -> Complete */}
      <Card className="p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-6">
          Session Lifecycle Stepper
        </h2>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Step 1: Entry */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border-2 border-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Vehicle Entry Recorded</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{session.inTime}</div>
            </div>
          </div>

          <div className="hidden md:block h-0.5 bg-neutral-200 flex-1 -mt-5" />

          {/* Step 2: Bay Allocation */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border-2 border-blue-500 shrink-0">
              <ParkingSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Assigned Bay {session.slotId}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{session.category} Bay</div>
            </div>
          </div>

          <div className="hidden md:block h-0.5 bg-neutral-200 flex-1 -mt-5" />

          {/* Step 3: Checkout or Current State */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 shrink-0 ${
                isVoided
                  ? 'bg-rose-100 text-rose-700 border-rose-500'
                  : isCompleted
                  ? 'bg-neutral-100 text-neutral-700 border-neutral-400'
                  : 'bg-amber-100 text-amber-700 border-amber-500 animate-pulse'
              }`}
            >
              {isVoided ? <Ban className="w-5 h-5" /> : isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">
                {isVoided ? 'Session Voided' : isCompleted ? 'Completed & Paid' : 'Currently Parked'}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {isVoided
                  ? session.voidedAt ? new Date(session.voidedAt).toLocaleTimeString('en-GB') : 'Voided'
                  : isCompleted
                  ? session.outTime
                  : 'Running timer'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Two-Column Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle & Parking Bay Details */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            {session.category === 'Car' ? (
              <Car className="w-5 h-5 text-primary" />
            ) : (
              <Bike className="w-5 h-5 text-primary" />
            )}
            <h3 className="font-bold text-neutral-900 text-sm">Vehicle & Bay Information</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">License Plate:</span>
              <span className="font-mono font-bold text-neutral-900 text-sm tracking-wider">
                {session.vehicleNumber}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Vehicle Category:</span>
              <span className="font-medium text-neutral-800">{session.category}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Assigned Bay Code:</span>
              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {session.slotId}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Site Facility:</span>
              <span className="font-medium text-neutral-800">{sessionSite?.name || 'ParkIT Site'}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-neutral-500">Session Status:</span>
              <Badge variant={session.status} size="sm" />
            </div>
          </div>
        </Card>

        {/* Tariff & Financial Summary */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <Receipt className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-neutral-900 text-sm">Tariff & Billing Breakdown</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">In-Time Timestamp:</span>
              <span className="font-medium text-neutral-800">{session.inTime}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Out-Time Timestamp:</span>
              <span className="font-medium text-neutral-800">
                {session.outTime || 'Vehicle Still Inside'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Duration Parked:</span>
              <span className="font-medium text-neutral-800">
                {session.durationMinutes ? `${session.durationMinutes} mins` : 'In Progress'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Applied Hourly Rate:</span>
              <span className="font-medium text-neutral-800">
                ₹{session.rateApplied || sessionSite?.defaultCarRate || 30}/hr
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-neutral-900 text-sm">Total Fee:</span>
              <span className="font-bold text-primary text-base font-mono">
                {session.amount !== null && session.amount !== undefined
                  ? `₹${session.amount.toFixed(2)}`
                  : 'Calculated at Exit'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Facility & Gate Metadata */}
      <Card className="p-6">
        <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-4">
          Location & Lane Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-control bg-neutral-50 border border-neutral-200/80 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-neutral-800">Facility Address</div>
              <div className="text-neutral-500 mt-0.5">{sessionSite?.address || 'Pune, Maharashtra'}</div>
            </div>
          </div>

          <div className="p-3 rounded-control bg-neutral-50 border border-neutral-200/80 flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-neutral-800">Gate & Lane</div>
              <div className="text-neutral-500 mt-0.5">{gateInfo}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Void Modal with Mandatory Reason */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title="Void Vehicle Session"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-control bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            Voiding cancels this session in compliance with audit policy. The slot will be freed immediately and the event will be permanently recorded in the security audit log.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Mandatory Void Reason <span className="text-red-500">*</span>
            </label>
            <Input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Accidental double-scan at Gate 1"
              disabled={isVoiding}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsVoidModalOpen(false)}
              disabled={isVoiding}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={handleVoid}
              isLoading={isVoiding}
              disabled={!voidReason.trim()}
            >
              Confirm Void
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
