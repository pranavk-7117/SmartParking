import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

export const ReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessions, currentSite, sites } = useLiveData();

  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div className="space-y-6 max-w-xl mx-auto p-4">
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

  // Find site record
  const sessionSite = sites.find((s) => s.id === session.siteId) || currentSite;
  const siteAddress = sessionSite?.address || 'Hadapsar Industrial Estate, Bypass Rd, Pune 411028';
  const siteName = sessionSite?.name || 'AeroPark Facility';

  // Duration display
  const durationMins = session.durationMinutes ?? 0;
  const formattedDuration = session.durationMinutes
    ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
    : 'In Progress';

  const hourlyRate = session.rateApplied || (session.category === 'Car' ? 30 : 15);

  // Proportional billing: (duration / 60) * hourlyRate
  const computedAmount =
    session.amount !== undefined && session.amount !== null
      ? session.amount.toFixed(2)
      : ((durationMins / 60) * hourlyRate).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Top Header & Navigation - Hidden in print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/sessions/${session.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Session Details</span>
          </Link>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Official Parking Receipt
          </h1>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
        >
          Print Receipt
        </Button>
      </div>

      {/* Printable Thermal Receipt Card */}
      <div className="flex justify-center">
        <div
          id="official-receipt"
          className="w-full max-w-[360px] bg-white p-7 rounded-card border border-dashed border-neutral-300 shadow-soft font-mono text-xs text-neutral-900 select-all print:border-none print:shadow-none print:max-w-none print:p-0"
        >
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-neutral-300">
            <div className="text-lg font-black tracking-tight uppercase text-neutral-950">
              {siteName}
            </div>
            <div className="text-[11px] text-neutral-500 font-sans mt-1 leading-snug">
              {siteAddress}
            </div>
            <div className="text-xs font-bold mt-3 uppercase tracking-widest text-neutral-800">
              PARKING RECEIPT
            </div>
          </div>

          {/* Line items */}
          <div className="py-4 space-y-2 border-b border-dashed border-neutral-300 leading-relaxed text-[12px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Ticket ID:</span>
              <span className="font-bold">{session.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Vehicle No:</span>
              <span className="font-bold text-neutral-950">{session.vehicleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Category:</span>
              <span>{session.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Slot Allocated:</span>
              <span className="font-bold">{session.slotId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Date:</span>
              <span>04-Sep-2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">In-Time:</span>
              <span>{session.inTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Out-Time:</span>
              <span>{session.outTime || 'Currently Parked'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Duration:</span>
              <span>{formattedDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Hourly Rate:</span>
              <span>₹{hourlyRate}/hr</span>
            </div>
          </div>

          {/* Total */}
          <div className="py-3.5 border-b border-dashed border-neutral-300">
            <div className="flex justify-between items-baseline text-sm font-black">
              <span>TOTAL AMOUNT:</span>
              <span className="text-lg text-neutral-950">₹{computedAmount}</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-sans mt-1">
              Payment Method: Cash / UPI Paid at Exit
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 text-[11px] text-neutral-600 font-sans">
            <p className="font-semibold">Thank you — Drive safe</p>
            <p className="text-[9.5px] text-neutral-400 mt-1">
              Automated Parking Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};