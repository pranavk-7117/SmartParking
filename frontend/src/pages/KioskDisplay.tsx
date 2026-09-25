import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Car,
  Bike,
  ParkingSquare,
  AlertOctagon,
  Radio,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useLiveData } from '../context/LiveDataContext';

export const KioskDisplay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryStateFull = searchParams.get('state') === 'full';

  const { availability, hasRecentUpdate, isFacilityFull, toggleFacilityFullSimulation } =
    useLiveData();

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const isFull =
    queryStateFull ||
    isFacilityFull ||
    (availability.carAvailable === 0 && availability.scooterAvailable === 0);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [availability.updatedAt]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getNumberStyle = (avail: number, total: number) => {
    if (avail === 0) {
      return {
        color: 'text-danger',
        label: 'FULL',
        glow: 'drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]',
      };
    }
    const pct = (avail / (total || 1)) * 100;
    if (pct < 15) {
      return {
        color: 'text-warning',
        label: avail.toString(),
        glow: 'drop-shadow-[0_0_25px_rgba(217,119,6,0.5)]',
      };
    }
    return {
      color: 'text-success',
      label: avail.toString(),
      glow: 'drop-shadow-[0_0_30px_rgba(22,163,74,0.4)]',
    };
  };

  const carStyle = getNumberStyle(availability.carAvailable, availability.carTotal);
  const scooterStyle = getNumberStyle(availability.scooterAvailable, availability.scooterTotal);
  const totalStyle = getNumberStyle(availability.totalAvailable, availability.totalSlots);

  return (
    <div
      className={`min-h-screen w-full bg-[#111827] text-white flex flex-col justify-between select-none relative overflow-hidden font-sans ${
        orientation === 'portrait' ? 'max-w-[720px] mx-auto border-x border-neutral-800' : ''
      }`}
    >
      {/* Subtle Ambient Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#111827] to-[#0A0E17] pointer-events-none" />

      {/* Floating Kiosk Preview Controls (unobtrusive, top header on hover) */}
      <header className="relative z-20 w-full p-4 flex items-center justify-between text-neutral-400 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold hover:text-white bg-neutral-800/80 px-3 py-1.5 rounded-control border border-neutral-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1 bg-neutral-800/80 p-0.5 rounded-control border border-neutral-700 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`p-1.5 rounded flex items-center gap-1 ${
                orientation === 'landscape' ? 'bg-primary text-white font-bold' : 'hover:text-white'
              }`}
              title="16:9 Landscape LED Board"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`p-1.5 rounded flex items-center gap-1 ${
                orientation === 'portrait' ? 'bg-primary text-white font-bold' : 'hover:text-white'
              }`}
              title="9:16 Portrait LED Board"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Full State Preview */}
          <button
            type="button"
            onClick={toggleFacilityFullSimulation}
            className={`px-3 py-1.5 rounded-control text-xs font-bold border transition-colors ${
              isFull
                ? 'bg-danger text-white border-red-500'
                : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
          >
            {isFull ? 'Exit "Facility Full" Preview' : 'Preview "Facility Full" State'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-control bg-neutral-800/80 border border-neutral-700 hover:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area: Three-Panel Layout OR Facility Full Banner */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-8 md:px-12 py-6">
        {isFull ? (
          /* "Facility Full" State (Entry Denied Condition) per §3.9 */
          <div className="w-full max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-danger/25 to-danger/10 border-4 border-danger p-8 sm:p-14 text-center space-y-8 animate-pulse-fast shadow-2xl">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-danger text-white shadow-2xl">
                <AlertOctagon className="w-16 h-16 sm:w-24 sm:h-24 animate-bounce" />
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_35px_rgba(220,38,38,0.8)] font-sans">
                PARKING FULL
              </h1>
              <p className="text-lg sm:text-2xl font-bold text-red-200 tracking-wide uppercase">
                All vehicle bays currently occupied • Entry temporarily closed
              </p>
            </div>

            {/* Category breakdown shown smaller below so visitors know which might free up first per §3.9 */}
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-6 border-t border-red-500/30 text-center">
              <div className="bg-neutral-900/80 p-4 rounded-2xl border border-red-500/40">
                <div className="flex items-center justify-center gap-2 text-neutral-300 font-bold text-sm">
                  <Car className="w-4 h-4" />
                  <span>CARS</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-danger mt-1">0 LEFT</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {availability.carTotal} / {availability.carTotal} occupied
                </div>
              </div>

              <div className="bg-neutral-900/80 p-4 rounded-2xl border border-red-500/40">
                <div className="flex items-center justify-center gap-2 text-neutral-300 font-bold text-sm">
                  <Bike className="w-4 h-4" />
                  <span>SCOOTERS</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-danger mt-1">0 LEFT</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {availability.scooterTotal} / {availability.scooterTotal} occupied
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Three-Panel Horizontal Layout per §3.9 */
          <div
            className={`w-full max-w-7xl mx-auto grid gap-6 md:gap-8 ${
              orientation === 'portrait' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
            }`}
          >
            {/* Panel 1: Car Slots */}
            <div className="bg-neutral-900/90 rounded-3xl border-2 border-neutral-800 p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-elevated hover:border-neutral-700 transition-all">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Car className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-wider text-neutral-100 uppercase">
                    Car Slots
                  </h2>
                  <p className="text-xs text-neutral-400 font-semibold uppercase tracking-widest">
                    Available
                  </p>
                </div>
              </div>

              <div className="my-6 sm:my-10">
                <span
                  className={`font-sans font-black leading-none block transition-all duration-300 ${
                    carStyle.color
                  } ${carStyle.glow} ${
                    hasRecentUpdate ? 'scale-105 opacity-90' : 'scale-100 opacity-100'
                  } ${
                    carStyle.label === 'FULL'
                      ? 'text-7xl sm:text-8xl md:text-9xl tracking-tight'
                      : 'text-8xl sm:text-9xl md:text-[160px] lg:text-[190px] xl:text-[220px]'
                  }`}
                >
                  {carStyle.label}
                </span>
              </div>

              <div className="w-full pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 font-semibold">
                <span>TOTAL CAPACITY</span>
                <span className="font-mono text-neutral-200">{availability.carTotal} BAYS</span>
              </div>
            </div>

            {/* Panel 2: Scooter Slots */}
            <div className="bg-neutral-900/90 rounded-3xl border-2 border-neutral-800 p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-elevated hover:border-neutral-700 transition-all">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Bike className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-wider text-neutral-100 uppercase">
                    Scooter Slots
                  </h2>
                  <p className="text-xs text-neutral-400 font-semibold uppercase tracking-widest">
                    Available
                  </p>
                </div>
              </div>

              <div className="my-6 sm:my-10">
                <span
                  className={`font-sans font-black leading-none block transition-all duration-300 ${
                    scooterStyle.color
                  } ${scooterStyle.glow} ${
                    hasRecentUpdate ? 'scale-105 opacity-90' : 'scale-100 opacity-100'
                  } ${
                    scooterStyle.label === 'FULL'
                      ? 'text-7xl sm:text-8xl md:text-9xl tracking-tight'
                      : 'text-8xl sm:text-9xl md:text-[160px] lg:text-[190px] xl:text-[220px]'
                  }`}
                >
                  {scooterStyle.label}
                </span>
              </div>

              <div className="w-full pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 font-semibold">
                <span>TOTAL CAPACITY</span>
                <span className="font-mono text-neutral-200">{availability.scooterTotal} BAYS</span>
              </div>
            </div>

            {/* Panel 3: Total Available */}
            <div className="bg-neutral-900/90 rounded-3xl border-2 border-neutral-800 p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-elevated hover:border-neutral-700 transition-all">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <ParkingSquare className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-wider text-neutral-100 uppercase">
                    Total Left
                  </h2>
                  <p className="text-xs text-neutral-400 font-semibold uppercase tracking-widest">
                    Combined
                  </p>
                </div>
              </div>

              <div className="my-6 sm:my-10">
                <span
                  className={`font-sans font-black leading-none block transition-all duration-300 ${
                    totalStyle.color
                  } ${totalStyle.glow} ${
                    hasRecentUpdate ? 'scale-105 opacity-90' : 'scale-100 opacity-100'
                  } ${
                    totalStyle.label === 'FULL'
                      ? 'text-7xl sm:text-8xl md:text-9xl tracking-tight'
                      : 'text-8xl sm:text-9xl md:text-[160px] lg:text-[190px] xl:text-[220px]'
                  }`}
                >
                  {totalStyle.label}
                </span>
              </div>

              <div className="w-full pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 font-semibold">
                <span>FACILITY TOTAL</span>
                <span className="font-mono text-neutral-200">{availability.totalSlots} SLOTS</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Kiosk Footer Indicator Bar per §3.9 */}
      <footer className="relative z-10 w-full px-6 py-4 border-t border-neutral-800 bg-[#0D1322] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-neutral-200 uppercase tracking-wider">
            AeroPark Facility
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-xs text-neutral-400">Terminal 2 Billboard Display</span>
        </div>

        {/* Live Pulsing Indicator + Updated Xs ago per §3.9 */}
        <div className="flex items-center gap-2.5 bg-neutral-900/90 px-4 py-1.5 rounded-pill border border-neutral-700/80 shadow-inner">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <span className="font-bold text-xs uppercase tracking-wider text-neutral-200">
            Live Sign
          </span>
          <span className="text-neutral-500">•</span>
          <span className="text-xs text-neutral-400 font-mono">
            Updated {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
          </span>
        </div>

        <div className="text-xs text-neutral-500 hidden sm:block">
          Auto-synced via Optical Edge Sensors
        </div>
      </footer>
    </div>
  );
};
