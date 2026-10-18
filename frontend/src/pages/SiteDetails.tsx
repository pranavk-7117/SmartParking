import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Car,
  Bike,
  Users,
  BarChart3,
  CheckCircle2,
  Shield,
  Edit3,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Table, Column } from '../components/common/Table';
import { LineChart } from '../components/charts/SimpleCharts';
import { EmptyState } from '../components/common/EmptyState';
import { OperatorAccount } from '../types';

export const SiteDetails: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { sites, operators, allSlots, rates, allSessions, updateSite } = useLiveData();
  const { showToast } = useToast();

  const site = sites.find((s) => s.id === siteId);

  // Edit Site modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGateInfo, setEditGateInfo] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Coming Soon'>('Active');
  const [isSaving, setIsSaving] = useState(false);

  if (!site) {
    return (
      <div className="space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <EmptyState
          title="Site Not Found"
          description={`No physical parking site found matching "${siteId}".`}
          actionText="Return to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const siteSlots = allSlots.filter((s) => s.siteId === site.id);
  const siteOperators = operators.filter((op) => op.assignedSiteId === site.id);
  const siteRates = rates.filter((r) => r.siteId === site.id);
  const carRate = siteRates.find((r) => r.category === 'Car')?.hourlyRate || site.defaultCarRate;
  const scooterRate = siteRates.find((r) => r.category === 'Scooter')?.hourlyRate || site.defaultScooterRate;

  // Real completed sessions scoped strictly to this site (zero mock data)
  const siteCompleted = (allSessions || []).filter(
    (s) => (s.siteId === site.id || s.siteId === (site as any).code) && s.status === 'Completed'
  );

  // Calculate real total revenue strictly from transactions
  const totalWeeklyRevenue = siteCompleted.reduce((sum, s) => sum + (s.amount || 0), 0);

  // Real 7-day revenue trend dynamically computed from session records
  const revenueTrendPoints = useMemo(() => {
    const days: { label: string; dateStr: string; value: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      days.push({ label, dateStr, value: 0 });
    }

    siteCompleted.forEach((session) => {
      const timeStr = session.outTime || session.inTime;
      if (timeStr) {
        const sessionDate = new Date(timeStr).toISOString().split('T')[0];
        const matchingDay = days.find((day) => day.dateStr === sessionDate);
        if (matchingDay) {
          matchingDay.value += session.amount || 0;
        }
      }
    });

    return days.map(({ label, value }) => ({ label, value }));
  }, [siteCompleted]);

  const operatorColumns: Column<OperatorAccount>[] = [
    {
      key: 'name',
      header: 'Operator Name',
      render: (op) => (
        <div>
          <span className="font-bold text-neutral-900 block">{op.name}</span>
          <span className="text-xs text-neutral-500 font-mono">{op.username}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (op) => <span className="text-xs text-neutral-600">{op.contact}</span>,
    },
    {
      key: 'authMethod',
      header: 'Verification Status',
      render: (op) => (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill font-medium">
          <CheckCircle2 className="w-3 h-3 text-success" />
          {op.authMethod}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (op) => (
        <Badge variant={op.status === 'Active' ? 'Active' : 'Locked'}>
          {op.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (op) => (
        <Link
          to={`/operators/${op.id}`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          View Profile →
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-primary text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                {site.name}
              </h1>
              <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{site.address}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => {
              setEditName(site.name);
              setEditAddress(site.address);
              setEditGateInfo(site.gateInfo || '');
              setEditStatus(site.status as 'Active' | 'Coming Soon');
              setIsEditModalOpen(true);
            }}
          >
            Edit Site Details
          </Button>
          <span
            className={`px-3 py-1 rounded-pill text-xs font-bold ${
              site.status === 'Active'
                ? 'bg-emerald-50 text-success border border-emerald-200'
                : 'bg-amber-50 text-warning border border-amber-200'
            }`}
          >
            {site.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Gate & Terminal Setup
          </p>
          <p className="text-sm font-semibold text-neutral-900 leading-snug">
            {site.gateInfo}
          </p>
          <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-500 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Automated ANPR & Barrier Controls</span>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Capacity Breakdown
          </p>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              <span className="font-medium text-neutral-700">Car Slots:</span>
            </div>
            <span className="font-extrabold text-neutral-900">{site.totalCarSlots}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-accent" />
              <span className="font-medium text-neutral-700">Scooter Slots:</span>
            </div>
            <span className="font-extrabold text-neutral-900">{site.totalScooterSlots}</span>
          </div>
          <div className="pt-2 border-t border-neutral-100 flex justify-between text-xs font-bold text-neutral-800">
            <span>Total Bay Capacity:</span>
            <span>{site.totalCarSlots + site.totalScooterSlots} Bays</span>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Configured Hourly Tariff
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Cars:</span>
            <span className="font-extrabold text-neutral-900 font-mono">₹{carRate}/hr</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Scooters:</span>
            <span className="font-extrabold text-neutral-900 font-mono">₹{scooterRate}/hr</span>
          </div>
          <div className="pt-2 border-t border-neutral-100 text-xs text-primary">
            <Link to="/rates" className="hover:underline font-semibold">
              Manage Rates for this Site →
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-neutral-900">
                Site Financial Analysis (Past 7 Days)
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Revenue trend scoped exclusively to {site.name}
            </p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xs text-neutral-500 font-medium">7-Day Total:</span>
            <span className="text-xl font-black text-neutral-900">
              ₹{totalWeeklyRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="pt-2">
          {totalWeeklyRevenue > 0 ? (
            <LineChart
              data={revenueTrendPoints}
              valueFormatter={(val) => `₹${val.toLocaleString()}`}
            />
          ) : (
            <div className="py-8 text-center bg-neutral-50 rounded-control border border-neutral-100">
              <p className="text-xs font-semibold text-neutral-600">No completed sessions recorded yet for this facility.</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Revenue chart and trends will dynamically populate as vehicles check out.</p>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-neutral-900">
              Operator Roster ({siteOperators.length})
            </h2>
          </div>
          <Link to="/operators" className="text-xs font-semibold text-primary hover:underline">
            Manage All Operators →
          </Link>
        </div>

        <Table
          columns={operatorColumns}
          data={siteOperators}
          keyExtractor={(op) => op.id}
          emptyTitle="No Operators Assigned"
          emptyDescription={`No operators currently deployed at ${site.name}.`}
          emptyActionText="Assign Operator"
          onEmptyAction={() => navigate('/operators')}
        />
      </div>

      {/* Edit Site Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Site Details"
        description={`Update operational details for ${site.name}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editName.trim() || !editAddress.trim()) {
              showToast('Site Name and Address are required', 'error');
              return;
            }
            setIsSaving(true);
            try {
              await updateSite(site.id, {
                name: editName.trim(),
                address: editAddress.trim(),
                gateInfo: editGateInfo.trim() || 'Main Entrance Gate',
                status: editStatus,
              });
              showToast('Site details updated successfully.', 'success');
              setIsEditModalOpen(false);
            } catch {
              showToast('Failed to update site details.', 'error');
            } finally {
              setIsSaving(false);
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Site Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Physical Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            required
          />
          <Input
            label="Gate / Entrance Descriptor"
            value={editGateInfo}
            onChange={(e) => setEditGateInfo(e.target.value)}
            placeholder="e.g. Main Entrance Gate"
          />
          <Select
            label="Operational Status"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as 'Active' | 'Coming Soon')}
            options={[
              { value: 'Active', label: 'Active — Live Operations' },
              { value: 'Coming Soon', label: 'Coming Soon — Planned' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
