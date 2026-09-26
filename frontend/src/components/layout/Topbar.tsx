import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ChevronDown, Check, Building2, MapPin, Car, Layers, PanelLeftClose, PanelLeftOpen, RefreshCw } from 'lucide-react';
import { useLiveData } from '../../context/LiveDataContext';

export interface TopbarProps {
  onOpenMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileMenu,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { sites, currentSiteId, currentSite, setCurrentSiteId, availability, refresh } = useLiveData();
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalNetworkCars = sites.reduce((sum, s) => sum + (s.totalCarSlots || 0), 0);
  const totalNetworkScooters = sites.reduce((sum, s) => sum + (s.totalScooterSlots || 0), 0);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 shadow-soft">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger, Desktop sidebar toggle & Site Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-control text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden md:flex p-2 rounded-control text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Site Switcher Control */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-control border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition-all text-left shadow-xs"
              aria-expanded={isSiteDropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-control bg-primary flex items-center justify-center text-white shrink-0 shadow-xs">
                {currentSiteId === 'all' ? (
                  <Layers className="w-4 h-4" />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block leading-tight">
                  {currentSiteId === 'all' ? 'Network Overview' : 'Active Parking Site'}
                </span>
                <span className="text-xs font-bold text-neutral-900 leading-tight flex items-center gap-1">
                  {currentSite.name}
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isSiteDropdownOpen ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </button>

            { /* Site Switcher Popover */ }
            {isSiteDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white rounded-card shadow-modal border border-neutral-200 py-1.5 z-50 animate-scale-up">
                <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Select Site View</p>
                  <span className="text-[10px] font-medium text-neutral-400">{sites.length} Sites</span>
                </div>
                <div className="max-h-80 overflow-y-auto py-1 divide-y divide-neutral-100">
                  {/* COMBINED / ALL PARKING SITES OPTION */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSiteId('all');
                      setIsSiteDropdownOpen(false);
                    }}
                    className={`w-full flex items-start justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors ${
                      currentSiteId === 'all' ? 'bg-blue-50/70 border-l-3 border-primary' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className={`text-xs font-bold truncate ${currentSiteId === 'all' ? 'text-primary' : 'text-neutral-900'}`}>
                          All Parking Sites (Combined)
                        </span>
                        <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-pill shrink-0">
                          Combined
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                        Combined revenue, slots & transactions across all {sites.length} locations
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400 font-mono">
                        <span>{totalNetworkCars} Cars Total</span>
                        <span>•</span>
                        <span>{totalNetworkScooters} Scooters Total</span>
                      </div>
                    </div>
                    {currentSiteId === 'all' && (
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>

                  {/* INDIVIDUAL SITES */}
                  {sites.map((s) => {
                    const isSelected = s.id === currentSiteId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCurrentSiteId(s.id);
                          setIsSiteDropdownOpen(false);
                        }}
                        className={`w-full flex items-start justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors ${
                          isSelected ? 'bg-blue-50/60 border-l-3 border-primary' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-primary' : 'text-neutral-900'
                              }`}
                            >
                              {s.name}
                            </span>
                            {s.status === 'Coming Soon' && (
                              <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-pill">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                            {s.gateInfo}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                            <span>{s.totalCarSlots} Cars</span>
                            <span>•</span>
                            <span>{s.totalScooterSlots} Scooters</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        { /* Center: Clickable Site Name -> Site Details Page per §3.2.3 (hidden on small screens to prevent topbar overflow) */ }
        <div className="hidden md:flex items-center justify-center">
          <Link
            to={`/sites/${currentSiteId}`}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-control bg-neutral-100/80 hover:bg-blue-50 border border-neutral-200/80 hover:border-primary/30 transition-all text-neutral-800 hover:text-primary group"
            title="View Site Details"
          >
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-bold truncate max-w-[200px] lg:max-w-none">
              {currentSite.name}
            </span>
            <span className="text-[11px] text-neutral-400 group-hover:text-primary/70 transition-colors font-medium hidden lg:inline">
              (View Site Details →)
            </span>
          </Link>
        </div>

        { /* Right: Manual Sync Refresh + Capacity Summary */ }
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-semibold text-neutral-600 hover:text-primary hover:bg-neutral-100 border border-neutral-200 transition-all cursor-pointer shadow-2xs"
            title="Sync with database now"
            aria-label="Sync with database now"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500 hover:text-primary" />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-semibold text-neutral-700">
              {currentSite.gateInfo}
            </span>
            <span className="text-[10px] text-neutral-400">
              {availability.totalAvailable} / {availability.totalSlots} Slots Vacant
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
