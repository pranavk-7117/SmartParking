import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { ParkingSession } from '../../types';
import { Button } from './Button';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ParkingSession | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, session }) => {
  if (!isOpen || !session) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDuration = session.durationMinutes
    ? `${Math.floor(session.durationMinutes / 60)}h ${session.durationMinutes % 60}m`
    : 'In Progress';

  const rateStr = session.rateApplied ? `₹${session.rateApplied}/hr` : session.category === 'Car' ? '₹30/hr' : '₹15/hr';
  const totalAmount = session.amount ? `₹${session.amount}` : '—';

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

        {/* Printable Ticket Receipt Area matching §3.8 */}
        <div className="p-6 bg-neutral-100/50 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-full max-w-[320px] bg-white p-6 rounded-control border border-dashed border-neutral-300 shadow-soft font-mono text-xs text-neutral-900 select-all"
          >
            <div className="text-center pb-3 border-b border-dashed border-neutral-300">
              <div className="text-base font-black tracking-tight uppercase">AeroPark Facility</div>
              <div className="text-[11px] text-neutral-500 font-sans mt-0.5">Terminal 2 • Smart Parking</div>
              <div className="text-xs font-bold mt-2 uppercase tracking-wide">PARKING RECEIPT</div>
            </div>

            <div className="py-3.5 space-y-1.5 border-b border-dashed border-neutral-300 leading-relaxed text-[11.5px]">
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
                <span>{rateStr}</span>
              </div>
            </div>

            <div className="py-3 border-b border-dashed border-neutral-300">
              <div className="flex justify-between items-baseline text-sm font-extrabold">
                <span>TOTAL AMOUNT:</span>
                <span className="text-base text-neutral-950">{totalAmount}</span>
              </div>
              <div className="text-[10px] text-neutral-400 font-sans mt-1">Payment: Cash / UPI Paid at Exit</div>
            </div>

            <div className="text-center pt-3 text-[11px] text-neutral-600 font-sans">
              <p className="font-semibold">Thank you — Drive Safe!</p>
              <p className="text-[9.5px] text-neutral-400 mt-1">For support call +91 (020) 2450-8800</p>
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
              onClick={() => alert('Receipt downloaded as text file.')}
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
