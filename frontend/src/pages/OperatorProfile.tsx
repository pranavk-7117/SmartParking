import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  History,
  Activity,
  ShieldCheck,
  MapPin,
  Clock,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table, Column } from '../components/common/Table';
import { EmptyState } from '../components/common/EmptyState';
import { SiteReassignmentEvent } from '../types';

export const OperatorProfile: React.FC = () => {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const { operators, sites } = useLiveData();

  const operator = operators.find((op) => op.id === operatorId);

  if (!operator) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          to="/operators"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operator Management</span>
        </Link>
        <EmptyState
          title="Operator Not Found"
          description={`No record found matching operator identifier "${operatorId}".`}
          actionText="Return to Operator Management"
          onAction={() => navigate('/operators')}
        />
      </div>
    );
  }

  const assignedSite = sites.find((s) => s.id === operator.assignedSiteId);

  const reassignmentColumns: Column<SiteReassignmentEvent>[] = [
    {
      key: 'reassignedAt',
      header: 'Effective Date',
      sortable: true,
      render: (r) => <span className="text-xs text-neutral-600 font-medium">{r.reassignedAt}</span>,
    },
    {
      key: 'fromSiteName',
      header: 'Transferred From',
      render: (r) => (
        <span className="text-xs text-neutral-700 font-semibold">{r.fromSiteName}</span>
      ),
    },
    {
      key: 'toSiteName',
      header: 'Assigned To',
      render: (r) => (
        <span className="text-xs text-primary font-bold">{r.toSiteName}</span>
      ),
    },
    {
      key: 'reassignedBy',
      header: 'Authorized By',
      render: (r) => <span className="text-xs text-neutral-600">{r.reassignedBy}</span>,
    },
    {
      key: 'reason',
      header: 'Transfer Reason',
      render: (r) => (
        <span className="text-xs text-neutral-500 italic">
          {r.reason || 'General operational allocation'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/operators"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Operator Management</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              {operator.name}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                operator.status === 'Active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {operator.status}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Basic Identity Info */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-black text-lg flex items-center justify-center shrink-0">
              {operator.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">{operator.name}</h2>
              <p className="text-xs text-neutral-500 font-mono">{operator.id}</p>
            </div>
          </div>

          <div className="divide-y divide-neutral-100 text-xs pt-2">
            <div className="py-2 flex justify-between items-center">
              <span className="text-neutral-500">Contact Phone:</span>
              <span className="font-mono font-bold text-neutral-900">{operator.contact}</span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-neutral-500">Google Email:</span>
              <span className="font-mono font-medium text-neutral-800 truncate max-w-[170px]" title={operator.username}>
                {operator.username}
              </span>
            </div>
            <div className="py-2 flex justify-between items-center">
              <span className="text-neutral-500">Date Enrolled:</span>
              <span className="font-medium text-neutral-800">{operator.dateAdded}</span>
            </div>
          </div>
        </Card>

        {/* Operational Terminal & Verification */}
        <Card className="p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Current Deployment
          </h2>

          <div className="p-3.5 bg-neutral-50 rounded-control border border-neutral-200 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-bold text-neutral-900">
                {assignedSite?.name || operator.assignedSiteId}
              </span>
            </div>
            <p className="text-xs text-neutral-500 leading-snug">
              {assignedSite?.address || 'Site physical address'}
            </p>
            <div className="pt-1 text-[11px] text-neutral-600">
              Gate Assignment: <strong className="text-neutral-800">{assignedSite?.gateInfo}</strong>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="p-3 bg-emerald-50 rounded-control border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Google Identity Verified</div>
              <div className="text-[11px] text-emerald-700">OAuth authenticated via native Android app</div>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <Card className="p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Activity Summary
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-center">
              <div className="text-2xl font-black text-neutral-900">
                {operator.sessionsProcessedCount.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 mt-1">
                Sessions Handled
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-center">
              <div className="text-2xl font-black text-neutral-900">
                {operator.reassignmentHistory.length}
              </div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 mt-1">
                Site Transfers
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-neutral-100/70 rounded-control text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Shift Attendance & Payroll:</span>
            <span className="font-semibold text-neutral-700">Planned Phase 2</span>
          </div>
        </Card>
      </div>

      {/* Reassignment History Audit Table per §3.9.5 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Site Reassignment & Deployment History
            </h2>
          </div>
          <span className="text-xs text-neutral-400">
            {operator.reassignmentHistory.length} recorded transfers
          </span>
        </div>

        <Table
          columns={reassignmentColumns}
          data={operator.reassignmentHistory}
          keyExtractor={(r) => r.id}
          emptyTitle="No site reassignments recorded"
          emptyDescription="This operator has remained at their initially allocated terminal site since enrollment."
        />
      </div>
    </div>
  );
};