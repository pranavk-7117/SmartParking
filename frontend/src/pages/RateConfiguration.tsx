import React, { useState } from 'react';
import {
  CircleDollarSign,
  Car,
  Bike,
  Edit2,
  Check,
  X,
  History,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ConfirmationModal } from '../components/common/Modal';
import { Table, Column } from '../components/common/Table';
import { VehicleCategory, RateHistoryItem } from '../types';

export const RateConfiguration: React.FC = () => {
  const { currentUser } = useAuth();
  const { rates, rateHistory, updateRate } = useLiveData();
  const { showToast } = useToast();

  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingUpdate, setPendingUpdate] = useState<{
    category: VehicleCategory;
    oldRate: number;
    newRate: number;
  } | null>(null);

  const handleStartEdit = (category: VehicleCategory, currentRate: number) => {
    setEditingCategory(category);
    setEditValue(currentRate.toString());
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
    setEditError(null);
  };

  const handleSaveClick = (category: VehicleCategory) => {
    const num = parseFloat(editValue);

    if (isNaN(num) || num <= 0) {
      setEditError('Rate must be a positive number greater than 0.');
      return;
    }

    const decimalParts = editValue.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      setEditError('Rate can have at most 2 decimal places.');
      return;
    }

    const currentRate = rates.find((r) => r.category === category)?.hourlyRate || 0;
    if (num === currentRate) {
      handleCancelEdit();
      return;
    }

    setPendingUpdate({
      category,
      oldRate: currentRate,
      newRate: num,
    });
  };

  const handleConfirmRateChange = () => {
    if (!pendingUpdate) return;

    updateRate(
      pendingUpdate.category,
      pendingUpdate.newRate,
      currentUser?.name || 'Administrator'
    );

    showToast(
      `${pendingUpdate.category} rate successfully updated from ₹${pendingUpdate.oldRate} to ₹${pendingUpdate.newRate}/hr.`,
      'success'
    );

    setPendingUpdate(null);
    setEditingCategory(null);
    setEditValue('');
    setEditError(null);
  };

  const historyColumns: Column<RateHistoryItem>[] = [
    {
      key: 'date',
      header: 'Date & Time',
      render: (h) => <span className="text-xs text-neutral-600">{h.date}</span>,
    },
    {
      key: 'category',
      header: 'Vehicle Category',
      render: (h) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
          {h.category === 'Car' ? (
            <Car className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Bike className="w-3.5 h-3.5 text-accent" />
          )}
          <span>{h.category}</span>
        </div>
      ),
    },
    {
      key: 'oldRate',
      header: 'Old Rate',
      render: (h) => (
        <span className="text-xs text-neutral-500 font-mono line-through">₹{h.oldRate}/hr</span>
      ),
    },
    {
      key: 'newRate',
      header: 'New Rate',
      render: (h) => (
        <span className="text-xs font-bold text-neutral-900 font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
          ₹{h.newRate}/hr
        </span>
      ),
    },
    {
      key: 'changedBy',
      header: 'Changed By',
      render: (h) => (
        <span className="text-xs text-neutral-700 font-medium">{h.changedBy}</span>
      ),
    },
  ];

  return (
    <div className="max-w-[720px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <CircleDollarSign className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Rate Configuration
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Configure hourly billing rates for vehicle categories. Changes apply immediately to newly
          admitted sessions upon gate check-in.
        </p>
      </div>

      <div className="space-y-4">
        {rates.map((rateItem) => {
          const isEditing = editingCategory === rateItem.category;
          const isCar = rateItem.category === 'Car';

          return (
            <Card key={rateItem.id} className="p-6 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-control flex items-center justify-center shrink-0 ${
                      isCar ? 'bg-blue-50 text-primary' : 'bg-amber-50 text-accent'
                    }`}
                  >
                    {isCar ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      {rateItem.category} Hourly Rate
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Applicable to all standard {rateItem.category.toLowerCase()} parking bays
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:text-right">
                  {!isEditing ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-3xl font-extrabold text-neutral-900 font-mono">
                          ₹{rateItem.hourlyRate}
                        </span>
                        <span className="text-xs text-neutral-500 font-medium ml-1">/ hour</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => handleStartEdit(rateItem.category, rateItem.hourlyRate)}
                      >
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-2 text-neutral-400 font-bold text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              setEditError(null);
                            }}
                            className="w-full bg-white text-neutral-900 font-bold font-mono pl-7 pr-2 py-1.5 text-base rounded-control border border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                            autoFocus
                          />
                        </div>
                        <span className="text-xs text-neutral-500 font-medium">/hr</span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveClick(rateItem.category)}
                          title="Save Rate"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCancelEdit}
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {editError && (
                        <p className="text-xs text-danger font-semibold">{editError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated: {rateItem.lastUpdatedAt}
                </span>
                <span className="font-medium text-neutral-600">by {rateItem.lastUpdatedBy}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Rate Change History
            </h2>
          </div>
          <span className="text-xs text-neutral-400">{rateHistory.length} audit entries</span>
        </div>

        <Table
          columns={historyColumns}
          data={rateHistory}
          keyExtractor={(h) => h.id}
          emptyTitle="No rate change history"
          emptyDescription="Audit records will be recorded whenever a vehicle rate is modified."
        />
      </div>

      {pendingUpdate && (
        <ConfirmationModal
          isOpen={!!pendingUpdate}
          onClose={() => setPendingUpdate(null)}
          onConfirm={handleConfirmRateChange}
          title="Confirm Hourly Rate Modification"
          itemName={`${pendingUpdate.category} Rate: ₹${pendingUpdate.oldRate} → ₹${pendingUpdate.newRate}/hr`}
          message={`Update ${pendingUpdate.category} hourly rate from ₹${pendingUpdate.oldRate} to ₹${pendingUpdate.newRate}? This applies to all new sessions immediately.`}
          confirmLabel="Apply Rate Change"
        />
      )}
    </div>
  );
};
