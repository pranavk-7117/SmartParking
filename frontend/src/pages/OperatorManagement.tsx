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
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Table, Column } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal, ConfirmationModal } from '../components/common/Modal';
import { Input, Select, SearchInput } from '../components/common/Input';
import { OperatorAccount } from '../types';

export const OperatorManagement: React.FC = () => {
  const navigate = useNavigate();
  const { operators, sites, addOperator, reassignOperatorSite, terminateOperator } = useLiveData();
  const { showToast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add Operator Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [assignedSiteId, setAssignedSiteId] = useState(sites[0]?.id || 'site-hadapsar');
  const [addErrors, setAddErrors] = useState<{ name?: string; username?: string; contact?: string }>({});

  // Reassign Site Modal State
  const [reassigningOperator, setReassigningOperator] = useState<OperatorAccount | null>(null);
  const [newSiteId, setNewSiteId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');

  // Terminate Confirmation Modal State
  const [terminatingOperator, setTerminatingOperator] = useState<OperatorAccount | null>(null);

  // Filtered list across ALL sites by default per §3.9.1
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

  const handleCreateOperator = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; username?: string; contact?: string } = {};

    if (!name.trim()) errors.name = 'Full name is required.';
    if (!username.trim()) errors.username = 'Google email / username is required.';
    if (!contact.trim()) errors.contact = 'Contact phone number is required.';

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    addOperator({
      name: name.trim(),
      username: username.trim(),
      contact: contact.trim(),
      assignedSiteId,
    });

    showToast(`Operator "${name}" added successfully.`, 'success');
    setIsAddModalOpen(false);
    setName('');
    setUsername('');
    setContact('');
    setAddErrors({});
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Operator Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cross-site staff roster, Google identity verifications, and site assignment governance
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            setAddErrors({});
            setIsAddModalOpen(true);
          }}
        >
          Add Operator
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-card border border-neutral-200 shadow-soft flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-auto flex-1 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="w-full sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              options={[{ value: 'All', label: 'All Sites (Global)' }, ...siteOptions]}
            />
          </div>

          <div className="w-full sm:w-36">
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

        <span className="text-xs text-neutral-500 shrink-0">
          Showing {filteredOperators.length} operators
        </span>
      </div>

      {/* Operators Table */}
      <Table
        columns={columns}
        data={filteredOperators}
        keyExtractor={(op) => op.id}
        onRowClick={(op) => navigate(`/operators/${op.id}`)}
        emptyTitle="No operators found"
        emptyDescription="Try adjusting your site or status filter to locate staff members."
      />

      {/* Add Operator Modal per §3.9.2 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Operator"
        description="Register a new on-ground operator and allocate initial site assignment"
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
            label="Google Account / Email"
            type="email"
            placeholder="e.g. anand.kulkarni@gmail.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={addErrors.username}
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

          <Select
            label="Initial Assigned Site"
            value={assignedSiteId}
            onChange={(e) => setAssignedSiteId(e.target.value)}
            options={siteOptions}
          />

          {/* §3.9.2 Helper Note */}
          <div className="p-3 bg-blue-50/80 rounded-control border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Operator will verify identity via Google Account sign-in on their native Android device.
              Additional verification (e.g., Aadhaar ID) may be added pending client confirmation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Operator
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Site Modal per §3.9.4 */}
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

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
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

      {/* Terminate Operator Confirmation Modal per §3.9.3 */}
      {terminatingOperator && (
        <ConfirmationModal
          isOpen={!!terminatingOperator}
          onClose={() => setTerminatingOperator(null)}
          onConfirm={handleConfirmTerminate}
          title="Terminate Operator"
          itemName={terminatingOperator.name}
          message="Are you sure you want to terminate this operator? Their login access will be permanently revoked, but historical session associations and transfer logs will be preserved."
          isDestructive={true}
          confirmLabel="Terminate Operator"
        />
      )}
    </div>
  );
};