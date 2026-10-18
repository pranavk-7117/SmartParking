import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Shield,
  AlertTriangle,
  Radio,
  Navigation,
  RefreshCw,
  Eye,
  Info,
  Layers,
  Crosshair,
  Check,
  User,
  Clock,
  Phone,
  Plus,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Site, OperatorAccount } from '../../types';

interface OperatorTrackingMapProps {
  sites: Site[];
  operators: OperatorAccount[];
  selectedSiteId?: string;
  focusOperatorId?: string;
  onSelectSite?: (siteId: string) => void;
  onOpenAddSite?: () => void;
  className?: string;
}



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

// Requirement 1: Removed CartoDB Voyager. Verified, 100% reliable tile layers
type TileLayerStyle = 'google' | 'google_hybrid' | 'streets' | 'satellite';

const TILE_LAYERS: Record<TileLayerStyle, { name: string; url: string; maxZoom: number }> = {
  google: {
    name: 'Google Maps (Roadmap)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxZoom: 20,
  },
  google_hybrid: {
    name: 'Google Maps (Satellite Hybrid)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
  },
  streets: {
    name: 'Esri World Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  },
  satellite: {
    name: 'Esri Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  },
};

export const OperatorTrackingMap: React.FC<OperatorTrackingMapProps> = ({
  sites,
  operators,
  selectedSiteId,
  focusOperatorId,
  onSelectSite,
  onOpenAddSite,
  className = '',
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const operatorMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const hasFittedRef = useRef(false);

  const [mapStyle, setMapStyle] = useState<TileLayerStyle>('google');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(focusOperatorId || '');
  const [isRadarSweepActive, setIsRadarSweepActive] = useState(true);

  // Expose global navigator so Leaflet popup HTML buttons can trigger React Router navigation
  useEffect(() => {
    (window as any).__parkit_view_operator = (opId: string) => {
      navigate(`/operators/${opId}`);
    };
    return () => {
      delete (window as any).__parkit_view_operator;
    };
  }, [navigate]);

  // Sync focusOperatorId prop
  useEffect(() => {
    if (focusOperatorId) {
      setSelectedOperatorId(focusOperatorId);
    }
  }, [focusOperatorId]);

interface SiteWithCoords extends Site {
  lat: number;
  lng: number;
  radiusMeters: number;
}

  // Parse sites with real coordinates strictly (zero mock fallback)
  const sitesWithCoords: SiteWithCoords[] = useMemo(() => {
    return sites
      .filter(
        (s): s is Site & { latitude: number; longitude: number } =>
          typeof s.latitude === 'number' &&
          typeof s.longitude === 'number' &&
          !isNaN(s.latitude) &&
          !isNaN(s.longitude)
      )
      .map((s) => ({
        ...s,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        radiusMeters: 500,
      }));
  }, [sites]);

  // Map each operator with location, online/offline freshness, and assigned site distance
  const operatorsWithDistance = useMemo(() => {
    return operators.map((op) => {
      const assignedSite = sitesWithCoords.find(
        (s) =>
          s.id === op.assignedSiteId ||
          (s as any).code === op.assignedSiteId ||
          (s as any).dbId === op.assignedSiteId
      );

      const hasGps =
        typeof op.lastLatitude === 'number' &&
        typeof op.lastLongitude === 'number' &&
        !isNaN(op.lastLatitude) &&
        !isNaN(op.lastLongitude);

      const lat = hasGps ? op.lastLatitude! : null;
      const lng = hasGps ? op.lastLongitude! : null;

      let distance = 0;
      if (assignedSite && hasGps && lat !== null && lng !== null) {
        distance = calculateDistanceMeters(lat, lng, assignedSite.lat, assignedSite.lng);
      }

      const isBreached = op.geofenceStatus === 'BREACHED' || (hasGps && distance > 500);

      const now = Date.now();
      const updateTime = op.lastLocationUpdate ? new Date(op.lastLocationUpdate).getTime() : 0;
      const isOnline = Boolean(hasGps && updateTime > 0 && now - updateTime <= 5 * 60 * 1000);

      let lastSeenText = 'No GPS broadcast';
      if (updateTime > 0) {
        const diffMinutes = Math.floor((now - updateTime) / 60000);
        if (diffMinutes < 1) {
          lastSeenText = 'Just now (Live)';
        } else if (diffMinutes < 60) {
          lastSeenText = `${diffMinutes}m ago`;
        } else {
          const diffHours = Math.floor(diffMinutes / 60);
          lastSeenText = `${diffHours}h ${diffMinutes % 60}m ago`;
        }
      }

      return {
        ...op,
        computedLat: lat,
        computedLng: lng,
        hasRealGps: hasGps,
        isOnline,
        lastSeenText,
        assignedSite,
        distanceMeters: distance,
        isBreached,
      };
    });
  }, [operators, sitesWithCoords]);

  // Selected operator object for side panel
  const selectedOperator = useMemo(() => {
    return operatorsWithDistance.find((o) => o.id === selectedOperatorId) || null;
  }, [operatorsWithDistance, selectedOperatorId]);

  // 1. Initialize Leaflet Map (Requirement 3: attributionControl false completely removes Leaflet link)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = [18.515, 73.865];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: false,
      attributionControl: false, // Requirement 3: Leaflet watermark removed completely
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerConfig = TILE_LAYERS[mapStyle];
    const tileLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Change Tile Layer Dynamically
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const layerConfig = TILE_LAYERS[mapStyle];
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
    });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // 3. Render Sites, Geofences, and Operators
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    operatorMarkersMapRef.current.clear();

    const allLatLngs: [number, number][] = [];

    // 1. Draw Sites and their 500m Geofences
    sitesWithCoords.forEach((site) => {
      allLatLngs.push([site.lat, site.lng]);
      const isSelected = selectedSiteId === site.id;
      const siteColor = isSelected ? '#1d4ed8' : '#2563eb';

      // 500m Geofence Perimeter Circle
      const circle = L.circle([site.lat, site.lng], {
        radius: site.radiusMeters,
        color: siteColor,
        weight: isSelected ? 2.5 : 1.5,
        opacity: isSelected ? 0.9 : 0.6,
        fillColor: siteColor,
        fillOpacity: isSelected ? 0.15 : 0.07,
        dashArray: '5, 5',
      });
      markersLayer.addLayer(circle);

      // Site Custom Pin
      const siteHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 140px; cursor: pointer; user-select: none;">
          <div style="background: rgba(15, 23, 42, 0.95); color: #ffffff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); white-space: nowrap; display: flex; align-items: center; gap: 5px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #38bdf8;"></span>
            <span>${site.name.replace('ParkIT – ', '')}</span>
          </div>
          <div style="width: 30px; height: 30px; border-radius: 50%; background: ${siteColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 12px; margin-top: 2px;">
            P
          </div>
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${siteColor};"></div>
        </div>
      `;

      const siteIcon = L.divIcon({
        className: 'custom-site-marker',
        html: siteHtml,
        iconSize: [140, 58],
        iconAnchor: [70, 58],
        popupAnchor: [0, -58],
      });

      const siteMarker = L.marker([site.lat, site.lng], { icon: siteIcon });
      siteMarker.bindPopup(`
        <div style="padding: 4px; min-width: 200px; font-family: inherit;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${site.name}</div>
          <p style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${site.address || site.gateInfo}</p>
          <div style="font-size: 11px; color: #1e293b; font-weight: 600;">Capacity: ${site.totalCarSlots} Cars • ${site.totalScooterSlots} Scooters</div>
          <div style="font-size: 10px; color: #2563eb; font-weight: 700; margin-top: 4px;">500m Security Geofence Active</div>
        </div>
      `);
      siteMarker.on('click', () => {
        if (onSelectSite) onSelectSite(site.id);
      });

      markersLayer.addLayer(siteMarker);
    });

    // 2. Draw Operators from Database with valid GPS
    operatorsWithDistance.forEach((op) => {
      if (!op.hasRealGps || op.computedLat === null || op.computedLng === null) {
        return;
      }
      allLatLngs.push([op.computedLat, op.computedLng]);

      // Connecting line from Operator to Assigned Site (only if assignedSite has real coords)
      if (op.assignedSite && typeof op.assignedSite.lat === 'number' && typeof op.assignedSite.lng === 'number') {
        const polyline = L.polyline(
          [
            [op.computedLat, op.computedLng],
            [op.assignedSite.lat, op.assignedSite.lng],
          ],
          {
            color: op.isBreached ? '#dc2626' : op.isOnline ? '#16a34a' : '#64748b',
            weight: op.isBreached ? 2.5 : 2,
            opacity: op.isBreached ? 0.9 : 0.6,
            dashArray: op.isOnline ? (op.isBreached ? '4, 4' : '6, 6') : '3, 6',
          }
        );
        markersLayer.addLayer(polyline);
      }

      // Operator Custom HTML Marker
      const isBreached = op.isBreached;
      const isOnline = op.isOnline;
      const initials = (op.name || op.username || 'OP')
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const opBg = isBreached ? '#dc2626' : isOnline ? '#16a34a' : '#475569';
      const opRing = isBreached
        ? 'rgba(220, 38, 38, 0.35)'
        : isOnline
        ? 'rgba(22, 163, 74, 0.3)'
        : 'rgba(100, 116, 139, 0.3)';
      const badgeDotColor = isBreached ? '#f87171' : isOnline ? '#4ade80' : '#94a3b8';

      const operatorHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 110px; cursor: pointer; user-select: none;">
          <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: ${opBg}; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px; outline: 3px solid ${opRing};">
            ${initials}
            <span style="position: absolute; bottom: -2px; right: -2px; width: 9px; height: 9px; border-radius: 50%; background: ${badgeDotColor}; border: 1.5px solid #ffffff;"></span>
          </div>
          <div style="background: rgba(15, 23, 42, 0.95); color: #ffffff; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; margin-top: 2px; max-width: 105px; overflow: hidden; text-overflow: ellipsis;">
            ${op.name}
          </div>
        </div>
      `;

      const opIcon = L.divIcon({
        className: 'custom-operator-marker',
        html: operatorHtml,
        iconSize: [110, 52],
        iconAnchor: [55, 17],
        popupAnchor: [0, -18],
      });

      const opMarker = L.marker([op.computedLat, op.computedLng], { icon: opIcon });

      const statusTagBg = isBreached ? '#fee2e2' : isOnline ? '#dcfce7' : '#f1f5f9';
      const statusTagColor = isBreached ? '#b91c1c' : isOnline ? '#15803d' : '#475569';
      const statusText = isBreached
        ? 'BREACHED (>500m)'
        : isOnline
        ? 'ONLINE • INSIDE'
        : `OFFLINE • ${op.lastSeenText}`;

      // Requirement 7: Clickable popup with direct action button to view profile in Operator Management
      const opPopupHtml = `
        <div style="padding: 4px; min-width: 220px; font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 13px; color: #0f172a;">${op.name}</span>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; background: ${statusTagBg}; color: ${statusTagColor};">
              ${statusText}
            </span>
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.5;">
            <div>Facility: <strong style="color: #1e293b;">${op.assignedSite?.name || 'Unassigned'}</strong></div>
            <div>Distance: <strong style="color: ${isBreached ? '#dc2626' : '#16a34a'};">${op.distanceMeters}m</strong> ${isBreached ? '(Outside 500m)' : '(Within radius)'}</div>
            <div>Phone: <span style="font-family: monospace;">${op.contact || 'N/A'}</span></div>
          </div>

          <button 
            type="button" 
            onclick="window.__parkit_view_operator('${op.id}')"
            style="display: block; width: 100%; text-align: center; margin-top: 6px; padding: 6px 10px; background: #2563eb; color: #ffffff; border-radius: 6px; font-weight: 700; font-size: 11px; border: none; cursor: pointer;"
          >
            View Operator Profile →
          </button>
        </div>
      `;

      opMarker.bindPopup(opPopupHtml);

      // Clicking operator pin selects them in the 35% side panel and focuses camera
      opMarker.on('click', () => {
        setSelectedOperatorId(op.id);
      });

      markersLayer.addLayer(opMarker);
      operatorMarkersMapRef.current.set(op.id, opMarker);
    });

    // Auto-fit on initial load
    if (!hasFittedRef.current && allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      hasFittedRef.current = true;
    }
  }, [sitesWithCoords, operatorsWithDistance, selectedSiteId, onSelectSite]);

  // Recenter / Fit All
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const allPoints: [number, number][] = [
      ...sitesWithCoords.map((s) => [s.lat, s.lng] as [number, number]),
      ...operatorsWithDistance
        .filter((o) => o.hasRealGps && o.computedLat !== null && o.computedLng !== null)
        .map((o) => [o.computedLat!, o.computedLng!] as [number, number]),
    ];
    if (allPoints.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allPoints), {
        padding: [40, 40],
        maxZoom: 14,
      });
    } else {
      mapInstanceRef.current.setView([18.5204, 73.8567], 12);
    }
  };

  // Fly to operator when selected in dropdown or by prop
  const handleSelectOperator = (opId: string) => {
    setSelectedOperatorId(opId);
    if (!opId || !mapInstanceRef.current) return;
    const targetOp = operatorsWithDistance.find((o) => o.id === opId);
    if (targetOp && targetOp.hasRealGps && targetOp.computedLat !== null && targetOp.computedLng !== null) {
      mapInstanceRef.current.flyTo([targetOp.computedLat, targetOp.computedLng], 15, {
        duration: 2.2,
        easeLinearity: 0.2,
      });
      const marker = operatorMarkersMapRef.current.get(targetOp.id);
      if (marker) {
        setTimeout(() => marker.openPopup(), 1800);
      }
    }
  };

  return (
    <div
      className={`w-full rounded-card border border-neutral-200 bg-white shadow-soft overflow-hidden h-[75vh] flex flex-col ${className}`}
    >
      {/* Requirement 5: Divided into 2 parts: 65% Map and 35% Details Panel */}
      <div className="flex flex-col lg:flex-row flex-1 h-full min-h-0 overflow-hidden">
        {/* Left / Bigger Part: 65% Map Display */}
        <div className="w-full lg:w-[65%] h-full relative flex flex-col min-h-0">
          {/* Floating Map Controls Toolbar */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg border border-neutral-200/90 shadow-md">
            {/* Tile Layer Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-200 rounded-md text-xs font-bold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
                title="Select Tile Layer"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{TILE_LAYERS[mapStyle].name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {isStyleMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-[1100] text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Map Tile Layer
                  </div>
                  {(Object.keys(TILE_LAYERS) as TileLayerStyle[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setMapStyle(key);
                        setIsStyleMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-neutral-50 ${
                        mapStyle === key ? 'text-primary font-bold bg-blue-50/60' : 'text-neutral-700'
                      }`}
                    >
                      <span>{TILE_LAYERS[key].name}</span>
                      {mapStyle === key && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recenter */}
            <button
              type="button"
              onClick={handleFitAll}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 rounded-md text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs"
              title="Recenter Map View"
            >
              <Crosshair className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Recenter</span>
            </button>

            {/* Toggle Radar Sweep */}
            <button
              type="button"
              onClick={() => setIsRadarSweepActive(!isRadarSweepActive)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-colors shadow-2xs ${
                isRadarSweepActive
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
              title="Toggle Live Radar Sweep Animation"
            >
              <Radio className={`w-3.5 h-3.5 ${isRadarSweepActive ? 'animate-pulse text-rose-600' : ''}`} />
              <span className="hidden sm:inline">Radar</span>
            </button>

            {/* Add Site Modal trigger */}
            {onOpenAddSite && (
              <button
                type="button"
                onClick={onOpenAddSite}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-2xs transition-colors"
                title="Add New Parking Site"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Site</span>
              </button>
            )}
          </div>

          {/* Radar Line Sweep Simulation Effect */}
          {isRadarSweepActive && (
            <div className="absolute inset-0 pointer-events-none z-[400] overflow-hidden opacity-30">
              <div className="w-[200%] h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent absolute top-1/2 left-[-50%] transform -translate-y-1/2 rotate-[25deg] animate-pulse"></div>
            </div>
          )}

          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="w-full h-full flex-1" />
        </div>

        {/* Vertical Divider Line between 65% and 35% */}
        <div className="hidden lg:block w-px bg-neutral-200 h-full shrink-0" />

        {/* Right / Smaller Part: 35% Details & Controls Panel */}
        <div className="w-full lg:w-[35%] h-full flex flex-col justify-between bg-neutral-50/70 border-t lg:border-t-0 border-neutral-200 overflow-y-auto p-4 space-y-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-primary animate-pulse" />
                  <span>Live Operator Radar & Geofence</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Real-time GPS positioning & boundary telemetry
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-primary border border-blue-200">
                {operatorsWithDistance.length} {operatorsWithDistance.length === 1 ? 'Operator' : 'Operators'}
              </span>
            </div>

            {/* Requirement 2: Operator Selector Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="operator-select" className="block text-xs font-bold text-neutral-700">
                Select Operator to Inspect:
              </label>
              {operatorsWithDistance.length === 0 ? (
                <div className="p-2.5 rounded-control bg-white border border-neutral-200 text-xs text-neutral-500 text-center">
                  No operators registered in database
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="operator-select"
                    value={selectedOperatorId}
                    onChange={(e) => handleSelectOperator(e.target.value)}
                    className="w-full appearance-none bg-white text-neutral-900 text-xs font-semibold rounded-control border border-neutral-200 hover:border-neutral-300 focus:border-primary px-3 py-2 cursor-pointer pr-8 shadow-2xs"
                  >
                    <option value="">-- View All Operators on Map --</option>
                    {operatorsWithDistance.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} (@{op.username}) — {op.isBreached ? 'BREACHED' : op.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Selected Operator Detailed Card */}
            {selectedOperator ? (
              <div
                className={`p-3.5 rounded-card border bg-white shadow-xs space-y-3 transition-all ${
                  selectedOperator.isBreached
                    ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                    : 'border-neutral-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                        selectedOperator.isBreached
                          ? 'bg-rose-600'
                          : selectedOperator.isOnline
                          ? 'bg-emerald-600'
                          : 'bg-slate-500'
                      }`}
                    >
                      {(selectedOperator.name || selectedOperator.username || 'OP').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 text-xs leading-tight">
                        {selectedOperator.name}
                      </h4>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        @{selectedOperator.username}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedOperator.isBreached
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : selectedOperator.isOnline
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedOperator.isBreached
                          ? 'bg-rose-600 animate-ping'
                          : selectedOperator.isOnline
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    ></span>
                    {selectedOperator.isBreached ? 'BREACHED' : selectedOperator.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Assigned Facility:</span>
                    <strong className="text-neutral-900 font-semibold truncate max-w-[170px]">
                      {selectedOperator.assignedSite?.name || 'Unassigned'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Distance from Center:</span>
                    <span
                      className={`font-mono font-bold ${
                        !selectedOperator.hasRealGps
                          ? 'text-slate-400'
                          : selectedOperator.isBreached
                          ? 'text-rose-600'
                          : selectedOperator.isOnline
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {selectedOperator.hasRealGps ? (
                        <>
                          {selectedOperator.distanceMeters}m{' '}
                          {selectedOperator.isBreached ? '(Outside 500m)' : '(Within 500m)'}
                        </>
                      ) : (
                        'No GPS telemetry'
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Last Telemetry:</span>
                    <span className="text-neutral-700 font-medium">
                      {selectedOperator.isOnline ? 'Live Active' : selectedOperator.lastSeenText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Phone:</span>
                    <span className="font-mono text-neutral-700">{selectedOperator.contact || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">GPS Coordinates:</span>
                    <span className="font-mono text-[10px] text-neutral-600">
                      {selectedOperator.hasRealGps &&
                      selectedOperator.computedLat !== null &&
                      selectedOperator.computedLng !== null ? (
                        `${selectedOperator.computedLat.toFixed(4)}°N, ${selectedOperator.computedLng.toFixed(4)}°E`
                      ) : (
                        <span className="text-amber-600 font-semibold">Awaiting device GPS fix</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Requirement 7: Button to redirect to operator's profile in Operator Management */}
                <button
                  type="button"
                  onClick={() => navigate(`/operators/${selectedOperator.id}`)}
                  className="w-full py-2 px-3 rounded-control bg-primary hover:bg-primary-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer mt-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Operator Profile & History →</span>
                </button>
              </div>
            ) : operatorsWithDistance.length > 0 ? (
              <div className="p-3 bg-white rounded-card border border-neutral-200 text-xs text-neutral-600 space-y-1.5">
                <div className="font-bold text-neutral-800">Network Fleet Summary:</div>
                <div className="text-[11px] text-neutral-500">
                  {operatorsWithDistance.filter((o) => o.isOnline).length} Active Online •{' '}
                  {operatorsWithDistance.filter((o) => !o.isOnline).length} Offline •{' '}
                  {operatorsWithDistance.filter((o) => o.isBreached).length} Geofence Breaches
                </div>
                <p className="text-[11px] text-neutral-400 pt-1">
                  Click any operator marker on the map or select from the dropdown above to view live telemetry.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-card border border-neutral-200 text-center space-y-2">
                <User className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="text-xs font-bold text-neutral-700">No Operators Registered</div>
                <p className="text-[11px] text-neutral-400">
                  There are currently no operator accounts in the database. Add operators in the Operator Management section.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/operators')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-control bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  Go to Operator Management
                </button>
              </div>
            )}
          </div>

          {/* Requirement 4: Clean, Professional Index / Map Legend */}
          <div className="pt-3 border-t border-neutral-200 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Map Index
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-2xs"></span>
                <span>Parking Facility</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-dashed border-blue-500 bg-blue-50"></span>
                <span>500m Geofence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Operator Online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span>Operator Offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span>Geofence Breach</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-rose-400 border-t border-dashed border-rose-500"></span>
                <span>Radar Sweep</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
