import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { ParkingSession } from '../../types';
import { Button } from './Button';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ParkingSession | null;
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDisplayTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, session }) => {
  if (!isOpen || !session) return null;

  const handlePrint = () => {
    window.print();
  };

  const durationMins = session.durationMinutes ?? 0;
  const formattedDuration = session.durationMinutes
    ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
    : 'In Progress';

  const hourlyRate = session.rateApplied || (session.category === 'Car' ? 30 : 15);
  const durationHours = Math.max(1, Math.ceil(durationMins / 60));
  const computedAmount =
    session.amount !== undefined && session.amount !== null && session.amount > 0
      ? session.amount.toFixed(2)
      : (durationHours * hourlyRate).toFixed(2);

  const ticketCode = `PK-${session.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white rounded-card shadow-modal border border-neutral-200 w-full max-w-md overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-neutral-900">Print / View Receipt</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-control"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt Area */}
        <div className="p-6 bg-neutral-100/50 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-full max-w-[320px] bg-white p-6 rounded-control border border-dashed border-neutral-300 shadow-soft font-mono text-xs text-neutral-900 select-all"
          >
            <div className="text-center pb-3 border-b border-dashed border-neutral-300">
              <div className="text-base font-black tracking-tight uppercase">{session.siteName || 'Smart Parking Hub'}</div>
              <div className="text-[11px] text-neutral-500 font-sans mt-0.5">Automated Gate Facility</div>
              <div className="text-xs font-bold mt-2 uppercase tracking-wide">PARKING RECEIPT</div>
            </div>

            <div className="py-3.5 space-y-1.5 border-b border-dashed border-neutral-300 leading-relaxed text-[11.5px]">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Ticket ID:</span>
                <span className="font-bold tracking-wide" title={session.id}>{ticketCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Vehicle No:</span>
                <span className="font-bold text-neutral-950">{session.vehicleNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Category:</span>
                <span>{session.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Slot Allocated:</span>
                <span className="font-bold">{session.slotId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Date:</span>
                <span className="font-semibold">{formatDisplayDate(session.inTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">In-Time:</span>
                <span>{formatDisplayTime(session.inTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Out-Time:</span>
                <span>{session.outTime ? formatDisplayTime(session.outTime) : 'Currently Parked'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Duration:</span>
                <span>{formattedDuration}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Hourly Rate:</span>
                <span>₹{hourlyRate}/hr</span>
              </div>
            </div>

            <div className="py-3 border-b border-dashed border-neutral-300">
              <div className="flex justify-between items-baseline text-sm font-extrabold">
                <span>TOTAL AMOUNT:</span>
                <span className="text-base text-neutral-950">₹{computedAmount}</span>
              </div>
              <div className="text-[10px] text-neutral-400 font-sans mt-1">Payment: Cash / UPI Paid at Exit</div>
            </div>

            <div className="text-center pt-3 text-[11px] text-neutral-600 font-sans">
              <p className="font-semibold">Thank you — Drive Safe!</p>
              <p className="text-[9.5px] text-neutral-400 mt-1">Automated Parking Management System</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              Print Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
