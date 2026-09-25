import React from 'react';
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
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table, Column } from '../components/common/Table';
import { LineChart } from '../components/charts/SimpleCharts';
import { EmptyState } from '../components/common/EmptyState';
import { OperatorAccount } from '../types';

export const SiteDetails: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { sites, operators, allSlots, rates } = useLiveData();

  const site = sites.find((s) => s.id === siteId);

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

  const revenueTrendPoints = [
    { label: '29-Aug', value: site.id === 'site-hadapsar' ? 6840 : 4210 },
    { label: '30-Aug', value: site.id === 'site-hadapsar' ? 7210 : 4550 },
    { label: '31-Aug', value: site.id === 'site-hadapsar' ? 8120 : 5100 },
    { label: '01-Sep', value: site.id === 'site-hadapsar' ? 7850 : 4920 },
    { label: '02-Sep', value: site.id === 'site-hadapsar' ? 8640 : 5430 },
    { label: '03-Sep', value: site.id === 'site-hadapsar' ? 9110 : 5890 },
    { label: '04-Sep', value: site.id === 'site-hadapsar' ? 6450 : 3820 },
  ];

  const totalWeeklyRevenue = revenueTrendPoints.reduce((acc, curr) => acc + curr.value, 0);

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
          <LineChart
            data={revenueTrendPoints}
            valueFormatter={(val) => `₹${val.toLocaleString()}`}
          />
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
    </div>
  );
};
