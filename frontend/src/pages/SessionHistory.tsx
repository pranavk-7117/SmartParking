import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Bike,
  Download,
  FileSpreadsheet,
  Printer,
  Eye,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Table, Column } from '../components/common/Table';
import { SearchInput, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ParkingSession } from '../types';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

function formatDateTime(str?: string | null): string {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return str;
  }
}

export const SessionHistory: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, currentSite } = useLiveData();
  const { showToast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  // Sorting state per §3.6.1
  const [sortColumn, setSortColumn] = useState<string>('inTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state per §3.5 (25/50/100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Filter & Sort logic
  const processedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      const matchesSearch =
        s.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slotId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

      let matchesDate = true;
      if (dateFilter === 'Today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        matchesDate = s.inTime.startsWith(todayStr);
      } else if (dateFilter === 'Yesterday') {
        const yestStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        matchesDate = s.inTime.startsWith(yestStr);
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });

    return filtered.sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [sessions, searchQuery, categoryFilter, statusFilter, dateFilter, sortColumn, sortDirection]);

  // Paginated slice
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedSessions.slice(start, start + pageSize);
  }, [processedSessions, currentPage, pageSize]);

  const handleExportCSV = () => {
    const headers = [
      'Session ID',
      'Vehicle No',
      'Category',
      'Slot ID',
      'In-Time',
      'Out-Time',
      'Duration (min)',
      'Amount (INR)',
      'Status',
    ];
    const rows = processedSessions.map((s) => [
      s.id,
      s.vehicleNumber,
      s.category,
      s.slotId,
      s.inTime,
      s.outTime || '',
      s.durationMinutes || 0,
      s.amount || 0,
      s.status,
    ]);
    exportToCSV(`parking_sessions_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Exported sessions to CSV file successfully.', 'success');
  };

  const handleExportPDF = () => {
    const headers = ['Session ID', 'Vehicle No', 'Cat.', 'Slot', 'In-Time', 'Out-Time', 'Duration', 'Amount', 'Status'];
    const rows = processedSessions.map((s) => [
      s.id,
      s.vehicleNumber,
      s.category,
      s.slotId,
      s.inTime,
      s.outTime || '— Active —',
      s.durationMinutes ? `${Math.floor(s.durationMinutes / 60)}h ${s.durationMinutes % 60}m` : 'Active',
      s.amount ? `INR ${s.amount}` : '—',
      s.status,
    ]);

    exportToPDF({
      filename: `parking_sessions_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: 'Parking Sessions Audit Trail',
      siteName: currentSite?.name,
      dateRange: dateFilter === 'Today' ? '04-Sep-2026' : dateFilter === 'Yesterday' ? '03-Sep-2026' : 'All Recorded Time',
      summaryStats: [
        { label: 'Total Sessions', value: processedSessions.length },
        { label: 'Completed', value: processedSessions.filter((s) => s.status === 'Completed').length },
        { label: 'Active', value: processedSessions.filter((s) => s.status === 'Active').length },
      ],
      headers,
      rows,
    });
    showToast('Downloaded PDF session report.', 'success');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setDateFilter('All');
    setCurrentPage(1);
  };

  const columns: Column<ParkingSession>[] = [
    {
      key: 'vehicleNumber',
      header: 'Vehicle No.',
      sortable: true,
      width: '18%',
      render: (s) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              s.category === 'Car' ? 'bg-blue-50 text-primary' : 'bg-amber-50 text-accent'
            }`}
          >
            {s.category === 'Car' ? <Car className="w-3.5 h-3.5" /> : <Bike className="w-3.5 h-3.5" />}
          </div>
          <span className="font-mono font-bold text-neutral-900 truncate" title={s.vehicleNumber}>
            {s.vehicleNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      width: '10%',
      render: (s) => <span className="text-xs font-semibold text-neutral-600">{s.category}</span>,
    },
    {
      key: 'slotId',
      header: 'Slot ID',
      sortable: true,
      width: '9%',
      render: (s) => (
        <span className="font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded text-xs">
          {s.slotId}
        </span>
      ),
    },
    {
      key: 'inTime',
      header: 'In-Time',
      sortable: true,
      width: '15%',
      render: (s) => (
        <span className="text-xs text-neutral-800 font-medium truncate block" title={s.inTime}>
          {formatDateTime(s.inTime)}
        </span>
      ),
    },
    {
      key: 'outTime',
      header: 'Out-Time',
      sortable: true,
      width: '15%',
      render: (s) => (
        <span className="text-xs text-neutral-600 truncate block" title={s.outTime || 'In Session'}>
          {s.outTime ? formatDateTime(s.outTime) : '— In Session —'}
        </span>
      ),
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      sortable: true,
      width: '11%',
      render: (s) => (
        <span className="text-xs font-medium text-neutral-700">
          {s.durationMinutes
            ? `${Math.floor(s.durationMinutes / 60)}h ${s.durationMinutes % 60}m`
            : 'Active'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      width: '9%',
      render: (s) => (
        <span className="font-bold text-sm text-neutral-900">
          {s.amount ? `₹${s.amount}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      width: '9%',
      render: (s) => <Badge variant={s.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '7%',
      render: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/sessions/${s.id}`)}
            className="p-1.5 rounded text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/sessions/${s.id}/receipt`)}
            className="p-1.5 rounded text-neutral-500 hover:text-primary hover:bg-neutral-100 transition-colors"
            title="Print Receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Session History</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit trail of vehicle entries, stays, exit timestamps, and billed receipts
          </p>
        </div>

        {/* Export Buttons per §3.5 */}
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

      {/* Filter Bar per §3.5 (sticky under top bar) */}
      <div className="bg-white p-4 rounded-card border border-neutral-200 shadow-soft space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          <div className="lg:col-span-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Vehicle No, Slot, Ticket ID..."
            />
          </div>

          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'All', label: 'All Categories' },
              { value: 'Car', label: 'Cars Only' },
              { value: 'Scooter', label: 'Scooters Only' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Active', label: 'Active Sessions' },
              { value: 'Completed', label: 'Completed' },
            ]}
          />

          <Select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'All', label: 'All Time' },
              { value: 'Today', label: 'Today (04-Sep)' },
              { value: 'Yesterday', label: 'Yesterday (03-Sep)' },
            ]}
          />
        </div>

        {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All') && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100">
            <span className="text-neutral-500">
              Found <strong className="text-neutral-900">{processedSessions.length}</strong> matching
              sessions
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-primary hover:underline font-semibold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Sessions Data Table per §3.5 */}
      <Table
        columns={columns}
        data={paginatedSessions}
        keyExtractor={(s) => s.id}
        onRowClick={(s) => navigate(`/sessions/${s.id}`)}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyTitle="No sessions match your filters."
        emptyDescription="Try clearing your search query or selecting a broader date range."
        emptyActionText="Clear Filters"
        onEmptyAction={resetFilters}
        pagination={{
          currentPage,
          pageSize,
          totalCount: processedSessions.length,
          onPageChange: (p) => setCurrentPage(p),
          onPageSizeChange: (s) => {
            setPageSize(s);
            setCurrentPage(1);
          },
        }}
      />
    </div>
  );
};
