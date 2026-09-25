import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Car,
  Bike,
  ParkingSquare,
  TrendingUp,
  Receipt,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { OccupancyCard, StatCard, Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table, Column } from '../components/common/Table';
import { Sparkline } from '../components/charts/SimpleCharts';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { ParkingSession, QuickAlert } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { availability, sessions, alerts, hasRecentUpdate, dismissAlert } = useLiveData();

  const [selectedReceiptSession, setSelectedReceiptSession] = useState<ParkingSession | null>(null);

  const recentTransactions = sessions.slice(0, 10);

  const todayCompleted = sessions.filter((s) => s.status === 'Completed');
  const todayRevenue = todayCompleted.reduce((sum, s) => sum + (s.amount || 0), 6450);
  const carCompletedCount = todayCompleted.filter((s) => s.category === 'Car').length + 98;
  const scooterCompletedCount = todayCompleted.filter((s) => s.category === 'Scooter').length + 64;
  const totalCompletedCount = carCompletedCount + scooterCompletedCount;

  const revenueTrendData = [7420, 8150, 6890, 9240, 8760, 9680, todayRevenue];

  const columns: Column<ParkingSession>[] = [
    {
      key: 'vehicleNumber',
      header: 'Vehicle No.',
      render: (session) => (
        <div className="font-mono font-bold text-neutral-900 flex items-center gap-1.5">
          {session.category === 'Car' ? (
            <Car className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Bike className="w-3.5 h-3.5 text-accent" />
          )}
          <span>{session.vehicleNumber}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (session) => (
        <span className="text-xs font-medium text-neutral-600">{session.category}</span>
      ),
    },
    {
      key: 'slotId',
      header: 'Slot ID',
      render: (session) => (
        <span className="font-mono font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded text-xs">
          {session.slotId}
        </span>
      ),
    },
    {
      key: 'inTime',
      header: 'In-Time',
      render: (session) => <span className="text-xs text-neutral-500">{session.inTime}</span>,
    },
    {
      key: 'outTime',
      header: 'Out-Time',
      render: (session) => (
        <span className="text-xs text-neutral-500">{session.outTime || '— In Session —'}</span>
      ),
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      render: (session) => (
        <span className="text-xs font-medium text-neutral-700">
          {session.durationMinutes
            ? `${Math.floor(session.durationMinutes / 60)}h ${session.durationMinutes % 60}m`
            : 'Active'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (session) => (
        <span className="font-bold text-sm text-neutral-900">
          {session.amount ? `₹${session.amount}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (session) => <Badge variant={session.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (session) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedReceiptSession(session)}
            className="p-1.5 rounded text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
            title="View / Print Receipt"
            aria-label="View Receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Operational Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time live occupancy and today's operational summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">
            Last updated: {new Date(availability.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <OccupancyCard
          title="Car Slots"
          available={availability.carAvailable}
          total={availability.carTotal}
          icon={<Car className="w-5 h-5 text-primary" />}
          iconBg="bg-blue-50 text-primary"
          isUpdating={hasRecentUpdate}
        />
        <OccupancyCard
          title="Scooter Slots"
          available={availability.scooterAvailable}
          total={availability.scooterTotal}
          icon={<Bike className="w-5 h-5 text-accent" />}
          iconBg="bg-amber-50 text-accent"
          isUpdating={hasRecentUpdate}
        />
        <OccupancyCard
          title="Total Slots"
          available={availability.totalAvailable}
          total={availability.totalSlots}
          icon={<ParkingSquare className="w-5 h-5 text-success" />}
          iconBg="bg-emerald-50 text-success"
          isUpdating={hasRecentUpdate}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard
          title="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString()}`}
          trend={{ value: 8.4, isPositive: true }}
          subtitle="vs. yesterday (Click for Revenue Report →)"
          icon={<span className="font-bold text-lg text-primary">₹</span>}
          sparkline={<Sparkline data={revenueTrendData} color="#1E3A8A" />}
          hoverable={true}
          onClick={() => navigate('/reports?tab=Revenue&range=Today')}
        />

        <Card
          className="p-5 flex flex-col justify-between"
          hoverable={true}
          onClick={() => navigate('/reports?tab=Transactions&range=Today')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Today's Transactions
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-neutral-900">
                  {totalCompletedCount}
                </span>
                <span className="text-xs text-neutral-400">completed sessions</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-control flex items-center justify-center shrink-0 bg-emerald-50 text-success">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-medium text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Cars: {carCompletedCount}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span>Scooters: {scooterCompletedCount}</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-primary hover:underline">
              View Transactions →
            </span>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Recent Transactions</h2>
          <Link
            to="/sessions"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-light transition-colors"
          >
            <span>View all sessions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Table
          columns={columns}
          data={recentTransactions}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/sessions/${item.id}`)}
          emptyTitle="No recent transactions"
          emptyDescription="Vehicle movements will appear here automatically."
        />
      </div>

      {/* Row 4: Quick Alerts Panel */}
      <Card className="p-5 border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              System Quick Alerts
            </h2>
          </div>
          <span className="text-xs text-neutral-400">{alerts.length} active flags</span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-4 rounded-control bg-emerald-50/50 border border-emerald-100 flex items-center gap-3 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>No alerts — everything's running smoothly.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-control border flex items-start justify-between gap-3 text-xs ${
                  alert.severity === 'danger'
                    ? 'bg-red-50/60 border-red-200 text-red-900'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : 'bg-blue-50/60 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{alert.title}</p>
                    <p className="opacity-80 mt-0.5 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] opacity-70">{alert.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    className="text-neutral-500 hover:text-neutral-800 font-semibold text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ReceiptModal
        isOpen={!!selectedReceiptSession}
        onClose={() => setSelectedReceiptSession(null)}
        session={selectedReceiptSession}
      />
    </div>
  );
};
