import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Bike,
  Plus,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { SearchInput, Select, Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Table, Column } from '../components/common/Table';
import { EmptyState } from '../components/common/EmptyState';
import { ParkingSlot, VehicleCategory } from '../types';

export const SlotManagement: React.FC = () => {
  const navigate = useNavigate();
  const { slots, currentSiteId, addSlot } = useLiveData();
  const { showToast } = useToast();

  // Filters and view modes
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Add Slot Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSlotId, setNewSlotId] = useState('');
  const [newSlotCategory, setNewSlotCategory] = useState<VehicleCategory>('Car');
  const [newSlotLocation, setNewSlotLocation] = useState('Bay A');
  const [slotIdError, setSlotIdError] = useState<string | null>(null);

  // Filter slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchesSearch =
        slot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slot.locationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (slot.currentVehicleNumber &&
          slot.currentVehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'All' || slot.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || slot.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [slots, searchQuery, categoryFilter, statusFilter]);

  // Handle Add Slot
  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotId.trim()) {
      setSlotIdError('Slot ID is required (e.g. C-41, S-21).');
      return;
    }

    const success = addSlot({
      id: newSlotId.trim().toUpperCase(),
      siteId: currentSiteId,
      category: newSlotCategory,
      locationCode: newSlotLocation.trim(),
      status: 'Vacant',
    });

    if (!success) {
      setSlotIdError('A slot with this ID already exists. Slot IDs must be unique.');
      return;
    }

    showToast(`Slot ${newSlotId.toUpperCase()} created successfully!`, 'success');
    setIsAddModalOpen(false);
    setNewSlotId('');
    setSlotIdError(null);
  };

  // Table columns for table view
  const columns: Column<ParkingSlot>[] = [
    {
      key: 'id',
      header: 'Slot ID',
      sortable: true,
      render: (s) => (
        <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded text-xs">
          {s.id}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {s.category === 'Car' ? (
            <Car className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Bike className="w-3.5 h-3.5 text-accent" />
          )}
          <span>{s.category}</span>
        </div>
      ),
    },
    {
      key: 'locationCode',
      header: 'Location Bay',
      sortable: true,
      render: (s) => <span className="text-xs text-neutral-600">{s.locationCode}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (s) => <Badge variant={s.status} />,
    },
    {
      key: 'currentVehicleNumber',
      header: 'Assigned Vehicle',
      render: (s) =>
        s.currentVehicleNumber ? (
          <span className="font-mono font-bold text-neutral-800 text-xs">
            {s.currentVehicleNumber}
          </span>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/slots/${s.id}`);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Slot Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Physical slot inventory, location allocation, and bay operational statuses
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setSlotIdError(null);
            setNewSlotId('');
            setIsAddModalOpen(true);
          }}
        >
          Add Slot
        </Button>
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="bg-white p-4 rounded-card border border-neutral-200 shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Category & Status Filters */}
        <div className="w-full md:w-auto flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="w-full sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, Bay, Vehicle..."
            />
          </div>

          <div className="w-full sm:w-36">
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

          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Vacant', label: 'Vacant Only' },
                { value: 'Occupied', label: 'Occupied Only' },
                { value: 'Deactivated', label: 'Deactivated' },
              ]}
            />
          </div>

          {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStatusFilter('All');
              }}
              className="text-xs text-primary hover:underline font-medium shrink-0 whitespace-nowrap px-2 self-start sm:self-center"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
          <span className="text-xs text-neutral-500">{filteredSlots.length} slots shown</span>
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-control border border-neutral-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[6px] transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Grid View (Parking Bay Layout)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-[6px] transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Table View (List Layout)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid or Table per §3.3 */}
      {viewMode === 'grid' ? (
        filteredSlots.length === 0 ? (
          <EmptyState
            title="No parking slots match filters"
            description="Try loosening your search criteria or resetting filters."
            actionText="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setCategoryFilter('All');
              setStatusFilter('All');
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredSlots.map((slot) => {
              const isOccupied = slot.status === 'Occupied';
              const isDeactivated = slot.status === 'Deactivated';

              let tileBorder = 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/20';
              let statusPill = 'bg-emerald-100 text-emerald-800';
              if (isOccupied) {
                tileBorder = 'border-red-200 hover:border-red-400 bg-red-50/20';
                statusPill = 'bg-red-100 text-red-800';
              } else if (isDeactivated) {
                tileBorder = 'border-neutral-200 hover:border-neutral-400 bg-neutral-100/50 opacity-70';
                statusPill = 'bg-neutral-200 text-neutral-600';
              }

              return (
                <div
                  key={slot.id}
                  onClick={() => navigate(`/slots/${slot.id}`)}
                  className={`p-3.5 rounded-card border-2 shadow-soft hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between select-none ${tileBorder}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono font-black text-sm text-neutral-900">{slot.id}</span>
                    <span className="p-1 rounded bg-white/80 shadow-2xs text-neutral-600">
                      {slot.category === 'Car' ? (
                        <Car className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Bike className="w-3.5 h-3.5 text-accent" />
                      )}
                    </span>
                  </div>

                  <div className="my-2.5 min-h-[36px] flex flex-col justify-center">
                    {isOccupied && slot.currentVehicleNumber ? (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Parked
                        </span>
                        <span className="font-mono font-bold text-xs text-neutral-950 truncate block">
                          {slot.currentVehicleNumber}
                        </span>
                      </div>
                    ) : isDeactivated ? (
                      <span className="text-[11px] font-medium text-neutral-400 italic truncate block" title={slot.deactivationReason || 'Maintenance'}>
                        {slot.deactivationReason || 'Maintenance'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-700/80">
                        Vacant Bay
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-200/50 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-pill uppercase tracking-wider ${statusPill}`}
                    >
                      {slot.status}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">Bay</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <Table
          columns={columns}
          data={filteredSlots}
          keyExtractor={(s) => s.id}
          onRowClick={(s) => navigate(`/slots/${s.id}`)}
          emptyTitle="No parking slots found"
          emptyDescription="Try clearing your search query or filters."
        />
      )}

      {/* Add Slot Modal (Admin only per §3.3) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Parking Slot"
        description="Configure a new physical slot in the parking bay inventory"
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          <Input
            label="Slot Identifier"
            placeholder="e.g. C-41 or S-21"
            value={newSlotId}
            onChange={(e) => {
              setNewSlotId(e.target.value);
              setSlotIdError(null);
            }}
            error={slotIdError || undefined}
            required
          />

          <Select
            label="Vehicle Category"
            value={newSlotCategory}
            onChange={(e) => setNewSlotCategory(e.target.value as VehicleCategory)}
            options={[
              { value: 'Car', label: 'Car Slot' },
              { value: 'Scooter', label: 'Scooter Slot' },
            ]}
          />

          <Select
            label="Location Bay / Zone"
            value={newSlotLocation}
            onChange={(e) => setNewSlotLocation(e.target.value)}
            options={[
              { value: 'Bay A', label: 'Bay A (Near Gate 1)' },
              { value: 'Bay B', label: 'Bay B (Central Area)' },
              { value: 'Bay C', label: 'Bay C (Level 1 East)' },
              { value: 'Bay D', label: 'Bay D (Level 1 West)' },
              { value: 'Bay S1', label: 'Bay S1 (Scooter Zone North)' },
              { value: 'Bay S2', label: 'Bay S2 (Scooter Zone South)' },
            ]}
          />

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Slot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
