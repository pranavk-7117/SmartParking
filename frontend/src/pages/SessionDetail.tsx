import React from 'react';
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
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessions, currentSite, sites } = useLiveData();

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
  const sessionSite = sites.find((s) => s.id === session.siteId) || currentSite;
  const gateInfo = sessionSite?.gateInfo || 'Terminal 2 · Gates 1 & 2 (ANPR Lane)';

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

        <Button
          variant="primary"
          size="md"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={() => navigate(`/sessions/${session.id}/receipt`)}
        >
          Print Receipt
        </Button>
      </div>

      {/* Timeline Visual: Entry -> Parked -> Exit -> Complete */}
      <Card className="p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-6">
          Session Lifecycle Stepper
        </h2>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Step 1: Entry */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-success flex items-center justify-center border-2 border-success shadow-xs shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">1. Gate Entry</p>
              <p className="text-[11px] text-neutral-500">{session.inTime}</p>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">
                ANPR Verified
              </span>
            </div>
          </div>

          {/* Stepper connector 1 */}
          <div className="hidden md:block flex-1 h-0.5 bg-emerald-300 -mt-7" />

          {/* Step 2: Parked */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-success flex items-center justify-center border-2 border-success shadow-xs shrink-0">
              <ParkingSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">2. Parked in Bay</p>
              <p className="text-[11px] text-neutral-500">Slot {session.slotId}</p>
              <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 inline-block">
                {session.category}
              </span>
            </div>
          </div>

          {/* Stepper connector 2 */}
          <div
            className={`hidden md:block flex-1 h-0.5 -mt-7 ${
              isCompleted ? 'bg-emerald-300' : 'bg-neutral-200'
            }`}
          />

          {/* Step 3: Exit */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-xs shrink-0 ${
                isCompleted
                  ? 'bg-emerald-100 text-success border-success'
                  : 'bg-neutral-100 text-neutral-400 border-neutral-300'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">3. Gate Exit</p>
              <p className="text-[11px] text-neutral-500">{session.outTime || 'Currently Inside'}</p>
              <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">
                {isCompleted ? 'Barrier Released' : 'Pending Exit'}
              </span>
            </div>
          </div>

          {/* Stepper connector 3 */}
          <div
            className={`hidden md:block flex-1 h-0.5 -mt-7 ${
              isCompleted ? 'bg-emerald-300' : 'bg-neutral-200'
            }`}
          />

          {/* Step 4: Complete */}
          <div className="flex md:flex-col items-center text-left md:text-center gap-3 z-10 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-xs shrink-0 ${
                isCompleted
                  ? 'bg-blue-100 text-primary border-primary'
                  : 'bg-neutral-100 text-neutral-400 border-neutral-300'
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">4. Session Complete</p>
              <p className="text-[11px] font-bold text-neutral-950">
                {isCompleted ? 'Receipt Issued' : 'Active'}
              </p>
              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">
                {isCompleted ? 'Completed' : 'In Session'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Details Grid: Identification on left, Timestamps & Facility on right (NO billing card per §3.7.1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Vehicle & Slot Card */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
            Vehicle & Slot Identification
          </h2>

          <div className="divide-y divide-neutral-100 text-sm">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Vehicle Registration:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-200">
                  {session.vehicleNumber}
                </span>
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Vehicle Category:</span>
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                {session.category === 'Car' ? (
                  <Car className="w-4 h-4 text-primary" />
                ) : (
                  <Bike className="w-4 h-4 text-accent" />
                )}
                <span>{session.category}</span>
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Allocated Slot:</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-mono font-bold text-neutral-900">{session.slotId}</span>
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Assigned Facility:</span>
              <span className="font-semibold text-neutral-900">{sessionSite?.name || 'AeroPark'}</span>
            </div>
          </div>
        </Card>

        {/* Timestamps & Access Point Card */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
            Timestamps & Access Point
          </h2>

          <div className="divide-y divide-neutral-100 text-sm">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Check-In Timestamp:</span>
              <span className="font-medium text-neutral-900">{session.inTime}</span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Check-Out Timestamp:</span>
              <span className="font-medium text-neutral-900">{session.outTime || '— Active —'}</span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Entry Gate & ANPR Lane:</span>
              <span className="font-medium text-neutral-800">{gateInfo}</span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-neutral-500">Site Location:</span>
              <span className="font-medium text-neutral-700 text-xs text-right max-w-[200px] truncate" title={sessionSite?.address}>
                {sessionSite?.address || 'Hadapsar, Pune'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
