import React from 'react';
import { Radio } from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';
import { OperatorTrackingMap } from '../components/map/OperatorTrackingMap';

export const LiveMap: React.FC = () => {
  const { sites, operators, currentSiteId, setCurrentSiteId } = useLiveData();

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Radio className="w-6 h-6 text-emerald-600 animate-pulse" />
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Live Geofence Radar & Sites Map
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Full screen geospatial overview: Live operator locations, parking facility geofence perimeters, and real-time breach detection
        </p>
      </div>

      <OperatorTrackingMap
        sites={sites}
        operators={operators}
        selectedSiteId={currentSiteId === 'all' ? undefined : currentSiteId}
        onSelectSite={(id) => setCurrentSiteId(id)}
      />
    </div>
  );
};
