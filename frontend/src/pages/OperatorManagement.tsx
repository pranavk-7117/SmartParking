import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Shield,
  MapPin,
  Eye,
  RefreshCw,
  Power,
  Info,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Table, Column } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal, ConfirmationModal } from '../components/common/Modal';
import { Input, Select, SearchInput } from '../components/common/Input';
import { OperatorAccount } from '../types';
import { AddSiteModal } from '../components/modals/AddSiteModal';

export const OperatorManagement: React.FC = () => {
  const navigate = useNavigate();
  const {
    operators,
    sites,
    addOperator,
    reassignOperatorSite,
    terminateOperator,
    reactivateOperator,
    deleteOperator,
  } = useLiveData();
  const { showToast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Sorting state (Requirement 9)
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');


  // Add Operator Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [assignedSiteId, setAssignedSiteId] = useState('');
  const [addErrors, setAddErrors] = useState<{ name?: string; username?: string; contact?: string; password?: string }>({});

  // Sync assigned site dynamically with real database sites
  React.useEffect(() => {
    if (!assignedSiteId && sites.length > 0) {
      setAssignedSiteId(sites[0].id);
    }
  }, [sites, assignedSiteId]);

  // Reassign Site Modal State
  const [reassigningOperator, setReassigningOperator] = useState<OperatorAccount | null>(null);
  const [newSiteId, setNewSiteId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');

  // Terminate Confirmation Modal State
  const [terminatingOperator, setTerminatingOperator] = useState<OperatorAccount | null>(null);

  // Requirement 10: Revoke Termination Modal State
  const [reactivatingOperator, setReactivatingOperator] = useState<OperatorAccount | null>(null);
  const [reactivateSiteId, setReactivateSiteId] = useState<string>('');
  const [reactivateReason, setReactivateReason] = useState<string>('');

  // Requirement 10: Delete Operator Data Confirmation Modal State
  const [deletingOperator, setDeletingOperator] = useState<OperatorAccount | null>(null);

  // Filtered list across ALL sites
  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const matchesSearch =
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.contact.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSite = siteFilter === 'All' || op.assignedSiteId === siteFilter;
      const matchesStatus = statusFilter === 'All' || op.status === statusFilter;

      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [operators, searchQuery, siteFilter, statusFilter]);

  // Requirement 9: Sorted operators list based on active column and direction
  const sortedAndFilteredOperators = useMemo(() => {
    const list = [...filteredOperators];
    list.sort((a, b) => {
      let valA: any = a[sortColumn as keyof OperatorAccount];
      let valB: any = b[sortColumn as keyof OperatorAccount];

      if (sortColumn === 'assignedSiteId') {
        valA = sites.find((s) => s.id === a.assignedSiteId)?.name || a.assignedSiteId;
        valB = sites.find((s) => s.id === b.assignedSiteId)?.name || b.assignedSiteId;
      }

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (typeof valA === 'number') {
        return sortDirection === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      }
      return 0;
    });
    return list;
  }, [filteredOperators, sortColumn, sortDirection, sites]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const [isSubmittingOperator, setIsSubmittingOperator] = useState(false);

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; username?: string; contact?: string; password?: string } = {};

    if (!name.trim()) errors.name = 'Full name is required.';
    if (!username.trim() || username.trim().length < 3) errors.username = 'Username must be at least 3 characters.';
    if (!contact.trim() || contact.trim().length < 8) errors.contact = 'Contact phone number must be at least 8 digits.';
    
    const pwd = password.trim() || 'Operator@12345';
    if (password.trim()) {
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters.';
      } else if (!/[A-Z]/.test(password)) {
        errors.password = 'Must contain at least one uppercase letter (A-Z).';
      } else if (!/[a-z]/.test(password)) {
        errors.password = 'Must contain at least one lowercase letter (a-z).';
      } else if (!/[0-9]/.test(password)) {
        errors.password = 'Must contain at least one number (0-9).';
      } else if (!/[^A-Za-z0-9]/.test(password)) {
        errors.password = 'Must contain at least one special character (@, #, $, etc.).';
      }
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setIsSubmittingOperator(true);
    try {
      await addOperator({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        contact: contact.trim(),
        password: pwd,
        email: addEmail.trim() || undefined,
        assignedSiteId,
      });

      showToast(`Operator "${name}" added successfully and saved to database.`, 'success');
      setIsAddModalOpen(false);
      setName('');
      setUsername('');
      setContact('');
      setPassword('');
      setAddEmail('');
      setAddErrors({});
    } catch (err: any) {
      showToast(err.message || 'Failed to create operator. Please check username uniqueness and password rules.', 'error');
    } finally {
      setIsSubmittingOperator(false);
    }
  };

  const handleConfirmReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningOperator || !newSiteId) return;

    reassignOperatorSite(reassigningOperator.id, newSiteId, reassignReason.trim() || undefined);
    const targetSite = sites.find((s) => s.id === newSiteId);
    showToast(
      `Operator ${reassigningOperator.name} reassigned to ${targetSite?.name || 'new site'}.`,
      'success'
    );
    setReassigningOperator(null);
    setNewSiteId('');
    setReassignReason('');
  };

  const handleConfirmTerminate = () => {
    if (!terminatingOperator) return;

    terminateOperator(terminatingOperator.id);
    showToast(`Operator ${terminatingOperator.name} has been terminated.`, 'warning');
    setTerminatingOperator(null);
  };

  // Requirement 10: Revoke termination and reinstate
  const handleConfirmReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivatingOperator || !reactivateSiteId) return;

    try {
      await reactivateOperator(
        reactivatingOperator.id,
        reactivateSiteId,
        reactivateReason.trim() || 'Termination revoked by admin'
      );
      const targetSite = sites.find((s) => s.id === reactivateSiteId);
      showToast(
        `Operator ${reactivatingOperator.name} reinstated and assigned to ${targetSite?.name || 'site'}.`,
        'success'
      );
      setReactivatingOperator(null);
      setReactivateSiteId('');
      setReactivateReason('');
    } catch {
      showToast('Failed to reinstate operator.', 'error');
    }
  };

  // Requirement 10: Delete operator records from database
  const handleConfirmDelete = async () => {
    if (!deletingOperator) return;

    try {
      await deleteOperator(deletingOperator.id);
      showToast(`Operator ${deletingOperator.name} and all data permanently deleted.`, 'success');
      setDeletingOperator(null);
    } catch {
      showToast('Failed to delete operator data.', 'error');
    }
  };

  const siteOptions = useMemo(() => {
    return sites.map((s) => ({ value: s.id, label: s.name }));
  }, [sites]);

  const columns: Column<OperatorAccount>[] = [
    {
      key: 'name',
      header: 'Operator Name',
      sortable: true,
      render: (op) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
            {op.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-neutral-900">{op.name}</div>
            <div className="text-xs text-neutral-500 font-mono">{op.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedSiteId',
      header: 'Assigned Site',
      sortable: true,
      render: (op) => {
        const site = sites.find((s) => s.id === op.assignedSiteId);
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
            <Building2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>{site?.name || op.assignedSiteId}</span>
          </div>
        );
      },
    },
    {
      key: 'contact',
      header: 'Contact Phone',
      sortable: true,
      render: (op) => (
        <span className="text-xs font-mono text-neutral-700">{op.contact}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      render: (op) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
            op.status === 'Active'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {op.status}
        </span>
      ),
    },
    {
      key: 'geofenceStatus',
      header: 'Live Status & Location',
      align: 'center',
      render: (op) => {
        if (op.status === 'Terminated') {
          return <span className="text-xs text-neutral-400">Terminated</span>;
        }
        const isBreached = op.geofenceStatus === 'BREACHED';
        const isOnline = op.isOnline;
        return (
          <div className="flex flex-col items-center">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isBreached
                  ? 'bg-rose-100 text-rose-800'
                  : isOnline
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBreached
                    ? 'bg-rose-500 animate-pulse'
                    : isOnline
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>
                {isBreached ? 'Breached (>500m)' : isOnline ? 'Online (Live)' : 'Offline'}
              </span>
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              {op.lastLocationUpdate ? new Date(op.lastLocationUpdate).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'dateAdded',
      header: 'Date Added',
      sortable: true,
      render: (op) => <span className="text-xs text-neutral-500">{op.dateAdded}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (op) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/operators/${op.id}`)}
            title="View Operator Profile"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
          >
            Profile
          </Button>

          {/* Requirement 7: Option to click and be redirected to live map */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard', { state: { focusOperatorId: op.id } })}
            title="Locate on Live Radar Map"
            leftIcon={<MapPin className="w-3.5 h-3.5 text-primary" />}
          >
            Map
          </Button>

          {op.status === 'Active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setReassigningOperator(op);
                setNewSiteId(sites.find((s) => s.id !== op.assignedSiteId)?.id || op.assignedSiteId);
              }}
              title="Reassign to another parking site"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Reassign
            </Button>
          )}

          {op.status === 'Active' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setTerminatingOperator(op)}
              title="Terminate Operator"
            >
              Terminate
            </Button>
          )}

          {/* Requirement 10: Options after termination */}
          {op.status === 'Terminated' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setReactivatingOperator(op);
                  setReactivateSiteId(sites[0]?.id || '');
                }}
                className="text-emerald-700 hover:text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                title="Revoke termination & reinstate operator"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Revoke Termination
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeletingOperator(op)}
                title="Permanently delete all operator data from database"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Data
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Operator Management
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Manage field operator personnel, credentials, live site reassignments, and GPS telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Requirement 7: Header button to view live map */}
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard#live-map')}
            leftIcon={<MapPin className="w-4 h-4 text-primary" />}
          >
            View Live Radar Map
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Operator
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-card border border-neutral-200 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-full sm:w-64">
            <SearchInput
              placeholder="Search by name, username, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-44">
            <Select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              options={[{ value: 'All', label: 'All Sites' }, ...siteOptions]}
            />
          </div>

          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active Only' },
                { value: 'Terminated', label: 'Terminated' },
              ]}
            />
          </div>
        </div>

        <span className="text-xs text-neutral-500 shrink-0 self-end sm:self-center">
          Showing {sortedAndFilteredOperators.length} operators
        </span>
      </div>

      {/* Requirement 9: Operators Table with working column sorting */}
      <Table
        columns={columns}
        data={sortedAndFilteredOperators}
        keyExtractor={(op) => op.id}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={(op) => navigate(`/operators/${op.id}`)}
        emptyTitle="No operators found"
        emptyDescription="Try adjusting your site or status filter to locate staff members."
      />

      {/* Add Operator Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Operator"
        description="Set credentials and assign a site — the operator can update their profile later from the app"
      >
        <form onSubmit={handleCreateOperator} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Anand Kulkarni"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={addErrors.name}
            required
          />

          <Input
            label="Username"
            placeholder="e.g. anand.kulkarni"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={addErrors.username}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter temporary password"
            helperText="Must contain at least 8 characters (uppercase, lowercase, number, symbol)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={addErrors.password}
            required
          />

          <Input
            label="Contact Phone Number"
            placeholder="e.g. +91 98220 12345"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            error={addErrors.contact}
            required
          />

          <Input
            label="Email (Optional)"
            type="email"
            placeholder="e.g. anand.kulkarni@gmail.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
          />

          {sites.length === 0 ? (
            <div className="p-3.5 bg-amber-50 rounded-control border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-bold">No parking facilities found in database.</p>
              <p className="text-amber-800">You must register at least one parking facility site before creating operators.</p>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsAddSiteModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-control bg-primary hover:bg-primary-dark text-white font-bold text-xs cursor-pointer shadow-2xs"
              >
                + Add Parking Site First
              </button>
            </div>
          ) : (
            <Select
              label="Initial Assigned Site"
              value={assignedSiteId}
              onChange={(e) => setAssignedSiteId(e.target.value)}
              options={siteOptions}
              required
            />
          )}

          <div className="p-3 bg-blue-50/80 rounded-control border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              The operator will use the <strong>username</strong> and <strong>password</strong> you set here to log in to the Android app.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingOperator}>
              {isSubmittingOperator ? 'Creating in Database...' : 'Create Operator'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Site Modal */}
      {reassigningOperator && (
        <Modal
          isOpen={!!reassigningOperator}
          onClose={() => setReassigningOperator(null)}
          title={`Reassign Site: ${reassigningOperator.name}`}
          description="Transfer this operator's primary operational terminal to another site location"
        >
          <form onSubmit={handleConfirmReassign} className="space-y-4">
            <div className="p-3 bg-neutral-50 rounded-control border border-neutral-200 text-xs text-neutral-600 space-y-1">
              <div>
                Current Assignment:{' '}
                <strong className="text-neutral-900">
                  {sites.find((s) => s.id === reassigningOperator.assignedSiteId)?.name}
                </strong>
              </div>
            </div>

            <Select
              label="Select Target Site"
              value={newSiteId}
              onChange={(e) => setNewSiteId(e.target.value)}
              options={sites.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.address})`,
              }))}
            />

            <Input
              label="Reassignment Reason / Transfer Notes (Optional)"
              placeholder="e.g. Staff rebalance for peak airport holiday schedule"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
            />

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
              <Button variant="secondary" onClick={() => setReassigningOperator(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Reassignment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Terminate Operator Confirmation Modal */}
      {terminatingOperator && (
        <ConfirmationModal
          isOpen={!!terminatingOperator}
          onClose={() => setTerminatingOperator(null)}
          onConfirm={handleConfirmTerminate}
          title="Terminate Operator"
          itemName={terminatingOperator.name}
          message="Are you sure you want to terminate this operator? Their login access will be immediately revoked."
          isDestructive={true}
          confirmLabel="Terminate Operator"
        />
      )}

      {/* Requirement 10: Revoke Termination Modal */}
      {reactivatingOperator && (
        <Modal
          isOpen={!!reactivatingOperator}
          onClose={() => setReactivatingOperator(null)}
          title={`Revoke Termination: ${reactivatingOperator.name}`}
          description="Reactivate operator account and assign them to an active parking site"
        >
          <form onSubmit={handleConfirmReactivate} className="space-y-4">
            <Select
              label="Assign to Parking Site"
              value={reactivateSiteId}
              onChange={(e) => setReactivateSiteId(e.target.value)}
              options={sites.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.address})`,
              }))}
            />

            <Input
              label="Reinstatement Notes / Reason (Recorded in Activity Summary)"
              placeholder="e.g. Issue resolved; reinstated to Hadapsar team"
              value={reactivateReason}
              onChange={(e) => setReactivateReason(e.target.value)}
            />

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
              <Button variant="secondary" onClick={() => setReactivatingOperator(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Reinstatement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Requirement 10: Delete Operator Data Confirmation Modal */}
      {deletingOperator && (
        <ConfirmationModal
          isOpen={!!deletingOperator}
          onClose={() => setDeletingOperator(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Operator Data"
          itemName={deletingOperator.name}
          message="Are you sure you want to permanently delete all data for this operator from the database? This action cannot be undone."
          isDestructive={true}
          confirmLabel="Delete All Data"
        />
      )}
      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSiteCreated={(newId) => setAssignedSiteId(newId)}
      />
    </div>
  );
};