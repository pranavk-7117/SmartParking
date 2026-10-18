import React, { useState } from 'react';
import { Plus, MapPin, AlertCircle, Compass } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useLiveData } from '../../context/LiveDataContext';
import { useToast } from '../../context/ToastContext';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSiteCreated?: (siteId: string) => void;
}

export const AddSiteModal: React.FC<AddSiteModalProps> = ({ isOpen, onClose, onSiteCreated }) => {
  const { addSite } = useLiveData();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gateInfo, setGateInfo] = useState('');
  const [totalCarSlots, setTotalCarSlots] = useState('40');
  const [totalScooterSlots, setTotalScooterSlots] = useState('20');
  const [defaultCarRate, setDefaultCarRate] = useState('30');
  const [defaultScooterRate, setDefaultScooterRate] = useState('15');
  
  // Coordinates state (only requested if automatic dynamic geocoding fails — NO mock data)
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [needsManualCoords, setNeedsManualCoords] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Facility Name is required';
    if (!address.trim()) newErrors.address = 'Physical Address is required';

    const carCount = parseInt(totalCarSlots, 10);
    const scooterCount = parseInt(totalScooterSlots, 10);
    const carRate = parseFloat(defaultCarRate);
    const scooterRate = parseFloat(defaultScooterRate);

    if (isNaN(carCount) || carCount < 0) newErrors.carSlots = 'Must be 0 or more';
    if (isNaN(scooterCount) || scooterCount < 0) newErrors.scooterSlots = 'Must be 0 or more';
    if (isNaN(carRate) || carRate < 0) newErrors.carRate = 'Must be a valid rate';
    if (isNaN(scooterRate) || scooterRate < 0) newErrors.scooterRate = 'Must be a valid rate';

    let resolvedLat: number | null = null;
    let resolvedLng: number | null = null;

    if (needsManualCoords) {
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      if (isNaN(latNum) || isNaN(lngNum)) {
        newErrors.coords = 'Valid numeric coordinates are required (e.g. 18.5204, 73.8567)';
      } else {
        resolvedLat = latNum;
        resolvedLng = lngNum;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. If manual coords not yet enabled, attempt automatic dynamic geocoding from entered physical address
      if (!needsManualCoords) {
        try {
          const query = encodeURIComponent(address.trim());
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (geoRes.ok) {
            const data = await geoRes.json();
            if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
              resolvedLat = parseFloat(data[0].lat);
              resolvedLng = parseFloat(data[0].lon);
            }
          }
        } catch (geoErr) {
          console.warn('[AddSiteModal] Automatic geocoding service unreachable:', geoErr);
        }

        // Rule: NO MOCK/HARDCODED FALLBACK! If geocoding cannot find coords, ask user for physical coordinates.
        if (resolvedLat === null || resolvedLng === null || isNaN(resolvedLat) || isNaN(resolvedLng)) {
          setNeedsManualCoords(true);
          setErrors({
            coords: 'Could not automatically detect GPS coordinates for this address. Please specify the physical coordinates below.',
          });
          setIsSubmitting(false);
          return;
        }
      }

      const created = await addSite({
        name: name.trim(),
        address: address.trim(),
        gateInfo: gateInfo.trim() || 'Main Gate A',
        totalCarSlots: carCount,
        totalScooterSlots: scooterCount,
        defaultCarRate: carRate,
        defaultScooterRate: scooterRate,
        status: 'Active',
        latitude: resolvedLat ?? undefined,
        longitude: resolvedLng ?? undefined,
      });

      showToast(`Site "${created.name}" created successfully and added to the map!`, 'success');
      onClose();
      if (onSiteCreated) onSiteCreated(created.id);

      // Reset fields
      setName('');
      setAddress('');
      setGateInfo('');
      setTotalCarSlots('40');
      setTotalScooterSlots('20');
      setDefaultCarRate('30');
      setDefaultScooterRate('15');
      setLatitude('');
      setLongitude('');
      setNeedsManualCoords(false);
      setErrors({});
    } catch (err: any) {
      console.error('[AddSiteModal] failed:', err);
      showToast(err.message || 'Failed to create site', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setNeedsManualCoords(false);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleResetAndClose} title="Add New Parking Site" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and Gate Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Facility Name"
            placeholder="e.g. ParkIT – Kondhwa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Gate / Terminal Info"
            placeholder="e.g. Main Entry Gate"
            value={gateInfo}
            onChange={(e) => setGateInfo(e.target.value)}
          />
        </div>

        {/* Physical Address */}
        <div>
          <Input
            label="Physical Address"
            placeholder="e.g. NIBM Road, Kondhwa, Pune, Maharashtra 411048"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (needsManualCoords) {
                // If address is re-typed, clear coords error
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.coords;
                  return copy;
                });
              }
            }}
            error={errors.address}
            required
          />
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>The system automatically detects GPS coordinates from this address.</span>
          </p>
        </div>

        {/* Dynamic Coordinates Fallback (Only shown if automatic address geocoding fails — NO mock data) */}
        {needsManualCoords && (
          <div className="p-3.5 rounded-control border border-amber-300 bg-amber-50/70 space-y-2.5 animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <span className="font-bold">Address coordinate detection needed: </span>
                {errors.coords || 'Please specify the exact physical latitude and longitude for this facility.'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label="Latitude (°N)"
                placeholder="e.g. 18.4721"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
              <Input
                label="Longitude (°E)"
                placeholder="e.g. 73.8967"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {/* Capacity: Cars and Scooters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-control border border-neutral-200">
          <Input
            label="Total Car Bays"
            type="number"
            min="0"
            value={totalCarSlots}
            onChange={(e) => setTotalCarSlots(e.target.value)}
            error={errors.carSlots}
            required
          />
          <Input
            label="Total Scooter Bays"
            type="number"
            min="0"
            value={totalScooterSlots}
            onChange={(e) => setTotalScooterSlots(e.target.value)}
            error={errors.scooterSlots}
            required
          />
        </div>

        {/* Rates: Cars and Scooters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-control border border-neutral-200">
          <Input
            label="Car Hourly Rate (₹/hr)"
            type="number"
            min="0"
            step="1"
            value={defaultCarRate}
            onChange={(e) => setDefaultCarRate(e.target.value)}
            error={errors.carRate}
            required
          />
          <Input
            label="Scooter Hourly Rate (₹/hr)"
            type="number"
            min="0"
            step="1"
            value={defaultScooterRate}
            onChange={(e) => setDefaultScooterRate(e.target.value)}
            error={errors.scooterRate}
            required
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <Button variant="secondary" type="button" onClick={handleResetAndClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            <Plus className="w-4 h-4 mr-1.5" />
            {isSubmitting ? 'Detecting & Creating Site...' : 'Create Facility Site'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
