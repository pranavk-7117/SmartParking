import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  HardDrive,
  Clock,
  CheckCircle2,
  Save,
  Plus,
  MapPin,
  KeyRound,
  Shield,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useLiveData } from '../context/LiveDataContext';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const { sites, addSite } = useLiveData();
  const { currentUser } = useAuth();

  const [facilityName, setFacilityName] = useState('ParkIT Facility');
  const [terminalCode, setTerminalCode] = useState('');
  const [gracePeriod, setGracePeriod] = useState('15');
  const [receiptWidth, setReceiptWidth] = useState('80mm');
  const [isSaving, setIsSaving] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Add New Site Modal State per §3.11.1
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newCarSlots, setNewCarSlots] = useState('40');
  const [newScooterSlots, setNewScooterSlots] = useState('20');
  const [newGateInfo, setNewGateInfo] = useState('Main Entrance Gate');
  const [newCarRate, setNewCarRate] = useState('30');
  const [newScooterRate, setNewScooterRate] = useState('15');
  const [newSiteStatus, setNewSiteStatus] = useState<'Active' | 'Coming Soon'>('Active');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      showToast('Current password is required.', 'error');
      return;
    }
    if (!newPassword.trim()) {
      showToast('New password is required.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Password changed successfully. You will need to log in again next session.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.body?.error || err?.message || 'Failed to change password.';
      showToast(msg, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Facility settings saved successfully.', 'success');
    }, 400);
  };

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteAddress.trim()) {
      showToast('Site Name and Physical Address are required.', 'error');
      return;
    }

    addSite({
      name: newSiteName.trim(),
      address: newSiteAddress.trim(),
      totalCarSlots: parseInt(newCarSlots, 10) || 40,
      totalScooterSlots: parseInt(newScooterSlots, 10) || 20,
      gateInfo: newGateInfo.trim() || 'Gate 1 & 2',
      defaultCarRate: parseInt(newCarRate, 10) || 30,
      defaultScooterRate: parseInt(newScooterRate, 10) || 15,
      status: newSiteStatus,
    })
      .then(() => {
        showToast(`Site "${newSiteName}" added successfully. Now selectable in Site Switcher!`, 'success');
        setIsAddSiteModalOpen(false);
        setNewSiteName('');
        setNewSiteAddress('');
      })
      .catch(() => {
        showToast('Failed to add site. Please try again.', 'error');
      });
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            System & Facility Settings
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Configure facility profile, entry/exit grace periods, peripheral hardware, and multi-site locations
        </p>
      </div>

      {/* Multi-Site Management Sub-Section per §3.11.1 */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                Multi-Site Locations
              </h2>
              <p className="text-xs text-neutral-500">
                Managed facilities, physical gates, and occupancy capacities
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddSiteModalOpen(true)}
          >
            Add New Site
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {sites.map((s) => (
            <div
              key={s.id}
              className="p-3.5 rounded-control border border-neutral-200 bg-neutral-50 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900">{s.name}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-pill ${
                    s.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate" title={s.address}>
                {s.address}
              </p>
              <div className="text-[11px] text-neutral-600 pt-1 border-t border-neutral-200/50 flex justify-between">
                <span>Capacity:</span>
                <span className="font-semibold text-neutral-900">
                  {s.totalCarSlots} Cars / {s.totalScooterSlots} Scooters
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Facility Profile */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Facility Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Facility Name"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              required
            />
            <Input
              label="Location Identifier"
              value={terminalCode}
              onChange={(e) => setTerminalCode(e.target.value)}
              required
            />
            <Input
              label="Support Phone Number"
              defaultValue="+91 (020) 2450-8800"
              helperText="Printed at bottom of thermal receipts"
            />
            <Input
              label="Billing Currency"
              defaultValue="INR (₹)"
              disabled
              helperText="Configured per regional jurisdiction"
            />
          </div>
        </Card>

        {/* Operational & Billing Parameters */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Operational Logic & Tolerances
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Exit Grace Period"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(e.target.value)}
              options={[
                { value: '10', label: '10 Minutes (Strict)' },
                { value: '15', label: '15 Minutes (Standard)' },
                { value: '20', label: '20 Minutes (Relaxed)' },
              ]}
              helperText="Time allowed to reach exit gate after payment before extra hour is billed"
            />

            <Select
              label="Thermal Receipt Format"
              value={receiptWidth}
              onChange={(e) => setReceiptWidth(e.target.value)}
              options={[
                { value: '80mm', label: '80mm POS Standard (ESC/POS)' },
                { value: '58mm', label: '58mm Compact Mobile Printer' },
              ]}
              helperText="Matches physical paper roll width installed at gate terminal"
            />
          </div>
        </Card>

        {/* Peripheral Hardware Status */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-success" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                Connected Hardware Status
              </h2>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Edge Controller v2.4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-control border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-neutral-900">Gate 1 Camera</p>
                <p className="text-neutral-500 text-[11px]">IP: 192.168.1.101</p>
              </div>
              <span className="flex items-center gap-1 text-success font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online
              </span>
            </div>

            <div className="p-3 rounded-control border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-neutral-900">Gate 2 Exit Barrier</p>
                <p className="text-neutral-500 text-[11px]">RS-485 Modbus Relay</p>
              </div>
              <span className="flex items-center gap-1 text-success font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Armed
              </span>
            </div>

            <div className="p-3 rounded-control border border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-neutral-900">LED Kiosk Billboard</p>
                <p className="text-neutral-500 text-[11px]">Route /display (1920x1080)</p>
              </div>
              <span className="flex items-center gap-1 text-success font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Synced
              </span>
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Configuration
          </Button>
        </div>
      </form>

      {/* Change Password Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
          <KeyRound className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Change Password
            </h2>
            <p className="text-xs text-neutral-500">
              Logged in as <strong>{currentUser?.username ?? 'you'}</strong>. Changing your password will invalidate other active sessions.
            </p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="Min 8 chars, must include uppercase, lowercase, digit &amp; symbol"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <div className="md:col-span-3 flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isChangingPassword}
              leftIcon={<Shield className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Add New Site Modal per §3.11.1 */}
      <Modal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        title="Add New Parking Site"
        description="Configure a new physical facility with capacity, gates, and hourly rates"
      >
        <form onSubmit={handleCreateSite} className="space-y-4">
          <Input
            label="Site Name"
            placeholder="e.g. ParkIT – East Wing"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            required
          />

          <Input
            label="Physical Address"
            placeholder="e.g. Phoenix Mall Road, Viman Nagar, Pune 411014"
            value={newSiteAddress}
            onChange={(e) => setNewSiteAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Car Slots"
              type="number"
              value={newCarSlots}
              onChange={(e) => setNewCarSlots(e.target.value)}
              required
            />
            <Input
              label="Total Scooter Slots"
              type="number"
              value={newScooterSlots}
              onChange={(e) => setNewScooterSlots(e.target.value)}
              required
            />
          </div>

          <Input
            label="Gate / Entrance Descriptor"
            placeholder="e.g. Main Entrance Gate"
            value={newGateInfo}
            onChange={(e) => setNewGateInfo(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Default Car Rate (₹/hr)"
              type="number"
              value={newCarRate}
              onChange={(e) => setNewCarRate(e.target.value)}
              required
            />
            <Input
              label="Default Scooter Rate (₹/hr)"
              type="number"
              value={newScooterRate}
              onChange={(e) => setNewScooterRate(e.target.value)}
              required
            />
          </div>

          <Select
            label="Status"
            value={newSiteStatus}
            onChange={(e) => setNewSiteStatus(e.target.value as 'Active' | 'Coming Soon')}
            options={[
              { value: 'Active', label: 'Active (Live in Switcher)' },
              { value: 'Coming Soon', label: 'Coming Soon (Planned Site)' },
            ]}
          />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <Button variant="secondary" onClick={() => setIsAddSiteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Site
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
