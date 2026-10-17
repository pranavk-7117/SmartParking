import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  Layers,
  Crosshair,
  Copy,
  Check,
  User,
  Clock,
  Phone,
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

// Known coordinates for default sites in Pune (fallback if latitude/longitude is not present)
const DEFAULT_SITE_COORDS: Record<string, { lat: number; lng: number }> = {
  'site-camp': { lat: 18.5133, lng: 73.8784 },
  'site-hadapsar': { lat: 18.5089, lng: 73.9259 },
  'site-kothrud': { lat: 18.5074, lng: 73.8077 },
};

// Haversine formula for exact distance in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Map tile layers (100% free, zero API key required, zero watermarks)
type TileLayerStyle = 'streets' | 'satellite' | 'topo' | 'osm';

const TILE_LAYERS: Record<TileLayerStyle, { name: string; url: string; attribution: string; maxZoom: number }> = {
  streets: {
    name: 'Real Streets (Google style)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  topo: {
    name: 'Topographic & Transit',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, Intermap',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap Streets',
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export const OperatorTrackingMap: React.FC<OperatorTrackingMapProps> = ({
  sites,
  operators,
  selectedSiteId,
  onSelectSite,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<TileLayerStyle>('streets');
  const [activeFilter, setActiveFilter] = useState<'all' | 'inside' | 'breached'>('all');
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

  // Parse sites with real coordinates
  const sitesWithCoords = useMemo(() => {
    return sites.map((s, idx) => {
      let lat = typeof s.latitude === 'number' && !isNaN(s.latitude) ? s.latitude : undefined;
      let lng = typeof s.longitude === 'number' && !isNaN(s.longitude) ? s.longitude : undefined;

      if (lat === undefined || lng === undefined) {
        const fallback = DEFAULT_SITE_COORDS[s.id] || {
          lat: 18.5204 + (idx - 1) * 0.015,
          lng: 73.8567 + (idx - 1) * 0.025,
        };
        lat = fallback.lat;
        lng = fallback.lng;
      }

      return {
        ...s,
        lat,
        lng,
        radiusMeters: 500,
      };
    });
  }, [sites]);

  // Map each operator with location and assigned site distance
  const operatorsWithDistance = useMemo(() => {
    return operators.map((op, idx) => {
      const assignedSite = sitesWithCoords.find((s) => s.id === op.assignedSiteId) || sitesWithCoords[0];
      const hasGps = typeof op.lastLatitude === 'number' && typeof op.lastLongitude === 'number';

      // Default sample position if not reported yet
      const lat = hasGps ? op.lastLatitude! : (assignedSite?.lat ? assignedSite.lat + 0.001 * (idx + 1) : 18.5133);
      const lng = hasGps ? op.lastLongitude! : (assignedSite?.lng ? assignedSite.lng + 0.001 * (idx + 1) : 73.8784);

      let distance = 0;
      if (assignedSite) {
        distance = calculateDistanceMeters(lat, lng, assignedSite.lat, assignedSite.lng);
      }

      const isBreached = op.geofenceStatus === 'BREACHED' || distance > 500;

      return {
        ...op,
        computedLat: lat,
        computedLng: lng,
        hasRealGps: hasGps,
        assignedSite,
        distanceMeters: distance,
        isBreached,
      };
    });
  }, [operators, sitesWithCoords]);

  // Filtered operators
  const filteredOperators = useMemo(() => {
    if (activeFilter === 'inside') {
      return operatorsWithDistance.filter((o) => !o.isBreached);
    }
    if (activeFilter === 'breached') {
      return operatorsWithDistance.filter((o) => o.isBreached);
    }
    return operatorsWithDistance;
  }, [operatorsWithDistance, activeFilter]);

  const breachedCount = useMemo(() => {
    return operatorsWithDistance.filter((o) => o.isBreached).length;
  }, [operatorsWithDistance]);

  const insideCount = operatorsWithDistance.length - breachedCount;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Pune
    const initialCenter: [number, number] = [18.5133, 73.8784];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    // Custom Zoom control at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer
    const tileConfig = TILE_LAYERS[mapStyle];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Layer Group for dynamic markers & circles
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Click handler to inspect coordinates for adding new sites
    map.on('click', (e: L.LeafletMouseEvent) => {
      setClickedCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
      setCopiedCoords(false);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[mapStyle];
    const newLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Render Site Pins, Geofence Radius Circles, Operator Markers & Connectors
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    const allLatLngs: [number, number][] = [];

    // 1. Draw Parking Sites
    sitesWithCoords.forEach((site) => {
      const isSelected = selectedSiteId && selectedSiteId !== 'all' && site.id === selectedSiteId;
      allLatLngs.push([site.lat, site.lng]);

      // 500m Geofence Circle
      const circle = L.circle([site.lat, site.lng], {
        radius: site.radiusMeters,
        color: isSelected ? '#2563eb' : '#3b82f6',
        weight: isSelected ? 2.5 : 1.5,
        opacity: 0.85,
        fillColor: isSelected ? '#3b82f6' : '#60a5fa',
        fillOpacity: isSelected ? 0.16 : 0.08,
        dashArray: '6, 6',
      });

      circle.bindTooltip(
        `<div class="text-xs font-semibold px-1 py-0.5">${site.name} • 500m Geofence Boundary</div>`,
        { permanent: false, direction: 'top', className: 'geofence-tooltip' }
      );
      markersLayer.addLayer(circle);

      // Site Custom HTML Marker Icon
      const siteHtml = `
        <div class="relative group cursor-pointer flex flex-col items-center transform -translate-x-1/2 -translate-y-full transition-transform hover:scale-110">
          <div class="flex items-center gap-1.5 bg-neutral-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg border ${
            isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-neutral-700'
          }">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span class="truncate max-w-[120px]">${site.name.replace('ParkIT – ', '')}</span>
          </div>
          <div class="w-8 h-8 rounded-full ${
            isSelected ? 'bg-primary' : 'bg-neutral-800'
          } border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs mt-1">
            P
          </div>
          <div class="w-1.5 h-2 bg-neutral-800"></div>
        </div>
      `;

      const siteIcon = L.divIcon({
        className: 'custom-site-marker',
        html: siteHtml,
        iconSize: [120, 50],
        iconAnchor: [60, 50],
        popupAnchor: [0, -50],
      });

      const siteMarker = L.marker([site.lat, site.lng], { icon: siteIcon });

      const sitePopupHtml = `
        <div class="p-1 min-w-[220px]">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span class="font-bold text-sm text-neutral-900">${site.name}</span>
          </div>
          <p class="text-xs text-neutral-600 mb-2">${site.address || site.gateInfo}</p>
          <div class="grid grid-cols-2 gap-1.5 p-2 bg-neutral-50 rounded border border-neutral-100 text-xs mb-2">
            <div>
              <span class="text-neutral-400 block text-[10px] uppercase font-semibold">Car Capacity</span>
              <span class="font-bold text-neutral-800">${site.totalCarSlots} bays</span>
            </div>
            <div>
              <span class="text-neutral-400 block text-[10px] uppercase font-semibold">Scooter Capacity</span>
              <span class="font-bold text-neutral-800">${site.totalScooterSlots} bays</span>
            </div>
            <div>
              <span class="text-neutral-400 block text-[10px] uppercase font-semibold">Geofence</span>
              <span class="font-bold text-primary">500m active</span>
            </div>
            <div>
              <span class="text-neutral-400 block text-[10px] uppercase font-semibold">Status</span>
              <span class="font-bold text-emerald-600">${site.status}</span>
            </div>
          </div>
          <div class="text-[11px] text-neutral-500 font-mono">
            GPS: ${site.lat.toFixed(4)}°N, ${site.lng.toFixed(4)}°E
          </div>
        </div>
      `;

      siteMarker.bindPopup(sitePopupHtml);
      siteMarker.on('click', () => {
        if (onSelectSite) onSelectSite(site.id);
      });

      markersLayer.addLayer(siteMarker);
    });

    // 2. Draw Live Operators
    filteredOperators.forEach((op) => {
      allLatLngs.push([op.computedLat, op.computedLng]);

      // Connecting line from Operator to Assigned Site
      if (op.assignedSite) {
        const polyline = L.polyline(
          [
            [op.computedLat, op.computedLng],
            [op.assignedSite.lat, op.assignedSite.lng],
          ],
          {
            color: op.isBreached ? '#ef4444' : '#10b981',
            weight: 2,
            opacity: op.isBreached ? 0.9 : 0.6,
            dashArray: op.isBreached ? '4, 4' : '6, 6',
          }
        );
        markersLayer.addLayer(polyline);
      }

      // Operator Custom HTML Marker
      const isBreached = op.isBreached;
      const initials = (op.name || op.username || 'OP')
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const operatorHtml = `
        <div class="relative group cursor-pointer flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2">
          ${
            isBreached
              ? `
              <div class="absolute -inset-2 bg-rose-500/30 rounded-full animate-ping"></div>
              <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-rose-600 border-2 border-white shadow-xl text-white font-bold text-xs ring-4 ring-rose-500/20">
                ${initials}
                <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-rose-600 rounded-full flex items-center justify-center text-[9px] font-extrabold shadow">!</span>
              </div>
            `
              : `
              <div class="absolute -inset-1.5 bg-emerald-500/30 rounded-full animate-pulse"></div>
              <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-xl text-white font-bold text-xs ring-4 ring-emerald-500/20">
                ${initials}
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border border-white rounded-full"></span>
              </div>
            `
          }
          <div class="mt-1 bg-neutral-900/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-neutral-700">
            ${op.name}
          </div>
        </div>
      `;

      const opIcon = L.divIcon({
        className: 'custom-operator-marker',
        html: operatorHtml,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
        popupAnchor: [0, -25],
      });

      const opMarker = L.marker([op.computedLat, op.computedLng], { icon: opIcon });

      const opPopupHtml = `
        <div class="p-1 min-w-[220px]">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="font-bold text-sm text-neutral-900">${op.name}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isBreached
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }">
              ${isBreached ? 'GEOFENCE BREACHED' : 'INSIDE GEOFENCE'}
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-neutral-600 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">Assigned Facility:</span>
              <span class="font-semibold text-neutral-800">${op.assignedSite?.name || 'Unassigned'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">Distance from Center:</span>
              <span class="font-mono font-bold ${isBreached ? 'text-rose-600' : 'text-emerald-600'}">
                ${op.distanceMeters}m ${isBreached ? '(> 500m limit)' : '(within limit)'}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">Shift / Hours:</span>
              <span class="font-medium text-neutral-800">${op.shiftTime || 'General'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">Contact:</span>
              <span class="font-mono font-medium text-neutral-800">${op.contact || 'N/A'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">GPS Ping:</span>
              <span class="text-neutral-500 text-[11px]">${op.lastLocationUpdate ? new Date(op.lastLocationUpdate).toLocaleTimeString() : 'Live'}</span>
            </div>
          </div>

          <div class="text-[11px] font-mono text-neutral-400 bg-neutral-50 p-1.5 rounded border border-neutral-100">
            Coordinates: ${op.computedLat.toFixed(5)}, ${op.computedLng.toFixed(5)}
          </div>
        </div>
      `;

      opMarker.bindPopup(opPopupHtml);
      markersLayer.addLayer(opMarker);
    });

    // If a site is selected, focus on it
    if (selectedSiteId && selectedSiteId !== 'all') {
      const activeSite = sitesWithCoords.find((s) => s.id === selectedSiteId);
      if (activeSite) {
        mapInstanceRef.current.flyTo([activeSite.lat, activeSite.lng], 15, {
          duration: 1.2,
        });
      }
    }
  }, [sitesWithCoords, filteredOperators, selectedSiteId, onSelectSite]);

  // Recenter / Fit All Bounds handler
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] = [];
    sitesWithCoords.forEach((s) => points.push([s.lat, s.lng]));
    operatorsWithDistance.forEach((o) => points.push([o.computedLat, o.computedLng]));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  const handleCopyCoords = () => {
    if (!clickedCoords) return;
    const text = `${clickedCoords.lat}, ${clickedCoords.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <Card className={`overflow-hidden border border-neutral-200/80 shadow-sm ${className}`}>
      {/* Header bar with controls */}
      <div className="p-4 bg-white border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center shadow-md shadow-primary/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-neutral-900 text-base">
                Real-Time Operator & Sites Map
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE REAL MAP
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Interactive OpenStreetMap & CartoDB tiles • Dynamic 500m geofence monitoring & operator telemetry
            </p>
          </div>
        </div>

        {/* Filter buttons & layer controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Operator Status Filters */}
          <div className="inline-flex p-1 bg-neutral-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({operatorsWithDistance.length})
            </button>
            <button
              onClick={() => setActiveFilter('inside')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                activeFilter === 'inside'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-neutral-600 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Inside ({insideCount})
            </button>
            <button
              onClick={() => setActiveFilter('breached')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                activeFilter === 'breached'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-neutral-600 hover:text-rose-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Breached ({breachedCount})
            </button>
          </div>

          {/* Layer Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm"
              title="Change Map Style"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>{TILE_LAYERS[mapStyle].name.split(' ')[0]}</span>
            </button>

            {isStyleMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-neutral-100 py-1.5 z-[1000] text-xs">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Select Map Tile Layer
                </div>
                {(Object.keys(TILE_LAYERS) as TileLayerStyle[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMapStyle(key);
                      setIsStyleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-neutral-50 ${
                      mapStyle === key ? 'text-primary font-bold bg-blue-50/50' : 'text-neutral-700'
                    }`}
                  >
                    <span>{TILE_LAYERS[key].name}</span>
                    {mapStyle === key && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recenter / Fit All Button */}
          <button
            onClick={handleFitAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm"
            title="Fit All Sites & Operators"
          >
            <Crosshair className="w-3.5 h-3.5 text-primary" />
            <span>Recenter</span>
          </button>
        </div>
      </div>

      {/* Geofence Breach Banner if any operators are breached */}
      {breachedCount > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span className="font-bold">
              {breachedCount} {breachedCount === 1 ? 'Operator' : 'Operators'} currently beyond assigned 500m geofence radius!
            </span>
            <span className="text-rose-600 hidden sm:inline">• Immediate admin review recommended</span>
          </div>
          <button
            onClick={() => setActiveFilter('breached')}
            className="font-bold text-rose-700 hover:underline"
          >
            View Breaches →
          </button>
        </div>
      )}

      {/* Real Interactive Map Canvas */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          style={{ height: '480px', width: '100%', zIndex: 1 }}
          className="bg-neutral-100"
        />

        {/* Floating Map Legend Overlay */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-neutral-200/80 p-3 text-xs space-y-2 pointer-events-auto max-w-[240px]">
          <div className="font-bold text-neutral-900 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Live Radar Legend</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow"></span>
              <span>Operator (Inside Geofence)</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow animate-pulse"></span>
              <span>Operator (Breached &gt;500m)</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="w-4 h-4 rounded-full bg-primary text-white font-bold text-[9px] flex items-center justify-center">P</span>
              <span>Parking Facility Pin</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-primary"></span>
              <span>500m Geofence Boundary</span>
            </div>
          </div>
        </div>

        {/* Coordinates Inspector Banner (Triggered by clicking map) */}
        {clickedCoords && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 z-[400] bg-neutral-900/90 backdrop-blur-md text-white rounded-xl shadow-xl border border-neutral-700 p-2.5 px-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-primary animate-spin" />
              <div>
                <span className="text-neutral-400 text-[10px] block font-semibold uppercase">Map Clicked GPS Point</span>
                <span className="font-mono font-bold text-white">
                  {clickedCoords.lat}° N, {clickedCoords.lng}° E
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCoords}
                className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCoords ? 'Copied!' : 'Copy Coords'}</span>
              </button>
              <button
                onClick={() => setClickedCoords(null)}
                className="text-neutral-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* On-Duty Operator Live Telemetry Audit Table */}
      <div className="p-4 bg-neutral-50/70 border-t border-neutral-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-neutral-900 text-xs">
              Live Operator Telemetry & Geofence Audit
            </h4>
          </div>
          <span className="text-[11px] text-neutral-400 font-medium">
            Syncing in real time • Auto-refreshes every 5s
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {operatorsWithDistance.map((op) => (
            <div
              key={op.id}
              className={`p-3 rounded-xl border bg-white transition-all shadow-sm flex flex-col justify-between ${
                op.isBreached
                  ? 'border-rose-300 ring-1 ring-rose-300/40 bg-rose-50/20'
                  : 'border-neutral-200 hover:border-primary/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                        op.isBreached ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                    >
                      {(op.name || op.username || 'OP').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-neutral-900 text-xs">{op.name}</h5>
                      <span className="text-[11px] text-neutral-400">@{op.username}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      op.isBreached
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        op.isBreached ? 'bg-rose-600 animate-ping' : 'bg-emerald-500'
                      }`}
                    ></span>
                    {op.isBreached ? 'BREACHED' : 'INSIDE'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-neutral-600 pt-1 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[11px]">Facility:</span>
                    <span className="font-semibold text-neutral-800 text-[11px] truncate max-w-[130px]">
                      {op.assignedSite?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[11px]">Distance from Site:</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        op.isBreached ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {op.distanceMeters}m {op.isBreached ? '(Beyond 500m)' : '(Within 500m)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[11px]">Shift:</span>
                    <span className="text-neutral-600 text-[11px]">{op.shiftTime || 'General'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 font-mono">
                  {op.computedLat.toFixed(4)}, {op.computedLng.toFixed(4)}
                </span>
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([op.computedLat, op.computedLng], 16, {
                        duration: 1.2,
                      });
                    }
                  }}
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Locate</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
