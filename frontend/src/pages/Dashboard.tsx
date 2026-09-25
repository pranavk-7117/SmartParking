import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  Building2,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { OccupancyCard, StatCard, Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table, Column } from '../components/common/Table';
import { Sparkline, BarChart } from '../components/charts/SimpleCharts';
import { ProgressBar } from '../components/common/ProgressBar';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { ParkingSession, ReportData } from '../types';
import { api } from '../api/client';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    sites,
    currentSiteId,
    currentSite,
    setCurrentSiteId,
    availability,
    allSlots,
    slots,
    allSessions,
    sessions,
    alerts,
    hasRecentUpdate,
    dismissAlert,
  } = useLiveData();

  const [selectedReceiptSession, setSelectedReceiptSession] = useState<ParkingSession | null>(null);
  const [revenueTrendData, setRevenueTrendData] = useState<number[]>([]);

  // Fetch real revenue trend from backend reports API
  useEffect(() => {
    const reportSiteQuery = currentSiteId === 'all' ? '' : `&siteId=${encodeURIComponent(currentSiteId)}`;
    api
      .get<ReportData>(`/reports?type=Revenue&range=This%20Week${reportSiteQuery}`)
      .then((res) => {
        if (res?.dataPoints?.length) {
          const values = res.dataPoints.map((dp) => dp.value + (dp.secondaryValue || 0));
          setRevenueTrendData(values);
        }
      })
      .catch((err) => {
        console.error('[Dashboard] Failed to fetch revenue trend:', err);
      });
  }, [currentSiteId]);

  // Today's completed sessions for current scope (single site or all combined)
  const todayCompleted = useMemo(() => {
    return sessions.filter((s) => s.status === 'Completed');
  }, [sessions]);

  // Real today's revenue calculated strictly from DB session bills
  const todayRevenue = useMemo(() => {
    return todayCompleted.reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [todayCompleted]);

  const carCompletedCount = useMemo(() => {
    return todayCompleted.filter((s) => s.category === 'Car').length;
  }, [todayCompleted]);

  const scooterCompletedCount = useMemo(() => {
    return todayCompleted.filter((s) => s.category === 'Scooter').length;
  }, [todayCompleted]);

  const totalCompletedCount = carCompletedCount + scooterCompletedCount;

  // Active parked vehicles right now
  const activeSessionsCount = useMemo(() => {
    return sessions.filter((s) => s.status === 'Active').length;
  }, [sessions]);

  const recentTransactions = useMemo(() => {
    return sessions.slice(0, 10);
  }, [sessions]);

  // Per-site performance summary when in Combined View
  const sitePerformance = useMemo(() => {
    return sites.map((st) => {
      const siteSlots = allSlots.filter((sl) => sl.siteId === st.id);
      const siteSessions = allSessions.filter((ss) => ss.siteId === st.id);
      const siteCompleted = siteSessions.filter((ss) => ss.status === 'Completed');
      const siteRevenue = siteCompleted.reduce((sum, ss) => sum + (ss.amount || 0), 0);

      const carSlots = siteSlots.filter((sl) => sl.category === 'Car');
      const scooterSlots = siteSlots.filter((sl) => sl.category === 'Scooter');
      const carVacant = carSlots.filter((sl) => sl.status === 'Vacant').length;
      const scooterVacant = scooterSlots.filter((sl) => sl.status === 'Vacant').length;
      const totalVacant = carVacant + scooterVacant;
      const totalCapacity = siteSlots.length;

      return {
        site: st,
        slotsCount: totalCapacity,
        vacantCount: totalVacant,
        occupiedCount: totalCapacity - totalVacant,
        carTotal: carSlots.length,
        carVacant,
        scooterTotal: scooterSlots.length,
        scooterVacant,
        revenue: siteRevenue,
        completedCount: siteCompleted.length,
        occupancyPct: totalCapacity > 0 ? Math.round(((totalCapacity - totalVacant) / totalCapacity) * 100) : 0,
      };
    });
  }, [sites, allSlots, allSessions]);

  // Bar chart data for comparing sites occupancy side by side
  const siteComparisonChartData = useMemo(() => {
    return sitePerformance.map((sp) => ({
      label: sp.site.name.replace('AeroPark – ', ''),
      value: sp.carVacant,
      secondaryValue: sp.scooterVacant,
    }));
  }, [sitePerformance]);

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
    ...(currentSiteId === 'all'
      ? [
          {
            key: 'siteName',
            header: 'Facility Site',
            render: (session: ParkingSession) => (
              <span className="font-semibold text-xs text-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {session.siteName || session.siteId}
              </span>
            ),
          },
        ]
      : []),
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
          {session.amount !== null && session.amount !== undefined ? `₹${session.amount}` : '—'}
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
      {/* Top Banner / Scope Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-card border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-control bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {currentSiteId === 'all' ? <Layers className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-neutral-900 tracking-tight">
                {currentSiteId === 'all' ? 'Multi-Site Network Dashboard' : currentSite.name}
              </h1>
              {currentSiteId === 'all' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-pill">
                  {sites.length} Sites Combined
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-pill border border-neutral-200">
                  {currentSite.status}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {currentSiteId === 'all'
                ? `Consolidated live overview of all ${sites.length} parking facilities across the network`
                : `${currentSite.address || 'Facility'} • Gate: ${currentSite.gateInfo || 'Main Gate'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentSiteId !== 'all' ? (
            <button
              type="button"
              onClick={() => setCurrentSiteId('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Switch to All Sites Combined</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-control border border-neutral-200">
              Live Network Mode
            </span>
          )}
          <span className="text-xs text-neutral-400">
            Updated: {new Date(availability.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Row 1: Bay Availability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <OccupancyCard
          title={currentSiteId === 'all' ? 'All Car Slots' : 'Car Slots'}
          available={availability.carAvailable}
          total={availability.carTotal}
          icon={<Car className="w-5 h-5 text-primary" />}
          iconBg="bg-blue-50 text-primary"
          isUpdating={hasRecentUpdate}
        />
        <OccupancyCard
          title={currentSiteId === 'all' ? 'All Scooter Slots' : 'Scooter Slots'}
          available={availability.scooterAvailable}
          total={availability.scooterTotal}
          icon={<Bike className="w-5 h-5 text-accent" />}
          iconBg="bg-amber-50 text-accent"
          isUpdating={hasRecentUpdate}
        />
        <OccupancyCard
          title={currentSiteId === 'all' ? 'Total Network Slots' : 'Total Slots'}
          available={availability.totalAvailable}
          total={availability.totalSlots}
          icon={<ParkingSquare className="w-5 h-5 text-success" />}
          iconBg="bg-emerald-50 text-success"
          isUpdating={hasRecentUpdate}
        />
      </div>

      {/* Row 2: Today's Revenue & Completed Sessions & Active Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title={currentSiteId === 'all' ? "Combined Today's Revenue" : "Today's Revenue"}
          value={`₹${todayRevenue.toLocaleString()}`}
          subtitle="Real-time revenue from completed sessions"
          icon={<span className="font-bold text-lg text-primary">₹</span>}
          sparkline={
            revenueTrendData.length >= 2 ? (
              <Sparkline data={revenueTrendData} color="#1E3A8A" />
            ) : undefined
          }
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
                {currentSiteId === 'all' ? "Combined Transactions" : "Today's Transactions"}
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

        <Card
          className="p-5 flex flex-col justify-between"
          hoverable={true}
          onClick={() => navigate('/slots')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Active In-Bay Sessions
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-primary">
                  {activeSessionsCount}
                </span>
                <span className="text-xs text-neutral-400">currently parked</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-control flex items-center justify-center shrink-0 bg-blue-50 text-primary">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              {availability.totalAvailable} vacant bays ready for incoming vehicles
            </span>
            <span className="text-[11px] font-semibold text-primary hover:underline">
              Bay Inventory →
            </span>
          </div>
        </Card>
      </div>

      {/* Row 3: When in COMBINED Mode, show the Per-Location Comparison Grid & Chart */}
      {currentSiteId === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Facility-by-Facility Breakdown
              </h2>
              <p className="text-xs text-neutral-500">
                Live capacity, occupancy rate, and revenue across individual facilities
              </p>
            </div>
            <span className="text-xs font-semibold text-neutral-400">
              {sites.length} Active Facilities
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitePerformance.map((sp) => (
              <Card
                key={sp.site.id}
                className="p-5 hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-neutral-900 text-sm">{sp.site.name}</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{sp.site.address}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-pill shrink-0">
                      {sp.site.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 bg-neutral-50 p-2.5 rounded-control">
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase">Available Bays</p>
                      <p className="text-lg font-extrabold text-neutral-900 mt-0.5">
                        {sp.vacantCount}{' '}
                        <span className="text-xs font-normal text-neutral-400">/ {sp.slotsCount}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase">Today's Revenue</p>
                      <p className="text-lg font-extrabold text-primary mt-0.5">₹{sp.revenue.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                        <span className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-primary" /> Cars
                        </span>
                        <span className="font-semibold">
                          {sp.carVacant} / {sp.carTotal} vacant
                        </span>
                      </div>
                      <ProgressBar current={sp.carVacant} total={sp.carTotal} size="sm" showLabels={false} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                        <span className="flex items-center gap-1">
                          <Bike className="w-3.5 h-3.5 text-accent" /> Scooters
                        </span>
                        <span className="font-semibold">
                          {sp.scooterVacant} / {sp.scooterTotal} vacant
                        </span>
                      </div>
                      <ProgressBar current={sp.scooterVacant} total={sp.scooterTotal} size="sm" showLabels={false} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    {sp.completedCount} completed sessions
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentSiteId(sp.site.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                  >
                    <span>Focus Site</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Visual Bar Chart: Vacant Bays by Location */}
          {siteComparisonChartData.length > 0 && (
            <Card className="p-5 border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Live Vacancy Comparison by Facility
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Side-by-side available car and scooter bays across physical locations
                  </p>
                </div>
              </div>
              <BarChart
                data={siteComparisonChartData}
                primaryLabel="Car Bays Available"
                secondaryLabel="Scooter Bays Available"
                valueFormatter={(v) => `${v} vacant`}
              />
            </Card>
          )}
        </div>
      )}

      {/* Row 4: Recent Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {currentSiteId === 'all' ? 'Network Recent Transactions' : 'Recent Transactions'}
            </h2>
            <p className="text-xs text-neutral-500">
              {currentSiteId === 'all'
                ? 'Latest vehicle entries and exits recorded across all network locations'
                : `Latest vehicle movements recorded at ${currentSite.name}`}
            </p>
          </div>
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

      {/* Row 5: Quick Alerts Panel */}
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
            <span>No alerts — all parking hardware and ANPR cameras operating normally.</span>
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
