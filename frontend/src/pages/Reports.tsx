import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  Receipt,
  Percent,
  Clock,
  Car,
  Activity,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLiveData } from '../context/LiveDataContext';
import { Card, StatCard } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Input';
import { Table, Column } from '../components/common/Table';
import { BarChart, LineChart } from '../components/charts/SimpleCharts';
import { SkeletonChart, SkeletonCard } from '../components/common/Skeleton';
import { ReportData, ReportDataPoint } from '../types';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { api } from '../api/client';

const EMPTY_REPORT: ReportData = {
  type: 'Revenue',
  dataPoints: [],
  summary: { totalRevenue: 0, peakOccupancyPct: 0, avgDurationMinutes: 0, totalTransactions: 0 },
};

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const { currentSite, currentSiteId } = useLiveData();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const rangeParam = searchParams.get('range');

  const [reportType, setReportType] = useState<'Revenue' | 'Occupancy' | 'Duration' | 'Transactions'>('Revenue');
  const [dateRange, setDateRange] = useState<string>('This Week');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData>(EMPTY_REPORT);

  useEffect(() => {
    if (tabParam) {
      if (['Revenue', 'Occupancy', 'Duration', 'Transactions'].includes(tabParam)) {
        setReportType(tabParam as 'Revenue' | 'Occupancy' | 'Duration' | 'Transactions');
      }
    }
    if (rangeParam) {
      setDateRange(rangeParam);
    }
  }, [tabParam, rangeParam]);

  const fetchReport = useCallback(async (type: string, range: string, siteId: string) => {
    if (!siteId) return;
    setIsLoading(true);
    try {
      const data = await api.get<ReportData>(
        `/reports?type=${encodeURIComponent(type)}&range=${encodeURIComponent(range)}&siteId=${encodeURIComponent(siteId)}`
      );
      setReportData(data);
    } catch (err) {
      console.error('[Reports] fetch failed:', err);
      setReportData({ ...EMPTY_REPORT, type: type as ReportData['type'] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(reportType, dateRange, currentSiteId);
  }, [reportType, dateRange, currentSiteId, fetchReport]);

  const handleTabChange = (newType: 'Revenue' | 'Occupancy' | 'Duration' | 'Transactions') => {
    setReportType(newType);
    setSearchParams((prev) => {
      prev.set('tab', newType);
      return prev;
    });
  };

  const currentReport = reportData;

  // Apply the Car/Scooter category filter to the underlying data points.
  // Previously `categoryFilter` was only used in display text and never
  // actually applied, so selecting "Car Only" / "Scooter Only" had no
  // effect on the chart, table, or exports.
  const filteredDataPoints: ReportDataPoint[] = currentReport.dataPoints.map((d) => {
    if (reportType === 'Occupancy' || d.secondaryValue === undefined) {
      // Occupancy is a single combined metric with no car/scooter split.
      return d;
    }
    if (categoryFilter === 'Car') {
      return { ...d, secondaryValue: undefined };
    }
    if (categoryFilter === 'Scooter') {
      return { ...d, value: d.secondaryValue ?? 0, secondaryValue: undefined };
    }
    return d;
  });

  const isSplitByVehicle = reportType !== 'Occupancy';
  const primaryChartLabel =
    reportType === 'Transactions'
      ? categoryFilter === 'Scooter'
        ? 'Scooters'
        : 'Cars'
      : reportType === 'Duration'
      ? categoryFilter === 'Scooter'
        ? 'Scooters'
        : 'Cars'
      : categoryFilter === 'Scooter'
      ? 'Scooters Revenue'
      : 'Cars Revenue';
  // Pass '' (not undefined) when there's no secondary series so BarChart's
  // default-parameter fallback doesn't re-introduce a "Scooters" legend
  // entry for a filtered, single-series view.
  const secondaryChartLabel =
    categoryFilter === 'All' && isSplitByVehicle
      ? reportType === 'Revenue'
        ? 'Scooters Revenue'
        : 'Scooters'
      : '';

  const handleExportCSV = () => {
    const headers = [
      reportType === 'Revenue'
        ? 'Date'
        : reportType === 'Occupancy'
        ? 'Time of Day'
        : reportType === 'Duration'
        ? 'Duration Bracket'
        : 'Date',
      reportType === 'Revenue'
        ? 'Car Revenue (INR)'
        : reportType === 'Occupancy'
        ? 'Car Occupancy (%)'
        : reportType === 'Duration'
        ? 'Cars Count'
        : 'Cars Transactions',
      ...(reportType !== 'Occupancy'
        ? [
            reportType === 'Revenue'
              ? 'Scooter Revenue (INR)'
              : reportType === 'Duration'
              ? 'Scooters Count'
              : 'Scooters Transactions',
            'Combined Total',
          ]
        : []),
    ];

    const rows = filteredDataPoints.map((d) => {
      const row: (string | number)[] = [d.label, d.value];
      if (reportType !== 'Occupancy') {
        row.push(d.secondaryValue || 0);
        row.push(d.value + (d.secondaryValue || 0));
      }
      return row;
    });

    exportToCSV(`report_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(`Exported ${reportType} report data to CSV successfully.`, 'success');
  };

  const handleExportPDF = () => {
    const headers = [
      reportType === 'Revenue'
        ? 'Period'
        : reportType === 'Occupancy'
        ? 'Time'
        : reportType === 'Duration'
        ? 'Duration'
        : 'Date',
      reportType === 'Revenue' ? 'Cars (INR)' : reportType === 'Occupancy' ? 'Occupancy' : 'Cars',
      ...(reportType !== 'Occupancy' ? ['Scooters', 'Total'] : []),
    ];

    const rows = filteredDataPoints.map((d) => {
      const row: (string | number)[] = [
        d.label,
        reportType === 'Revenue' ? `INR ${d.value}` : reportType === 'Occupancy' ? `${d.value}%` : d.value,
      ];
      if (reportType !== 'Occupancy') {
        row.push(reportType === 'Revenue' ? `INR ${d.secondaryValue || 0}` : d.secondaryValue || 0);
        row.push(
          reportType === 'Revenue'
            ? `INR ${d.value + (d.secondaryValue || 0)}`
            : d.value + (d.secondaryValue || 0)
        );
      }
      return row;
    });

    exportToPDF({
      filename: `report_${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: `${reportType} Analytics Summary`,
      siteName: currentSite?.name,
      dateRange: `${dateRange} (${categoryFilter} vehicles)`,
      summaryStats: [
        { label: 'Total Revenue', value: `INR ${currentReport.summary.totalRevenue.toLocaleString()}` },
        { label: 'Peak Occupancy', value: `${currentReport.summary.peakOccupancyPct}%` },
        { label: 'Avg Stay', value: `${Math.floor(currentReport.summary.avgDurationMinutes / 60)}h ${currentReport.summary.avgDurationMinutes % 60}m` },
        { label: 'Transactions', value: currentReport.summary.totalTransactions ?? 0 },
      ],
      headers,
      rows,
    });
    showToast(`Downloaded ${reportType} PDF report successfully.`, 'success');
  };

  const tableColumns: Column<ReportDataPoint>[] = [
    {
      key: 'label',
      header:
        reportType === 'Revenue'
          ? 'Date'
          : reportType === 'Occupancy'
          ? 'Time of Day'
          : reportType === 'Duration'
          ? 'Stay Duration Bracket'
          : 'Date',
      render: (d) => <span className="font-semibold text-neutral-900">{d.label}</span>,
    },
    {
      key: 'value',
      header:
        reportType === 'Revenue'
          ? `${primaryChartLabel}`
          : reportType === 'Occupancy'
          ? 'Bay Occupancy'
          : reportType === 'Duration'
          ? `${primaryChartLabel} Count`
          : `${primaryChartLabel} Transactions`,
      align: 'right',
      render: (d) => (
        <span className="font-mono text-sm font-bold text-neutral-900">
          {reportType === 'Revenue'
            ? `₹${d.value.toLocaleString()}`
            : reportType === 'Occupancy'
            ? `${d.value}%`
            : reportType === 'Duration'
            ? `${d.value} vehicles`
            : `${d.value} txns`}
        </span>
      ),
    },
    ...(reportType !== 'Occupancy' && filteredDataPoints[0]?.secondaryValue !== undefined
      ? [
          {
            key: 'secondaryValue',
            header:
              reportType === 'Revenue'
                ? 'Scooters Revenue'
                : reportType === 'Duration'
                ? 'Scooter Count'
                : 'Scooter Transactions',
            align: 'right' as const,
            render: (d: ReportDataPoint) => (
              <span className="font-mono text-sm font-bold text-amber-600">
                {reportType === 'Revenue'
                  ? `₹${(d.secondaryValue || 0).toLocaleString()}`
                  : reportType === 'Duration'
                  ? `${d.secondaryValue || 0} vehicles`
                  : `${d.secondaryValue || 0} txns`}
              </span>
            ),
          },
          {
            key: 'total',
            header: 'Combined Total',
            align: 'right' as const,
            render: (d: ReportDataPoint) => {
              const total = d.value + (d.secondaryValue || 0);
              return (
                <span className="font-mono text-sm font-black text-neutral-950">
                  {reportType === 'Revenue'
                    ? `₹${total.toLocaleString()}`
                    : reportType === 'Duration'
                    ? `${total} vehicles`
                    : `${total} txns`}
                </span>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Historical revenue metrics, facility occupancy peaks, volume transactions, and stay duration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-card border border-neutral-200 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-neutral-100 p-1 rounded-control border border-neutral-200 w-full md:w-auto">
          {(['Revenue', 'Occupancy', 'Duration', 'Transactions'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all ${
                reportType === tab
                  ? 'bg-white text-primary shadow-xs font-extrabold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab === 'Revenue'
                ? 'Revenue'
                : tab === 'Occupancy'
                ? 'Occupancy %'
                : tab === 'Duration'
                ? 'Avg. Duration'
                : 'Transactions'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="w-36">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: 'Today', label: 'Today' },
                { value: 'This Week', label: 'This Week' },
                { value: 'This Month', label: 'This Month' },
                { value: 'Custom', label: 'Custom Range' },
              ]}
            />
          </div>

          <div className="w-36">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Vehicles' },
                { value: 'Car', label: 'Car Only' },
                { value: 'Scooter', label: 'Scooter Only' },
              ]}
            />
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              {reportType === 'Revenue'
                ? 'Daily Revenue Generation (₹)'
                : reportType === 'Occupancy'
                ? 'Facility Occupancy Utilization Rate (%)'
                : reportType === 'Duration'
                ? 'Duration Distribution by Vehicle Category'
                : 'Daily Transaction Volume (Completed Check-outs)'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Showing aggregated data for {dateRange} ({categoryFilter} categories) · Scoped to{' '}
              {currentSite?.name}
            </p>
          </div>
        </div>

        {isLoading ? (
          <SkeletonChart height="h-72" />
        ) : reportType === 'Revenue' ? (
          <BarChart
            data={filteredDataPoints}
            primaryLabel={primaryChartLabel}
            secondaryLabel={secondaryChartLabel}
            singleSeriesColor={categoryFilter === 'Scooter' ? 'accent' : 'primary'}
            valueFormatter={(val) => `₹${val.toLocaleString()}`}
          />
        ) : reportType === 'Occupancy' ? (
          <LineChart
            data={filteredDataPoints}
            valueFormatter={(val) => `${val}% capacity`}
          />
        ) : reportType === 'Duration' ? (
          <BarChart
            data={filteredDataPoints}
            primaryLabel={primaryChartLabel}
            secondaryLabel={secondaryChartLabel}
            singleSeriesColor={categoryFilter === 'Scooter' ? 'accent' : 'primary'}
            valueFormatter={(val) => `${val} vehicles`}
          />
        ) : (
          <BarChart
            data={filteredDataPoints}
            primaryLabel={primaryChartLabel}
            secondaryLabel={secondaryChartLabel}
            singleSeriesColor={categoryFilter === 'Scooter' ? 'accent' : 'primary'}
            valueFormatter={(val) => `${val} transactions`}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={`₹${currentReport.summary.totalRevenue.toLocaleString()}`}
              subtitle="in selected period"
              trend={{ value: 12.5, isPositive: true }}
              icon={<Receipt className="w-5 h-5 text-primary" />}
            />
            <StatCard
              title="Peak Occupancy"
              value={`${currentReport.summary.peakOccupancyPct}%`}
              subtitle="at peak hour (6 PM)"
              trend={{ value: 4.2, isPositive: true }}
              icon={<Percent className="w-5 h-5 text-accent" />}
              iconBg="bg-amber-50 text-accent"
            />
            <StatCard
              title="Avg Stay Duration"
              value={`${Math.floor(currentReport.summary.avgDurationMinutes / 60)}h ${
                currentReport.summary.avgDurationMinutes % 60
              }m`}
              subtitle="across all categories"
              icon={<Clock className="w-5 h-5 text-success" />}
              iconBg="bg-emerald-50 text-success"
            />
            <StatCard
              title={reportType === 'Transactions' ? 'Total Volume' : 'Total Sessions'}
              value={currentReport.summary.totalTransactions?.toLocaleString() || '1,074'}
              subtitle="completed check-outs"
              icon={<Activity className="w-5 h-5 text-primary" />}
            />
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
            Tabular Breakdown Data
          </h2>
          <span className="text-xs text-neutral-400">
            {filteredDataPoints.length} data intervals
          </span>
        </div>

        <Table
          columns={tableColumns}
          data={filteredDataPoints}
          keyExtractor={(d) => d.label}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
