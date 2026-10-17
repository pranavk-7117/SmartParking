import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Shield,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Site, OperatorAccount } from '../../types';

interface OperatorTrackingMapProps {
  sites: Site[];
  operators: OperatorAccount[];
  selectedSiteId?: string;
  onSelectSite?: (siteId: string) => void;
  className?: string;
}

// Known coordinates for default sites in Pune
const SITE_COORDINATES: Record<string, { lat: number; lng: number; radiusMeters: number }> = {
  'site-camp': { lat: 18.5133, lng: 73.8784, radiusMeters: 500 },
  'site-hadapsar': { lat: 18.5089, lng: 73.9259, radiusMeters: 500 },
  'site-kothrud': { lat: 18.5074, lng: 73.8077, radiusMeters: 500 },
};

export const OperatorTrackingMap: React.FC<OperatorTrackingMapProps> = ({
  sites,
  operators,
  selectedSiteId,
  onSelectSite,
  className = '',
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'inside' | 'breached'>('all');
  const [hoveredOperator, setHoveredOperator] = useState<OperatorAccount | null>(null);
  const [hoveredSite, setHoveredSite] = useState<Site | null>(null);

  // Active sites with coordinates
  const sitesWithCoords = useMemo(() => {
    return sites.map((s, idx) => {
      const coords = SITE_COORDINATES[s.id] || {
        lat: 18.515 + idx * 0.01,
        lng: 73.87 + idx * 0.03,
        radiusMeters: 500,
      };
      return {
        ...s,
        ...coords,
      };
    });
  }, [sites]);

  // Compute map bounding box
  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    let minLat = 18.50;
    let maxLat = 18.53;
    let minLng = 73.80;
    let maxLng = 73.95;

    sitesWithCoords.forEach((s) => {
      if (s.lat < minLat) minLat = s.lat;
      if (s.lat > maxLat) maxLat = s.lat;
      if (s.lng < minLng) minLng = s.lng;
      if (s.lng > maxLng) maxLng = s.lng;
    });

    operators.forEach((op) => {
      if (op.lastLatitude && op.lastLongitude) {
        if (op.lastLatitude < minLat) minLat = op.lastLatitude;
        if (op.lastLatitude > maxLat) maxLat = op.lastLatitude;
        if (op.lastLongitude < minLng) minLng = op.lastLongitude;
        if (op.lastLongitude > maxLng) maxLng = op.lastLongitude;
      }
    });

    // Add padding
    const latPadding = Math.max((maxLat - minLat) * 0.15, 0.015);
    const lngPadding = Math.max((maxLng - minLng) * 0.15, 0.02);

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
    };
  }, [sitesWithCoords, operators]);

  // Project lat/lng to percentage coordinates on the SVG canvas (0% to 100%)
  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    // Invert Y because latitude increases northward (up), whereas SVG Y increases downward
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  // Convert geofence radius in meters to SVG percentage radius
  const radiusToSvgUnits = (radiusMeters: number) => {
    // 1 deg lat ~ 111,000 meters
    const totalLatMeters = (maxLat - minLat) * 111000;
    const pct = (radiusMeters / totalLatMeters) * 100;
    return Math.max(4, Math.min(18, pct));
  };

  // Operators with positions
  const activeTrackedOperators = useMemo(() => {
    return operators.filter((op) => {
      if (op.status === 'Terminated') return false;
      if (activeFilter === 'inside' && op.geofenceStatus === 'BREACHED') return false;
      if (activeFilter === 'breached' && op.geofenceStatus !== 'BREACHED') return false;
      return true;
    });
  }, [operators, activeFilter]);

  const breachedCount = useMemo(() => {
    return operators.filter((op) => op.status === 'Active' && op.geofenceStatus === 'BREACHED').length;
  }, [operators]);

  return (
    <Card className={`overflow-hidden border border-neutral-200 ${className}`}>
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Live Operator & Parking Sites Map
            </h2>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live Geofence Radar
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time geofence tracking: Green circles represent live operators, blue pins indicate facility sites
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'all'
                  ? 'bg-white text-primary shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({operators.filter((o) => o.status === 'Active').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('inside')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'inside'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Inside Geofence
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('breached')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'breached'
                  ? 'bg-white text-rose-700 shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Breached ({breachedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Geofence Breach Banner if any */}
      {breachedCount > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{breachedCount} operator(s)</strong> have moved outside their assigned site geofence radius.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-rose-700">Check alerts panel</span>
        </div>
      )}

      {/* Interactive Map Visual Stage */}
      <div className="relative w-full h-[360px] sm:h-[420px] bg-slate-900 overflow-hidden select-none">
        {/* Subtle Map Grid lines representing geospatial sectors */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Ambient Map roads / sector rings */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="geofence-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
            </radialGradient>
            <radialGradient id="breached-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Connect operator to assigned site with dashed ray */}
          {activeTrackedOperators.map((op) => {
            if (!op.lastLatitude || !op.lastLongitude) return null;
            const opPos = project(op.lastLatitude, op.lastLongitude);
            const assignedSite = sitesWithCoords.find((s) => s.id === op.assignedSiteId);
            if (!assignedSite) return null;
            const sitePos = project(assignedSite.lat, assignedSite.lng);

            const isBreached = op.geofenceStatus === 'BREACHED';

            return (
              <line
                key={`line-${op.id}`}
                x1={sitePos.x}
                y1={sitePos.y}
                x2={opPos.x}
                y2={opPos.y}
                stroke={isBreached ? '#f43f5e' : '#10b981'}
                strokeWidth="0.35"
                strokeDasharray="1,1"
                opacity="0.8"
              />
            );
          })}

          {/* Render Geofence Boundary Circles around each Site */}
          {sitesWithCoords.map((site) => {
            const pos = project(site.lat, site.lng);
            const radius = radiusToSvgUnits(site.radiusMeters);
            const isSelected = selectedSiteId === site.id;

            return (
              <g key={`circle-${site.id}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill="url(#geofence-gradient)"
                  stroke={isSelected ? '#38bdf8' : '#60a5fa'}
                  strokeWidth={isSelected ? '0.6' : '0.35'}
                  strokeDasharray="2,1"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* DOM Overlays: Sites Pins */}
        {sitesWithCoords.map((site) => {
          const pos = project(site.lat, site.lng);
          const isSelected = selectedSiteId === site.id;

          return (
            <div
              key={`pin-${site.id}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => onSelectSite && onSelectSite(site.id)}
              onMouseEnter={() => setHoveredSite(site)}
              onMouseLeave={() => setHoveredSite(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
            >
              <div
                className={`p-1.5 rounded-full shadow-lg transition-transform transform group-hover:scale-125 flex items-center justify-center ${
                  isSelected
                    ? 'bg-sky-500 ring-4 ring-sky-300/40 text-white'
                    : 'bg-indigo-600 text-white hover:bg-sky-400'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>

              {/* Site Label Tag */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-slate-900/90 text-sky-200 border border-sky-500/30 text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none">
                {site.name.replace('ParkIT – ', '')}
              </div>
            </div>
          );
        })}

        {/* DOM Overlays: Live Operators (Green circles) */}
        {activeTrackedOperators.map((op) => {
          // If operator has no coordinates yet, assign relative coordinate near assigned site
          let lat = op.lastLatitude;
          let lng = op.lastLongitude;

          if (!lat || !lng) {
            const assigned = sitesWithCoords.find((s) => s.id === op.assignedSiteId);
            lat = assigned ? assigned.lat + 0.001 : 18.5133;
            lng = assigned ? assigned.lng + 0.001 : 73.8784;
          }

          const pos = project(lat, lng);
          const isBreached = op.geofenceStatus === 'BREACHED';

          return (
            <div
              key={`op-${op.id}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onMouseEnter={() => setHoveredOperator(op)}
              onMouseLeave={() => setHoveredOperator(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
            >
              {/* Radar beacon ripple effect */}
              <div
                className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                  isBreached ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
              />

              {/* Main operator dot (Live green circle) */}
              <div
                className={`relative w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-bold text-[10px] text-white transition-transform group-hover:scale-125 ${
                  isBreached
                    ? 'bg-rose-600 ring-4 ring-rose-500/40'
                    : 'bg-emerald-500 ring-4 ring-emerald-400/30'
                }`}
              >
                {op.name.charAt(0).toUpperCase()}
              </div>

              {/* Name pill */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] font-semibold whitespace-nowrap shadow-md flex items-center gap-1.5 pointer-events-none">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isBreached ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'
                  }`}
                />
                <span>{op.name}</span>
                {isBreached && <span className="text-rose-300 font-bold">(Breached)</span>}
              </div>
            </div>
          );
        })}

        {/* Hover Information Tooltip Card */}
        {hoveredOperator && (
          <div className="absolute bottom-4 left-4 z-30 p-3 bg-slate-900/95 text-white border border-slate-700 rounded-lg shadow-2xl max-w-xs text-xs backdrop-blur-md animate-fade-in">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-sky-400">{hoveredOperator.name}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  hoveredOperator.geofenceStatus === 'BREACHED'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {hoveredOperator.geofenceStatus === 'BREACHED' ? 'Geofence Breached' : 'Within Geofence'}
              </span>
            </div>
            <div className="pt-2 space-y-1 text-slate-300 text-[11px]">
              <div>
                <span className="text-slate-400">Assigned Site:</span>{' '}
                <span className="font-semibold text-white">
                  {hoveredOperator.assignedSiteId || 'Camp Facility'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Contact:</span> {hoveredOperator.contact}
              </div>
              <div>
                <span className="text-slate-400">Shift:</span> {hoveredOperator.shiftTime || 'General Shift'}
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                Last GPS ping: {hoveredOperator.lastLocationUpdate || 'Live active connection'}
              </div>
            </div>
          </div>
        )}

        {/* Legend Overlay at top right */}
        <div className="absolute top-3 right-3 z-30 p-2.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 text-white text-[11px] space-y-1.5 shadow-lg hidden sm:block">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white" />
            <span className="text-slate-300">Operator (Live Tracking)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 border border-white" />
            <span className="text-slate-300">Geofence Breached</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-300">Parking Site (500m radius)</span>
          </div>
        </div>
      </div>

      {/* Operator Live Geofence Status Table */}
      <div className="p-4 sm:p-5 bg-white border-t border-neutral-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
          On-Duty Operators Geofence Audit
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {operators
            .filter((op) => op.status === 'Active')
            .map((op) => {
              const isBreached = op.geofenceStatus === 'BREACHED';
              const assignedSite = sites.find((s) => s.id === op.assignedSiteId);

              return (
                <div
                  key={op.id}
                  className={`p-3 rounded-control border flex items-center justify-between text-xs transition-colors ${
                    isBreached
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                        isBreached ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {op.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900 truncate">{op.name}</p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {assignedSite?.name || op.assignedSiteId}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isBreached
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isBreached ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Breached</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Within 500m</span>
                        </>
                      )}
                    </span>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {op.lastLocationUpdate || 'Live'}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </Card>
  );
};
